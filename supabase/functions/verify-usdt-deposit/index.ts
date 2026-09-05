import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuración de Tesorerías y Contratos Oficiales por Red
const TREASURY_ADDRESSES: Record<string, string> = {
  BEP20: '0x72D45C3d8147D3225C841C1f92D73D3F9A6A85a7',
  ERC20: '0x72D45C3d8147D3225C841C1f92D73D3F9A6A85a7'
};

const USDT_CONTRACTS: Record<string, string> = {
  BEP20: '0x55d398326f99059fF775485246999027B3197955', // BSC Mainnet USDT (18 decimals)
  ERC20: '0xdAC17F958D2ee523a2206206994597C13D831ec7'  // Ethereum Mainnet USDT (6 decimals)
};

const RPC_NODES: Record<string, string> = {
  BEP20: 'https://bsc-dataseed.binance.org/',
  ERC20: 'https://eth.llamarpc.com'
};

// ERC20 Transfer Event Signature Hash: Transfer(address,address,uint256)
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Headers CORS para solicitudes web
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, txHash, network, amountUsdt } = await req.json();

    if (!userId || !txHash || !network || !amountUsdt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parámetros requeridos faltantes (userId, txHash, network, amountUsdt).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const netKey = (network as string).toUpperCase();
    if (!['BEP20', 'ERC20'].includes(netKey)) {
      return new Response(
        JSON.stringify({ success: false, error: `La red ${network} debe ser verificada vía backend para EVM (BEP20 o ERC20).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expectedTreasury = TREASURY_ADDRESSES[netKey].toLowerCase();
    const expectedContract = USDT_CONTRACTS[netKey].toLowerCase();
    const rpcUrl = RPC_NODES[netKey];

    // ── 1. CONSULTA DIRECTA AL NODO RPC (eth_getTransactionReceipt) ──
    const receiptResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
    });

    const receiptResult = await receiptResponse.json();
    const receipt = receiptResult.result;

    if (!receipt) {
      return new Response(
        JSON.stringify({ success: false, error: 'La transacción no ha sido minada o no existe en la blockchain.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar si la transacción fue exitosa (status 0x1)
    if (receipt.status !== '0x1' && receipt.status !== 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'La transacción falló o fue revertida en la blockchain.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar si el contrato invocado coincide con el contrato oficial de USDT
    if (!receipt.to || receipt.to.toLowerCase() !== expectedContract) {
      return new Response(
        JSON.stringify({ success: false, error: `El contrato invocado (${receipt.to}) no coincide con el contrato oficial USDT (${expectedContract}).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. VERIFICACIÓN DEL EVENTO TRANSFER EN LOS LOGS ──
    const expectedTopicTo = '0x000000000000000000000000' + expectedTreasury.replace('0x', '');
    let transferLogFound = false;
    let transferredAmountUsdt = 0;

    const decimals = netKey === 'BEP20' ? 18 : 6;

    for (const log of (receipt.logs || [])) {
      if (
        log.address.toLowerCase() === expectedContract &&
        log.topics &&
        log.topics[0] === TRANSFER_EVENT_TOPIC &&
        log.topics[2] &&
        log.topics[2].toLowerCase() === expectedTopicTo.toLowerCase()
      ) {
        transferLogFound = true;
        const rawValueBigInt = BigInt(log.data || '0x0');
        transferredAmountUsdt = Number(rawValueBigInt) / Math.pow(10, decimals);
        break;
      }
    }

    if (!transferLogFound) {
      return new Response(
        JSON.stringify({ success: false, error: `No se encontró transferencia de USDT con destino a la Tesorería Oficial (${expectedTreasury}) en los registros del bloque.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. ACREDITACIÓN ATÓMICA EN SUPABASE VÍA STORED PROCEDURE ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('verify_and_credit_deposit', {
      p_user_id: userId,
      p_tx_hash: txHash,
      p_network: netKey,
      p_amount_usdt: Number(amountUsdt),
      p_treasury_address: expectedTreasury
    });

    if (rpcError) {
      return new Response(
        JSON.stringify({ success: false, error: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: rpcData.success,
        message: rpcData.message,
        newBalance: rpcData.new_balance,
        amountCredited: rpcData.amount_credited,
        txHash
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Error interno en la verificación del backend.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
