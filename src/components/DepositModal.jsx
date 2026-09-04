import React, { useState, useEffect } from 'react';
import { 
  Wallet, RefreshCw, Check, Copy, ExternalLink, HelpCircle, 
  Info, AlertTriangle, ShieldCheck, ArrowRight, Globe
} from 'lucide-react';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';
import { 
  sendUsdtWeb3Transfer, verifyBlockchainTxHash, 
  switchWeb3Network, getTreasuryAddress, 
  validateTxHashForNetwork, validateAddressForNetwork 
} from '../services/web3';

const NETWORKS = [
  { id: 'BEP20', label: 'BEP20 · BNB Chain', type: 'EVM', chainId: 56, nativeSymbol: 'BNB', color: 'emerald' },
  { id: 'ERC20', label: 'ERC20 · Ethereum', type: 'EVM', chainId: 1, nativeSymbol: 'ETH', color: 'cyan' },
  { id: 'TRC20', label: 'TRC20 · Tron', type: 'TRON', nativeSymbol: 'TRX', color: 'rose' },
  { id: 'SOLANA', label: 'SOL · Solana', type: 'SOLANA', nativeSymbol: 'SOL', color: 'purple' },
];

export default function DepositModal({ 
  isOpen, onClose, onDepositUsdt, 
  web3Wallet, onOpenWeb3Modal 
}) {
  const [depositMode, setDepositMode] = useState('direct'); // 'direct' | 'txid'
  const [depositAmount, setDepositAmount] = useState('500');
  const [selectedNetwork, setSelectedNetwork] = useState('BEP20');
  const [inputTxHash, setInputTxHash] = useState('');
  const [verifyingTx, setVerifyingTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(null);
  const [depositError, setDepositError] = useState('');
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [copied, setCopied] = useState(false);

  // Integración en tiempo real con WalletConnect / Ethers Web3Modal
  const { address: wcAddress, chainId: wcChainId, isConnected: wcIsConnected } = useWeb3ModalAccount();

  const activeWalletAddress = (wcIsConnected && wcAddress) ? wcAddress : (web3Wallet?.address || null);
  const activeChainId = (wcIsConnected && wcChainId) ? wcChainId : (web3Wallet?.chainId || null);
  
  const currentNetworkConfig = NETWORKS.find(n => n.id === selectedNetwork) || NETWORKS[0];
  const currentTreasury = getTreasuryAddress(selectedNetwork);

  // Limpiar errores o estados al alternar red o abrir modal
  useEffect(() => {
    setDepositError('');
    setTxSuccess(null);
  }, [selectedNetwork, isOpen]);

  if (!isOpen) return null;

  const handleCopyTreasury = () => {
    if (currentTreasury) {
      navigator.clipboard.writeText(currentTreasury);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwitchNetwork = async (targetNet = selectedNetwork) => {
    setSwitchingNetwork(true);
    setDepositError('');
    try {
      const result = await switchWeb3Network(targetNet);
      if (result.isNonEVM) {
        setDepositError(`La red ${targetNet} es de arquitectura No-EVM. Realiza la transferencia desde tu wallet nativa.`);
      }
    } catch (err) {
      console.error('Error al solicitar cambio de red:', err);
      setDepositError(err.message || 'Fallo al solicitar cambio de red a la billetera.');
    } finally {
      setSwitchingNetwork(false);
    }
  };

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    setDepositError('');
    setVerifyingTx(true);

    try {
      const amountNum = Number(depositAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Ingresa un monto válido mayor a $0 USDT.');
      }

      if (depositMode === 'direct') {
        // En redes No-EVM se requiere envío directo + confirmación TxID
        if (currentNetworkConfig.type !== 'EVM') {
          setDepositMode('txid');
          throw new Error(`Para la red nativa ${selectedNetwork}, envía exactamente $${amountNum} USDT a la tesorería indicando el TxID en el campo inferior.`);
        }

        if (!activeWalletAddress) {
          if (onOpenWeb3Modal) onOpenWeb3Modal();
          throw new Error('Conecta tu Billetera Web3 para firmar la transferencia directa.');
        }

        // Transmisión directa EVM
        const txRes = await sendUsdtWeb3Transfer({ 
          amountUsdt: amountNum, 
          network: selectedNetwork 
        });
        setTxSuccess(txRes);
        if (onDepositUsdt) onDepositUsdt(amountNum);
      } else {
        // Validación del TxID por formato de red
        if (!inputTxHash || !validateTxHashForNetwork(inputTxHash, selectedNetwork)) {
          let reqFormat = '64 caracteres hexadecimales (0x...)';
          if (selectedNetwork === 'TRC20') reqFormat = '64 caracteres hexadecimales de Tron';
          else if (selectedNetwork === 'SOLANA') reqFormat = 'Firma Base58 de Solana (64-90 caracteres)';
          
          throw new Error(`TxID con formato inválido para la red ${selectedNetwork}. Formato requerido: ${reqFormat}`);
        }

        const verified = await verifyBlockchainTxHash(inputTxHash, selectedNetwork);
        setTxSuccess(verified);
        if (onDepositUsdt) onDepositUsdt(amountNum);
      }
    } catch (err) {
      setDepositError(err.message || 'Error al procesar la transferencia.');
    } finally {
      setVerifyingTx(false);
    }
  };

  const isChainMismatch = currentNetworkConfig.type === 'EVM' 
    && activeWalletAddress 
    && activeChainId 
    && activeChainId !== currentNetworkConfig.chainId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="glass-panel w-full max-w-lg p-6 sm:p-7 border border-emerald-500/30 shadow-2xl relative my-auto">
        
        {/* Glow Background Accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => { onClose(); setTxSuccess(null); setDepositError(''); }}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white text-xl font-bold p-1 rounded-lg transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Pasarela de Pagos USDT</h3>
            <p className="text-xs text-neutral-400">
              Acredita tu saldo transaccionando directamente con la Tesorería HOLD3R.
            </p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="grid grid-cols-3 gap-2 my-4 text-center text-[11px]">
          {['1. Seleccionar Red', '2. Indicar Monto', '3. Transmitir / TxID'].map((step, i) => {
            const isDone = (i === 0 && selectedNetwork)
                        || (i === 1 && Number(depositAmount) > 0)
                        || (i === 2 && !!txSuccess);
            return (
              <div 
                key={i} 
                className={`py-2 px-1 rounded-xl transition-all ${
                  isDone 
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold' 
                    : 'bg-neutral-900/60 border border-white/5 text-neutral-500'
                }`}
              >
                {step}
              </div>
            );
          })}
        </div>

        {/* Network Selector Tabs */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-neutral-300 mb-2">
            Red Blockchain de Depósito:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {NETWORKS.map(({ id, label, type }) => {
              const isSelected = selectedNetwork === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedNetwork(id)}
                  className={`py-2.5 px-2 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-lg scale-[1.02]'
                      : 'bg-neutral-900/90 border-white/10 text-neutral-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-[9px] font-mono opacity-70">
                    {type === 'EVM' ? 'Web3 / EVM' : type === 'TRON' ? 'Native Tron' : 'Native SOL'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Network Mismatch Warning Banner (EVM) */}
        {isChainMismatch && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Red no coincide con {currentNetworkConfig.label} (Chain ID {currentNetworkConfig.chainId}).</span>
            </div>
            <button 
              type="button" 
              onClick={() => handleSwitchNetwork(selectedNetwork)} 
              disabled={switchingNetwork} 
              className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${switchingNetwork ? 'animate-spin' : ''}`} />
              {switchingNetwork ? 'Cambiando...' : 'Cambiar Red'}
            </button>
          </div>
        )}

        {/* Non-EVM Information Banner (TRC20 / Solana) */}
        {currentNetworkConfig.type !== 'EVM' && (
          <div className="p-3.5 rounded-2xl mb-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-cyan-300">
              <Info className="w-4 h-4 shrink-0" />
              <span>Red Independiente No-EVM ({selectedNetwork})</span>
            </div>
            <p className="text-[11px] text-neutral-300">
              Transfiere USDT desde tu wallet nativa de {selectedNetwork === 'TRC20' ? 'Tron (TronLink/Exodus)' : 'Solana (Phantom/Solflare)'} a la tesorería indicada abajo e ingresa el TxID para verificación instantánea.
            </p>
          </div>
        )}

        {/* Direct vs TxID Mode Switcher */}
        <div className="flex bg-neutral-900 border border-white/10 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setDepositMode('direct')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              depositMode === 'direct'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            ⚡ Transmisión Directa Web3
          </button>
          <button
            type="button"
            onClick={() => setDepositMode('txid')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              depositMode === 'txid'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            🔍 Verificar con TxID
          </button>
        </div>

        {/* Error Notification */}
        {depositError && (
          <div className="text-xs p-3 rounded-xl mb-4 font-medium bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{depositError}</span>
          </div>
        )}

        {/* Success Banner */}
        {txSuccess && (
          <div className="p-4 rounded-2xl space-y-2 mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
              <Check className="w-5 h-5" /> Depósito Confirmado Exitosamente
            </div>
            <p className="text-[11px] font-mono break-all p-2.5 bg-black/40 rounded-xl text-neutral-300 border border-white/10">
              TxID: <span className="text-white font-bold">{txSuccess.txHash}</span>
            </p>
            {txSuccess.explorerUrl && (
              <a 
                href={txSuccess.explorerUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline"
              >
                Ver en Explorador Blockchain ({selectedNetwork}) <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleSubmitDeposit} className="space-y-4">
          
          {/* Direct Mode Origin & Treasury Display */}
          {depositMode === 'direct' ? (
            <>
              {/* Origin Wallet Display */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Billetera de Origen ({selectedNetwork}):
                </label>
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-white/10 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-white truncate">
                      {currentNetworkConfig.type === 'EVM'
                        ? (activeWalletAddress 
                            ? `${activeWalletAddress.substring(0, 8)}...${activeWalletAddress.substring(activeWalletAddress.length - 6)}` 
                            : 'Sin billetera EVM conectada')
                        : `Transferencia Manual Nátiva (${selectedNetwork})`}
                    </span>
                  </div>
                  {currentNetworkConfig.type === 'EVM' && (
                    <button 
                      type="button" 
                      onClick={onOpenWeb3Modal} 
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all shrink-0 ml-2"
                    >
                      {activeWalletAddress ? 'Cambiar' : 'Conectar'}
                    </button>
                  )}
                </div>
              </div>

              {/* Native Treasury Address Display */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Tesorería HOLD3R ({selectedNetwork}):
                  </label>
                  <button 
                    type="button" 
                    onClick={handleCopyTreasury} 
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 break-all select-all shadow-inner">
                  {currentTreasury}
                </div>
              </div>
            </>
          ) : (
            /* TxID Mode Input */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Hash de Transacción / TxID ({selectedNetwork}):
                </label>
                <button 
                  type="button" 
                  onClick={handleCopyTreasury} 
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiar Tesorería' : 'Copiar Tesorería'}
                </button>
              </div>

              {/* Destination Treasury Preview */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] font-mono text-neutral-400 mb-2 truncate">
                Destino: <strong className="text-emerald-400">{currentTreasury}</strong>
              </div>

              <input 
                type="text" 
                required 
                value={inputTxHash} 
                onChange={e => setInputTxHash(e.target.value)} 
                placeholder={
                  selectedNetwork === 'TRC20'
                    ? 'Ej. 8f3c7b2a... (64 caracteres Hex Tron)'
                    : selectedNetwork === 'SOLANA'
                    ? 'Ej. 5Kx2L9... (Firma Base58 Solana)'
                    : 'Ej. 0x9a8f4c21... (Hash EVM)'
                } 
                className="w-full p-3 bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white text-xs rounded-xl font-mono outline-none" 
              />
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Monto a Depositar (USDT):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-emerald-400 font-mono font-bold text-lg">$</span>
              <input 
                type="number" 
                min="10" 
                step="10" 
                required 
                value={depositAmount} 
                onChange={e => setDepositAmount(e.target.value)} 
                placeholder="500" 
                className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white font-mono font-extrabold text-lg rounded-xl py-2.5 pl-9 pr-16 outline-none" 
              />
              <span className="absolute right-3.5 top-3 text-xs font-mono font-bold text-neutral-400">
                USDT
              </span>
            </div>
          </div>

          {/* Educational Quick Guide */}
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/10 text-[11px] space-y-1 text-neutral-400">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
              <HelpCircle className="w-3.5 h-3.5" /> Guía de Red {selectedNetwork}
            </div>
            <p>• <strong className="text-white">Formato Tesorería:</strong> {currentTreasury}</p>
            <p>• <strong className="text-white">Confirmación:</strong> El crédito se activa automáticamente tras verificar las confirmaciones de bloque en la red {selectedNetwork}.</p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => { onClose(); setTxSuccess(null); setDepositError(''); }} 
              className="btn-secondary text-xs py-2.5 px-4"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={verifyingTx} 
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2"
            >
              {verifyingTx ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Procesando...
                </>
              ) : depositMode === 'direct' && currentNetworkConfig.type === 'EVM' ? (
                <>
                  Transmitir Transacción <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Confirmar Depósito <Check className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
