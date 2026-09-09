import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { ethers } from "https://esm.sh/ethers@5.7.2";

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

// Headers CORS para soporte web y móvil
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. PARSING FLEXIBLE DEL PAYLOAD POST ──
    let body: any = {};
    try {
      body = await req.json();
    } catch (pErr) {
      console.error('Error al parsear el cuerpo JSON de la petición:', pErr);
      return new Response(
        JSON.stringify({ success: false, error: 'El cuerpo de la petición debe ser un objeto JSON válido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = body.userId || body.user_id || body.user?.id;
    const assetId = body.assetId || body.asset_id || body.asset?.id;
    const rawAmount = body.amountUsdt ?? body.amount_usdt ?? body.investmentUsdt ?? body.investment_usdt;
    const shareCount = body.shareCount || body.share_count || body.sharesCount || body.shares || 1;
    const network = body.network || body.network_key || 'BEP20';
    const customTokenId = body.tokenId || body.token_id;

    console.log('Procesando solicitud de compra de fracciones via Relayer:', { userId, assetId, rawAmount, shareCount, network });

    if (!userId || !assetId || rawAmount === undefined || rawAmount === null) {
      const missing = [];
      if (!userId) missing.push('userId');
      if (!assetId) missing.push('assetId');
      if (rawAmount === undefined || rawAmount === null) missing.push('amountUsdt');
      console.error('Petición rechazada (Bad Request 400). Faltan campos requeridos:', missing.join(', '));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Parámetros requeridos faltantes: ${missing.join(', ')}.`,
          receivedBody: body 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const numericAmount = Number(rawAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.error('Monto inválido recibido:', rawAmount);
      return new Response(
        JSON.stringify({ success: false, error: 'El monto de inversión debe ser un número válido mayor a 0 USDT.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. INICIALIZAR CLIENTE DE SUPABASE CON SERVICE ROLE ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── 3. VERIFICAR SALDO INTERNO DE LA WALLET Y DATOS DEL ACTIVO ──
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      console.error('Billetera de usuario no encontrada:', walletError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontró la billetera del usuario registrada en el sistema.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentBalance = Number(wallet.balance || 0);
    if (currentBalance < numericAmount) {
      console.error(`Saldo insuficiente: tiene $${currentBalance} USDT, requiere $${numericAmount} USDT.`);
      return new Response(
        JSON.stringify({ success: false, error: `Saldo interno insuficiente ($${currentBalance.toFixed(2)} USDT disponible).` }),
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
      console.error('Activo no encontrado en Supabase:', assetError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontró el activo especificado en la base de datos.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. EJECUCIÓN EN BLOCKCHAIN BSC VÍA RELAYER (HOT WALLET - ETHERS V5) ──
    const netKey = String(network).toUpperCase() === 'TESTNET' ? 'TESTNET' : 'BEP20';
    const rpcUrl = RPC_NODES[netKey];
    const relayerPrivateKey = Deno.env.get('HOT_WALLET_PRIVATE_KEY') || Deno.env.get('RELAYER_PRIVATE_KEY');

    if (!relayerPrivateKey) {
      console.error('ERROR CRÍTICO: HOT_WALLET_PRIVATE_KEY no está configurada en los Secrets del servidor.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'HOT_WALLET_PRIVATE_KEY no está configurada en los Secrets del servidor Supabase. Configura el Secret en la terminal con "supabase secrets set HOT_WALLET_PRIVATE_KEY=...".'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar proveedor y monedero relayer con Ethers v5
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const relayerWallet = new ethers.Wallet(relayerPrivateKey, provider);
    const contract = new ethers.Contract(HOLD3R_ERC1155_ADDRESS, ERC1155_ABI, relayerWallet);

    // Determinar Token ID numérico del activo RWA
    const tokenId = customTokenId || asset.tokenId || asset.token_id || 1;
    const count = Number(shareCount) || 1;

    console.log(`Enviando transacción relayer a BSC. Contrato: ${HOLD3R_ERC1155_ADDRESS}, TokenId: ${tokenId}, Shares: ${count}, Relayer: ${relayerWallet.address}`);

    // Enviar transacción relayer a la BSC
    let tx;
    try {
      tx = await contract.purchaseShares(tokenId, count);
      console.log('Transacción relayer enviada a BSC. TxID pendiente:', tx.hash);
    } catch (txErr: any) {
      console.error('Error al invocar purchaseShares en la BSC:', txErr);
      const revertReason = txErr.reason || txErr.message || String(txErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Falla en el contrato inteligente BSC: ${revertReason}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const receipt = await tx.wait(1);

    if (!receipt || (receipt.status !== 1 && receipt.status !== '0x1')) {
      console.error('La transacción fue revertida en el bloque de BSC:', receipt);
      return new Response(
        JSON.stringify({ success: false, error: 'La transacción relayer fue revertida en la blockchain BSC.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const realTxHash = receipt.transactionHash || receipt.hash;
    console.log('Transacción relayer minada con éxito en BSC. Hash real:', realTxHash);

    if (!realTxHash || !realTxHash.startsWith('0x')) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se obtuvo un Hash de transacción válido devuelto por el nodo BSC.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. DEDUCCIÓN ATÓMICA DE CRÉDITO Y REGISTRO EN SUPABASE ──
    const newBalance = currentBalance - numericAmount;

    // A. Actualizar saldo en la wallet del usuario
    const { error: updateWalletErr } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateWalletErr) {
      console.error('Error al descontar saldo en wallets:', updateWalletErr.message);
      throw new Error(`Error al descontar saldo: ${updateWalletErr.message}`);
    }

    // B. Calcular porcentaje de participación
    const valuation = Number(asset.total_valuation || 1);
    const sharesPercentage = (numericAmount / valuation) * 100;

    // C. Registrar compra de fracciones en asset_shares con el TxHash REAL de BscScan
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
      console.error('Error al registrar asset_shares (revirtiendo saldo):', shareErr.message);
      // Revertir deducción de saldo en caso de falla de base de datos
      await supabaseAdmin.from('wallets').update({ balance: currentBalance }).eq('id', wallet.id);
      throw new Error(`Error al registrar participaciones en BD: ${shareErr.message}`);
    }

    // D. Actualizar monto fondeado y estado del activo
    const newFundedAmount = Number(asset.funded_amount || 0) + numericAmount;
    const newStatus = newFundedAmount >= valuation ? 'active_rent' : asset.status;

    await supabaseAdmin
      .from('assets')
      .update({ funded_amount: newFundedAmount, status: newStatus })
      .eq('id', assetId);

    console.log('Compra relayer finalizada exitosamente para el usuario:', userId);

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
    console.error('Excepción no controlada en la Edge Function Relayer:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Error interno en la Edge Function Relayer.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
