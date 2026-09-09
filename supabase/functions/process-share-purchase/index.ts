import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { ethers } from 'https://esm.sh/ethers@6.10.0';

// Configuración de Redes y Nodos RPC para Relayer en BSC
const RPC_NODES: Record<string, string> = {
  BEP20: Deno.env.get('BSC_MAINNET_RPC_URL') || 'https://bsc-dataseed.binance.org/',
  TESTNET: Deno.env.get('BSC_TESTNET_RPC_URL') || 'https://data-seed-prebsc-1-s1.binance.org:8545/'
};

// Dirección del Contrato HOLD3R_ERC1155 en BSC
const HOLD3R_ERC1155_ADDRESS = Deno.env.get('HOLD3R_ERC1155_ADDRESS') || '0x892a0134F4733077C06497B001F0b82C8987b59E';

// ABI Mínimo para purchaseShares en HOLD3R_ERC1155
const ERC1155_ABI = [
  "function purchaseShares(uint256 tokenId, uint256 shareCount) external returns (bool)",
  "function registerAsset(uint256 tokenId, string title, uint256 pricePerShareUsdt, uint256 maxShares) external",
  "function assets(uint256 tokenId) external view returns (uint256 tokenId, string title, uint256 pricePerShareUsdt, uint256 maxShares, uint256 soldShares, bool isActive)"
];

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, assetId, amountUsdt, shareCount = 1, network = 'BEP20' } = await req.json();

    if (!userId || !assetId || !amountUsdt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parámetros requeridos faltantes (userId, assetId, amountUsdt).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const numericAmount = Number(amountUsdt);
    if (numericAmount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'El monto de inversión debe ser mayor a 0 USDT.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 1. INICIALIZAR SUPABASE CLIENT CON SERVICE ROLE ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── 2. VERIFICAR SALDO INTERNO Y PERFIL DEL USUARIO ──
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontró la billetera del usuario en el sistema.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentBalance = Number(wallet.balance || 0);
    if (currentBalance < numericAmount) {
      return new Response(
        JSON.stringify({ success: false, error: `Saldo interno insuficiente ($${currentBalance} USDT disponible).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener información del activo
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontró el activo especificado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. EJECUCIÓN EN BLOCKCHAIN BSC VÍA RELAYER (HOT WALLET) ──
    const netKey = (network as string).toUpperCase() === 'TESTNET' ? 'TESTNET' : 'BEP20';
    const rpcUrl = RPC_NODES[netKey];
    const relayerPrivateKey = Deno.env.get('HOT_WALLET_PRIVATE_KEY') || Deno.env.get('RELAYER_PRIVATE_KEY');

    if (!relayerPrivateKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'HOT_WALLET_PRIVATE_KEY no está configurada en los Secrets de la Supabase Edge Function. Configura el Secret en la terminal con "supabase secrets set HOT_WALLET_PRIVATE_KEY=...".'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const relayerWallet = new ethers.Wallet(relayerPrivateKey, provider);
    const contract = new ethers.Contract(HOLD3R_ERC1155_ADDRESS, ERC1155_ABI, relayerWallet);

    // Determinar Token ID numérico del activo
    const tokenId = asset.tokenId || asset.token_id || 1;
    const count = Number(shareCount) || 1;

    // Enviar transacción relayer a la BSC
    let tx;
    try {
      tx = await contract.purchaseShares(tokenId, count);
    } catch (txErr: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error al enviar la transacción relayer a BSC: ${txErr.message || txErr}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const receipt = await tx.wait(1);

    if (!receipt || (receipt.status !== 1 && receipt.status !== '0x1')) {
      return new Response(
        JSON.stringify({ success: false, error: 'La transacción relayer fue revertida en la blockchain BSC.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const realTxHash = receipt.hash;

    if (!realTxHash || !realTxHash.startsWith('0x')) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se obtuvo un Hash de transacción válido devuelto por el nodo BSC.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. DEDUCCIÓN ATÓMICA DE CRÉDITO Y REGISTRO EN SUPABASE ──
    const newBalance = currentBalance - numericAmount;

    // A. Actualizar wallet del usuario
    const { error: updateWalletErr } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateWalletErr) {
      throw new Error(`Error al descontar saldo: ${updateWalletErr.message}`);
    }

    // B. Calcular porcentaje de participación
    const valuation = Number(asset.total_valuation || 1);
    const sharesPercentage = (numericAmount / valuation) * 100;

    // C. Registrar compra en asset_shares con txHash REAL de BscScan
    const sharePayload = {
      asset_id: assetId,
      user_id: userId,
      shares_percentage: sharesPercentage,
      amount_invested_usdt: numericAmount,
      signed_contract_hash: realTxHash,
      purchased_at: new Date().toISOString()
    };

    const { data: shareRecord, error: shareErr } = await supabaseAdmin
      .from('asset_shares')
      .insert(sharePayload)
      .select(`*, asset:assets(*)`)
      .single();

    if (shareErr) {
      // Revertir deducción de saldo en caso de falla de base de datos
      await supabaseAdmin.from('wallets').update({ balance: currentBalance }).eq('id', wallet.id);
      throw new Error(`Error al registrar participaciones en BD: ${shareErr.message}`);
    }

    // D. Actualizar monto fondeado del activo
    const newFundedAmount = Number(asset.funded_amount || 0) + numericAmount;
    const newStatus = newFundedAmount >= valuation ? 'active_rent' : asset.status;

    await supabaseAdmin
      .from('assets')
      .update({ funded_amount: newFundedAmount, status: newStatus })
      .eq('id', assetId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compra procesada exitosamente en BSC vía Hot Wallet Relayer.',
        txHash: realTxHash,
        newBalance: newBalance,
        shareRecord: shareRecord
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Error interno en la Edge Function Relayer.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
