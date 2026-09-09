import React, { useState, useEffect } from 'react';
import { Globe, QrCode, ShieldAlert, Cpu, LogOut, Copy, Check, RefreshCw, Smartphone, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import { useWeb3Modal, useWeb3ModalAccount, useDisconnect } from '@web3modal/ethers/react';
import { connectWeb3Wallet, isWeb3Available, isMobileBrowser, getMobileWalletDeepLink } from '../services/web3';

export default function Web3WalletModal({ isOpen, onClose, onWalletConnected }) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [activeTab, setActiveTab] = useState('walletconnect'); // 'walletconnect' | 'injected'
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const { open } = useWeb3Modal();
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const { disconnect } = useDisconnect();

  const isMobile = isMobileBrowser();
  const hasInjected = isWeb3Available();

  // Escucha conexiones de WalletConnect en tiempo real
  useEffect(() => {
    if (isOpen && isConnected && address) {
      onWalletConnected?.({
        address,
        chainId: chainId || 56,
        networkName: chainId === 1 ? 'ERC20 (Ethereum)' : 'BEP20 (BNB Chain)',
        shortAddress: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
      });
    }
  }, [isOpen, isConnected, address, chainId]);

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (disconnect) {
        await disconnect();
      }
    } catch (e) {
      console.warn('Advertencia al desconectar:', e);
    }
    onWalletConnected?.(null);
  };

  const handleInjectedConnect = async () => {
    setConnecting(true);
    setErrorMsg('');
    try {
      if (!hasInjected) {
        throw new Error('No se detectó extensión Web3 en tu navegador actual. Si estás en móvil, utiliza la pestaña de WalletConnect o abre HOLD3R en el navegador interno de tu billetera.');
      }
      const conn = await connectWeb3Wallet();
      onWalletConnected?.(conn);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al conectar la billetera Web3.');
    } finally {
      setConnecting(false);
    }
  };

  const handleOpenWalletConnectModal = async () => {
    try {
      setErrorMsg('');
      await open();
    } catch (err) {
      console.error('Error abriendo WalletConnect:', err);
      setErrorMsg('No se pudo abrir la ventana de WalletConnect. Intenta nuevamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        className="w-full max-w-md p-5 sm:p-6 rounded-3xl border border-emerald-500/30 shadow-2xl relative max-h-[92vh] overflow-y-auto my-auto text-white space-y-4"
        style={{ background: 'linear-gradient(145deg, #0d1714 0%, #080c0b 100%)' }}
      >
        {/* Glow Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-neutral-900/80 border border-white/10 flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        {/* Header con estilo esmeralda identico a la Pasarela */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Gestión de Billetera Web3</h3>
            <p className="text-xs text-neutral-400">
              Conexión directa multi-cadena mediante WalletConnect y EVM.
            </p>
          </div>
        </div>

        {/* Billetera Conectada Activa */}
        {isConnected && address ? (
          <div className="bg-neutral-900/90 border border-emerald-500/40 p-4 rounded-2xl space-y-3 animate-fade-in shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Wallet Conectada
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                Chain ID: {chainId || 56}
              </span>
            </div>

            <div className="flex items-center justify-between bg-black/50 p-2.5 rounded-xl border border-white/10">
              <span className="font-mono text-xs font-bold text-neutral-200 truncate max-w-[200px]">
                {address}
              </span>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0 ml-2"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenWalletConnectModal}
                className="py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Cambiar / Red
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="py-2 px-3 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Desconectar
              </button>
            </div>
          </div>
        ) : null}

        {/* Conexión Principal Recomendada */}
        {!isConnected && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
            <p className="text-xs text-emerald-300 font-medium">
              Conecta tu billetera Web3 para firmar operaciones y depositar USDT directamente.
            </p>

            <div className="flex justify-center py-1">
              <w3m-button />
            </div>

            <button
              type="button"
              onClick={handleOpenWalletConnectModal}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
              style={{ background: '#00FF88' }}
            >
              <QrCode className="w-4 h-4" />
              Conectar con WalletConnect / QR
            </button>
          </div>
        )}

        {/* Banner para Móviles */}
        {isMobile && !hasInjected && (
          <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-white/10 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Navegador Móvil Detectado</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Abre HOLD3R directamente dentro del navegador interno de tu billetera:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={getMobileWalletDeepLink('metamask')}
                target="_blank"
                rel="noreferrer"
                className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 text-[11px] font-bold py-2 px-2 rounded-xl text-center flex items-center justify-center gap-1 transition-colors"
              >
                🦊 MetaMask App
              </a>
              <a
                href={getMobileWalletDeepLink('trust')}
                target="_blank"
                rel="noreferrer"
                className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold py-2 px-2 rounded-xl text-center flex items-center justify-center gap-1 transition-colors"
              >
                🛡️ Trust Wallet
              </a>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-xl font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── ACORDEÓN / MENÚ DESPLEGABLE: Opciones secundarias ── */}
        <div className="pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-white/5 text-xs font-bold text-neutral-400 hover:text-white hover:border-white/10 transition-all"
          >
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Más opciones de conexión
            </span>
            {showMoreOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMoreOptions && (
            <div className="mt-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 animate-fade-in">
              {/* Tab Selector dentro del acordeón */}
              <div className="flex bg-neutral-900 border border-white/10 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setActiveTab('walletconnect'); setErrorMsg(''); }}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'walletconnect' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Cloud / QR
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('injected'); setErrorMsg(''); }}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'injected' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Extensión Navegador
                </button>
              </div>

              {activeTab === 'walletconnect' && (
                <div className="text-center p-3 space-y-2">
                  <p className="text-[11px] text-neutral-400">
                    WalletConnect te permite emparejar cualquier billetera compatible escaneando el código QR.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenWalletConnectModal}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10"
                  >
                    Abrir Escáner QR
                  </button>
                </div>
              )}

              {activeTab === 'injected' && (
                <button
                  type="button"
                  onClick={handleInjectedConnect}
                  disabled={connecting}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 border border-white/10 p-3 rounded-xl flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🦊</span>
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        MetaMask / EVM Inyectado
                      </h4>
                      <p className="text-[10px] text-neutral-500">
                        {hasInjected ? 'Extensión detectada' : 'No inyectado'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {connecting ? 'Conectando...' : 'Conectar'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
