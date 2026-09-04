import React, { useState, useEffect } from 'react';
import { Globe, QrCode, ShieldAlert, Cpu, LogOut, Copy, Check, ExternalLink, RefreshCw, Smartphone } from 'lucide-react';
import { useWeb3Modal, useWeb3ModalAccount, useDisconnect } from '@web3modal/ethers/react';
import { connectWeb3Wallet, isWeb3Available, isMobileBrowser, getMobileWalletDeepLink } from '../services/web3';

export default function Web3WalletModal({ isOpen, onClose, onWalletConnected }) {
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
      onWalletConnected({
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
    onWalletConnected(null);
  };

  const handleInjectedConnect = async () => {
    setConnecting(true);
    setErrorMsg('');
    try {
      if (!hasInjected) {
        throw new Error('No se detectó extensión Web3 en tu navegador actual. Si estás en móvil, utiliza la pestaña de WalletConnect o abre HOLD3R en el navegador interno de tu billetera.');
      }
      const conn = await connectWeb3Wallet();
      onWalletConnected(conn);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md pt-24 pb-12 overflow-y-auto animate-fade-in">
      <div className="glass-panel w-full max-w-lg p-6 sm:p-8 border border-cyan-500/40 shadow-2xl relative max-h-[88vh] overflow-y-auto my-auto">
        
        {/* Glow Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white text-xl font-bold p-1"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Gestión de Billetera Web3</h3>
            <p className="text-xs text-neutral-400">
              Conexión directa multi-cadena mediante WalletConnect y extensiones EVM.
            </p>
          </div>
        </div>

        {/* Mobile Browser Helpful Guide Banner */}
        {isMobile && !hasInjected && (
          <div className="p-4 rounded-2xl mb-5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs space-y-2.5 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-cyan-300">
              <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Acceso Móvil Recomendado</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Estás en un navegador móvil estándar (sin inyección Web3 directa). Para conectar fácilmente tu billetera:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a 
                href={getMobileWalletDeepLink('metamask')} 
                target="_blank" 
                rel="noreferrer" 
                className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-[11px] font-bold py-2.5 px-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors"
              >
                🦊 Abrir en MetaMask
              </a>
              <a 
                href={getMobileWalletDeepLink('trust')} 
                target="_blank" 
                rel="noreferrer" 
                className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold py-2.5 px-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors"
              >
                🛡️ Abrir en Trust Wallet
              </a>
            </div>
          </div>
        )}

        {/* Active Connected Wallet Card */}
        {isConnected && address ? (
          <div className="bg-neutral-900/90 border border-cyan-500/50 p-5 rounded-2xl space-y-4 mb-6 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Wallet Conectada Activa
              </span>
              <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                Chain ID: {chainId || 56}
              </span>
            </div>

            <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/10">
              <span className="font-mono text-xs font-bold text-white truncate max-w-[240px]">
                {address}
              </span>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 shrink-0 ml-2"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenWalletConnectModal}
                className="btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5 border-cyan-500/30 text-cyan-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Cambiar / Red
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5 border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                Desconectar
              </button>
            </div>
          </div>
        ) : null}

        {/* Tab Switcher */}
        <div className="flex bg-neutral-900 border border-white/10 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('walletconnect'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'walletconnect' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            WalletConnect Universal
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('injected'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'injected' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Extensión de Navegador
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl mb-4 font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: WalletConnect Real Integration */}
        {activeTab === 'walletconnect' && (
          <div className="glass-panel p-6 border border-white/10 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-cyan-400" />
              Conexión Oficial WalletConnect Cloud
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Escanea el código QR desde tu billetera móvil (Trust Wallet, MetaMask Mobile, Rainbow, Coinbase Wallet, etc.) o selecciona tu app para conectar de forma segura.
            </p>

            {/* Componente nativo oficial de WalletConnect AppKit */}
            <div className="flex justify-center py-2">
              <w3m-button />
            </div>

            <button
              type="button"
              onClick={handleOpenWalletConnectModal}
              className="w-full btn-primary bg-gradient-to-r from-cyan-500 to-teal-500 text-neutral-950 font-bold py-3 text-xs shadow-cyan-500/20 mt-2"
            >
              📲 Abrir Modal WalletConnect (Código QR)
            </button>
          </div>
        )}

        {/* Tab 2: Direct Injected Extension Wallets */}
        {activeTab === 'injected' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleInjectedConnect}
              disabled={connecting}
              className="w-full bg-neutral-900/90 hover:bg-neutral-900 border border-white/10 hover:border-cyan-500/50 p-4 rounded-2xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-lg">
                  🦊
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    MetaMask / Extensiones EVM
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    {hasInjected ? 'Extensión detectada en navegador' : 'Conexión inyectada window.ethereum'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                {connecting ? 'Conectando...' : 'Conectar'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
