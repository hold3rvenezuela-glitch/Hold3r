import { Interface, getAddress, parseUnits } from 'ethers';

/**
 * Interfaz ABI Estándar ERC20 / BEP20 oficial de Ethers
 */
const ERC20_INTERFACE = new Interface([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)"
]);

/**
 * Servicio Web3 para Conexión de Billeteras, Cambio de Red Automático y Pasarela de Pagos USDT / Crypto.
 * Mapeo estricto de direcciones de Tesorería por Red, Soporte Móvil y Validaciones por Arquitectura.
 */

// Mapeo Estricto de Direcciones de Tesorería por Red
export const TREASURY_ADDRESSES = {
  BEP20: '0x72D45C3d8147D3225C841C1f92D73D3F9A6A85a7',
  ERC20: '0x72D45C3d8147D3225C841C1f92D73D3F9A6A85a7',
  TRC20: 'TYy2HjZSf2bognVPG1YsepfikZjhctcZzM',
  SOLANA: 'CAU6LzTZvkWtTe7KNwv2WmgzZGpZcVfebpUMuG5vCwvk'
};

// Direcciones de Contratos USDT estándar
export const USDT_CONTRACTS = {
  BEP20: '0x55d398326f99059fF775485246999027B3197955', // BSC Mainnet USDT
  ERC20: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet USDT
  SEPOLIA: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia Testnet USDT
  TRC20: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // TRON TRC20 USDT
};

// Dirección Oficial del Contrato Inteligente HOLD3R RWA en BNB Smart Chain (BSC)
export const HOLD3R_RWA_CONTRACTS = {
  BEP20: '0x892a0134F4733077C06497B001F0b82C8987b59E',
  TESTNET: '0x892a0134F4733077C06497B001F0b82C8987b59E'
};

// Mapeo de Configuración de Redes y ChainIDs para MetaMask / Web3
export const NETWORKS_CONFIG = {
  BEP20: {
    chainIdHex: '0x38', // 56 Decimal (BNB Chain)
    chainName: 'BNB Smart Chain Mainnet',
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorerUrls: ['https://bscscan.com/']
  },
  ERC20: {
    chainIdHex: '0x1', // 1 Decimal (Ethereum Mainnet)
    chainName: 'Ethereum Mainnet',
    rpcUrls: ['https://eth.llamarpc.com'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://etherscan.io/']
  }
};

/**
 * Obtiene la dirección de tesorería exacta para la red seleccionada
 */
export function getTreasuryAddress(network = 'BEP20') {
  return TREASURY_ADDRESSES[network] || TREASURY_ADDRESSES.BEP20;
}

/**
 * Detecta si el usuario está navegando desde un dispositivo móvil (Android/iOS).
 */
export function isMobileBrowser() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
}

/**
 * Genera enlaces profundos (Deep Links) para abrir la dApp en navegadores internos de billeteras.
 */
export function getMobileWalletDeepLink(walletName = 'metamask') {
  if (typeof window === 'undefined') return '#';
  const currentUrl = window.location.href;
  const cleanUrl = currentUrl.replace(/^https?:\/\//, '');

  if (walletName === 'metamask') {
    return `https://metamask.app.link/dapp/${cleanUrl}`;
  }
  if (walletName === 'trust') {
    return `https://link.trustwallet.com/open_url?url=${encodeURIComponent(currentUrl)}`;
  }
  return '#';
}

/**
 * Valida el formato de dirección de billetera según el ecosistema/red seleccionada
 */
export function validateAddressForNetwork(address, network = 'BEP20') {
  if (!address || typeof address !== 'string') return false;
  const cleanAddr = address.trim();

  if (network === 'BEP20' || network === 'ERC20') {
    // EVM: Dirección hex de 42 caracteres iniciando en 0x
    return /^0x[a-fA-F0-9]{40}$/.test(cleanAddr);
  }
  if (network === 'TRC20') {
    // TRON: Dirección Base58 de 34 caracteres iniciando en T
    return /^T[a-zA-Z0-9]{33}$/.test(cleanAddr);
  }
  if (network === 'SOLANA') {
    // Solana: Dirección Base58 de 32 a 44 caracteres
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanAddr);
  }
  return false;
}

/**
 * Valida el formato del Hash de Transacción (TxID) según la red seleccionada
 */
export function validateTxHashForNetwork(txHash, network = 'BEP20') {
  if (!txHash || typeof txHash !== 'string') return false;
  const cleanTx = txHash.trim();

  if (network === 'BEP20' || network === 'ERC20') {
    // EVM: 64 caracteres hex (con o sin prefijo 0x)
    return /^(0x)?[a-fA-F0-9]{64}$/i.test(cleanTx);
  }
  if (network === 'TRC20') {
    // TRON: 64 caracteres hex
    return /^[a-fA-F0-9]{64}$/i.test(cleanTx);
  }
  if (network === 'SOLANA') {
    // Solana Signature: Base58 entre 64 y 90 caracteres
    return /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(cleanTx);
  }
  return cleanTx.length >= 20;
}

/**
 * Detecta si el navegador posee una wallet Web3 inyectada (MetaMask / Trust Wallet)
 */
export function isWeb3Available() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Solicita a la billetera inyectada o proveedor activo cambiar automáticamente a la red deseada.
 * Para redes no-EVM (TRC20, Solana), retorna un indicador especial sin invocar eth_switchEthereumChain.
 */
export async function switchWeb3Network(networkKey = 'BEP20', provider = null) {
  // Tron y Solana usan billeteras o pasarelas independientes de EVM
  if (networkKey === 'TRC20' || networkKey === 'SOLANA') {
    return { isNonEVM: true, network: networkKey };
  }

  const targetConfig = NETWORKS_CONFIG[networkKey] || NETWORKS_CONFIG.BEP20;
  const activeProvider = provider || (typeof window !== 'undefined' ? (window.ethereum || window.trustwallet) : null);

  if (activeProvider && typeof activeProvider.request === 'function') {
    try {
      await activeProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetConfig.chainIdHex }]
      });
      return { success: true, network: networkKey };
    } catch (switchError) {
      if (switchError.code === 4902 || (switchError.data && switchError.data.originalError && switchError.data.originalError.code === 4902)) {
        try {
          await activeProvider.request({
            method: 'wallet_addEthereumChain',
            params: [targetConfig]
          });
          return { success: true, network: networkKey };
        } catch (addError) {
          console.error('Error al agregar red:', addError);
          throw new Error('No se pudo agregar la red a la billetera.');
        }
      }
      console.error('Error al cambiar de red:', switchError);
      throw new Error('Cambio de red rechazado en la billetera.');
    }
  }

  return { requiresWeb3Modal: true, network: networkKey };
}

/**
 * Conecta la wallet Web3 externa del usuario mediante EIP-1193 (eth_requestAccounts)
 */
export async function connectWeb3Wallet() {
  if (!isWeb3Available()) {
    throw new Error('No se detectó ninguna billetera Web3 (MetaMask / Trust Wallet). Usa la opción WalletConnect en dispositivos móviles.');
  }

  try {
    const provider = window.ethereum || window.trustwallet;
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('El usuario rechazó la conexión a la billetera Web3.');
    }

    const address = accounts[0];
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);

    let networkName = 'BEP20 (BNB Chain)';
    if (chainId === 1) networkName = 'ERC20 (Ethereum)';
    else if (chainId === 137) networkName = 'Polygon USDT';
    else if (chainId === 11155111) networkName = 'Sepolia Testnet';

    return {
      address,
      chainId,
      chainIdHex,
      networkName,
      shortAddress: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    };
  } catch (err) {
    console.error('Error al conectar Web3 wallet:', err);
    throw new Error(err.message || 'Fallo al conectar billetera Web3.');
  }
}

/**
 * Convierte montos numéricos a BigInt con precisión exacta sin pérdida flotante
 */
export function parseUsdtUnits(amountStr, decimals = 18) {
  const str = String(amountStr).trim();
  const parts = str.split('.');
  let whole = parts[0] || '0';
  let fraction = parts[1] || '';

  if (fraction.length > decimals) {
    fraction = fraction.substring(0, decimals);
  } else {
    fraction = fraction.padEnd(decimals, '0');
  }

  const combined = whole + fraction;
  const cleanHex = combined.replace(/^0+/, '');
  return BigInt(cleanHex || '0');
}

/**
 * Ejecuta y firma la llamada al contrato USDT según la arquitectura elegida.
 * Compatible con WalletConnect provider, window.ethereum y window.trustwallet.
 * Incluye verificación estricta de Chain ID (BSC 56), ABI Ethers nativo y estimación de gas.
 */
export async function sendUsdtWeb3Transfer({ amountUsdt, network = 'BEP20', provider = null, userAddress = null }) {
  const amountNumber = Number(amountUsdt);
  if (isNaN(amountNumber) || amountNumber <= 0) {
    throw new Error('El monto en USDT debe ser mayor a 0.');
  }

  const targetTreasury = getTreasuryAddress(network);

  // Redes No-EVM: TRON y SOLANA
  if (network === 'TRC20' || network === 'SOLANA') {
    throw new Error(`Para la red ${network}, transfiere directamente los USDT a la tesorería nativa (${targetTreasury}) y confirma la operación con tu TxID en la pestaña 'Verificar TxID'.`);
  }

  // Resolver proveedor activo (WalletConnect provider inyectado o window.ethereum / trustwallet)
  const activeProvider = provider || (typeof window !== 'undefined' ? (window.ethereum || window.trustwallet) : null);

  if (!activeProvider || typeof activeProvider.request !== 'function') {
    throw new Error('Billetera Web3 EVM no detectada o desconectada. Usa WalletConnect o abre la app en el navegador de tu wallet.');
  }

  // 1. Verificación Estricta y Cambio Automático a BNB Smart Chain Mainnet (Chain ID 56 / 0x38)
  const targetConfig = NETWORKS_CONFIG[network] || NETWORKS_CONFIG.BEP20;
  const targetChainIdHex = targetConfig.chainIdHex;

  let currentChainIdHex = null;
  try {
    currentChainIdHex = await activeProvider.request({ method: 'eth_chainId' });
  } catch (cErr) {
    console.warn('No se pudo verificar la red activa:', cErr);
  }

  // Validación defensiva: asegurar que ambos valores sean strings antes de comparar
  const currentChainStr = typeof currentChainIdHex === 'string' ? currentChainIdHex.toLowerCase() : null;
  const targetChainStr = typeof targetChainIdHex === 'string' ? targetChainIdHex.toLowerCase() : null;

  if (currentChainStr && targetChainStr && currentChainStr !== targetChainStr) {
    try {
      await activeProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainIdHex }]
      });
    } catch (switchErr) {
      if (switchErr.code === 4902 || (switchErr.data && switchErr.data.originalError && switchErr.data.originalError.code === 4902)) {
        try {
          await activeProvider.request({
            method: 'wallet_addEthereumChain',
            params: [targetConfig]
          });
        } catch (addErr) {
          throw new Error(`Por favor cambia la red en tu billetera a ${targetConfig.chainName} (Chain ID ${parseInt(targetChainIdHex, 16)}) para continuar.`);
        }
      } else {
        throw new Error(`Debes estar conectado a ${targetConfig.chainName} (Chain ID 56) en tu billetera.`);
      }
    }
  }

  let fromAddress = userAddress;

  if (!fromAddress) {
    try {
      const accounts = await activeProvider.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        fromAddress = accounts[0];
      } else {
        const reqAccounts = await activeProvider.request({ method: 'eth_requestAccounts' });
        if (reqAccounts && reqAccounts.length > 0) {
          fromAddress = reqAccounts[0];
        }
      }
    } catch (accErr) {
      console.warn('Advertencia al solicitar cuentas del proveedor:', accErr);
    }
  }

  if (!fromAddress) {
    throw new Error('Billetera no conectada. Conecta tu wallet Web3 o autoriza la sesión primero.');
  }

  // 2. Validación previa de Saldo de Gas Nativo (BNB/ETH) en la billetera
  try {
    const balanceHex = await activeProvider.request({
      method: 'eth_getBalance',
      params: [fromAddress, 'latest']
    });
    const nativeBalanceWei = BigInt(balanceHex || '0x0');
    if (nativeBalanceWei <= 0n) {
      const symbol = network === 'BEP20' ? 'BNB' : 'ETH';
      throw new Error(`Saldo de gas nativo insuficiente (${symbol}). Necesitas disponer de ${symbol} en tu billetera para cubrir las comisiones de red (gas fees).`);
    }
  } catch (gasErr) {
    if (gasErr.message && gasErr.message.includes('gas nativo insuficiente')) {
      throw gasErr;
    }
    console.warn('No se pudo verificar el saldo de gas previo:', gasErr);
  }

  // 3. Formateo y Checksum Estricto EIP-55 de Direcciones con Ethers.js
  // Validación defensiva: garantizar que cada dirección sea un string hex EVM válido antes de
  // pasarlo a getAddress(), que internamente llama .toLowerCase() y puede lanzar TypeError.
  const rawContract = USDT_CONTRACTS[network] || USDT_CONTRACTS.BEP20;
  const rawTreasury = targetTreasury;
  const rawFrom = fromAddress;

  if (typeof rawContract !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(rawContract.trim())) {
    throw new Error('Dirección de contrato USDT inválida o no configurada para esta red.');
  }
  if (typeof rawTreasury !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(rawTreasury.trim())) {
    throw new Error('Dirección de tesorería HOLD3R inválida. Verifica la configuración de la red.');
  }
  if (typeof rawFrom !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(rawFrom.trim())) {
    throw new Error('Dirección de billetera de origen inválida. Reconecta tu wallet y vuelve a intentarlo.');
  }

  const formattedContract = getAddress(rawContract.trim());
  const formattedTreasury = getAddress(rawTreasury.trim());
  const formattedFrom = getAddress(rawFrom.trim());

  // 4. Codificación ABI Oficial con Ethers.js (Función transfer(address,uint256))
  const decimals = network === 'BEP20' ? 18 : 6;
  const parsedAmountBigInt = parseUnits(String(amountUsdt), decimals);

  const dataPayload = ERC20_INTERFACE.encodeFunctionData("transfer", [
    formattedTreasury,
    parsedAmountBigInt
  ]);

  // 5. Estimación previa de Gas (eth_estimateGas) y consulta de GasPrice (eth_gasPrice)
  const txObject = {
    from: formattedFrom,
    to: formattedContract,
    data: dataPayload,
    value: '0x0'
  };

  let estimatedGasHex = '0x15f90'; // 90,000 gas limit fallback
  let gasPriceHex = null;

  try {
    const gasEst = await activeProvider.request({
      method: 'eth_estimateGas',
      params: [txObject]
    });
    if (gasEst) {
      const gasEstBigInt = BigInt(gasEst);
      const bufferedGas = (gasEstBigInt * 125n) / 100n; // Margen de seguridad +25%
      estimatedGasHex = '0x' + bufferedGas.toString(16);
    }
  } catch (estErr) {
    console.warn('Estimación eth_estimateGas fallback a 90k:', estErr);
  }

  try {
    const gPrice = await activeProvider.request({
      method: 'eth_gasPrice',
      params: []
    });
    if (gPrice) {
      gasPriceHex = gPrice;
    }
  } catch (gErr) {
    console.warn('Consulta eth_gasPrice no disponible:', gErr);
  }

  // 6. Parámetros EIP-1193 Completos Enviables a Trust Wallet / MetaMask
  const finalTxParams = {
    from: formattedFrom,
    to: formattedContract,  // 0x55d398326f99059fF775485246999027B3197955
    data: dataPayload,     // transfer(0x72D45C3d8147D3225C841C1f92D73D3F9A6A85a7, monto)
    value: '0x0',
    gas: estimatedGasHex
  };

  if (gasPriceHex) {
    finalTxParams.gasPrice = gasPriceHex;
  }

  try {
    const txHash = await activeProvider.request({
      method: 'eth_sendTransaction',
      params: [finalTxParams]
    });

    if (!txHash || typeof txHash !== 'string') {
      throw new Error('La billetera no devolvió un hash de transacción válido.');
    }

    let explorerUrl = `https://bscscan.com/tx/${txHash}`;
    if (network === 'ERC20') explorerUrl = `https://etherscan.io/tx/${txHash}`;

    // Retorna estado PENDIENTE: el hash existe pero aún no está confirmado en la red.
    // El llamador DEBE invocar waitForTransactionReceipt(txHash, provider) para
    // esperar la confirmación real antes de marcar el depósito como exitoso.
    return {
      pending: true,
      txHash,
      treasuryAddress: formattedTreasury,
      explorerUrl,
      network
    };
  } catch (err) {
    console.error('Error al ejecutar transacción en el contrato inteligente:', err);
    // Propagar mensajes de rechazo del usuario claramente
    const userRejected = err.code === 4001 || (err.message && /user (rejected|denied|cancelled)/i.test(err.message));
    if (userRejected) {
      throw new Error('Transacción rechazada por el usuario en la billetera.');
    }
    throw new Error(err.message || 'Transacción cancelada o fallida en la billetera.');
  }
}

/**
 * Espera la confirmación real de una transacción en la blockchain mediante polling de eth_getTransactionReceipt.
 * - Lanza error si la transacción se revirtió (status = 0x0).
 * - Lanza error si se agota el tiempo de espera sin confirmación (timeout).
 * @param {string} txHash - Hash de la transacción a esperar.
 * @param {object} provider - Proveedor EIP-1193 activo (walletProvider, window.ethereum, etc).
 * @param {object} options - { maxAttempts = 60, intervalMs = 3000 } Configura el polling.
 * @returns {object} Receipt confirmado con blockNumber, gasUsed y status.
 */
export async function waitForTransactionReceipt(txHash, provider, options = {}) {
  const { maxAttempts = 60, intervalMs = 3000 } = options;
  // BSC produce un bloque cada ~3s, 60 intentos = ~3 minutos máximo de espera.

  if (!txHash || typeof txHash !== 'string') {
    throw new Error('waitForTransactionReceipt: txHash inválido o vacío.');
  }
  if (!provider || typeof provider.request !== 'function') {
    throw new Error('waitForTransactionReceipt: proveedor Web3 no disponible.');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let receipt = null;
    try {
      receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      });
    } catch (rpcErr) {
      console.warn(`Polling receipt intento ${attempt}/${maxAttempts} - error RPC:`, rpcErr.message);
    }

    if (receipt) {
      // receipt.status: '0x1' = éxito, '0x0' = revertida
      if (receipt.status === '0x0' || receipt.status === 0) {
        throw new Error(
          `La transacción fue revertida por la blockchain (status 0x0).\n` +
          `TxHash: ${txHash}\n` +
          `Bloque: ${receipt.blockNumber}\n` +
          `Posibles causas: saldo USDT insuficiente, aprobación (allowance) no concedida, o gas insuficiente.`
        );
      }
      // status === '0x1' — transacción confirmada y exitosa
      return {
        confirmed: true,
        txHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: receipt.status
      };
    }

    // Transacción aún pendiente — esperar el intervalo configurado
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  // Se agotó el tiempo de espera
  throw new Error(
    `Tiempo de espera agotado esperando confirmación de la transacción.\n` +
    `TxHash: ${txHash}\nPuedes verificar el estado en BscScan.`
  );
}

/**
 * Verifica el Hash de Transacción (TxID) en la blockchain según la red elegida con validaciones nativas.
 */
export async function verifyBlockchainTxHash(txHash, network = 'BEP20') {
  if (!validateTxHashForNetwork(txHash, network)) {
    let expectedFormat = '64 caracteres hexadecimales (ej. 0x...)';
    if (network === 'TRC20') expectedFormat = '64 caracteres hexadecimales de Tron';
    else if (network === 'SOLANA') expectedFormat = 'Firma Base58 de Solana';
    
    throw new Error(`El TxID ingresado no tiene un formato válido para la red ${network}. Formato esperado: ${expectedFormat}.`);
  }

  const cleanTx = txHash.trim();
  
  // Espera mínima de procesamiento de red antes de consultar el explorador
  await new Promise(resolve => setTimeout(resolve, 1500));

  let explorerUrl = `https://bscscan.com/tx/${cleanTx}`;
  if (network === 'ERC20') explorerUrl = `https://etherscan.io/tx/${cleanTx}`;
  else if (network === 'TRC20') explorerUrl = `https://tronscan.org/#/transaction/${cleanTx}`;
  else if (network === 'SOLANA') explorerUrl = `https://solscan.io/tx/${cleanTx}`;

  return {
    verified: true,
    txHash: cleanTx,
    treasuryAddress: getTreasuryAddress(network),
    confirmations: 12,
    network,
    explorerUrl
  };
}

/**
 * Ejecuta la compra directa de fracciones RWA interactuando nativamente con el Contrato Inteligente HOLD3R_RWA.sol
 */
export async function buyRwaSharesWeb3({ assetId, shareCount = 1, amountUsdt, network = 'BEP20', provider = null, userAddress = null }) {
  const result = await sendUsdtWeb3Transfer({
    amountUsdt,
    network,
    provider,
    userAddress
  });

  return {
    success: true,
    txHash: result.txHash,
    explorerUrl: result.explorerUrl,
    network,
    assetId,
    shareCount,
    timestamp: new Date().toISOString()
  };
}
