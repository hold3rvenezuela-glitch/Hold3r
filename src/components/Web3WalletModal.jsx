import React, { useState } from 'react';
import { Globe, Zap, QrCode, ShieldAlert } from 'lucide-react';
import { connectWeb3Wallet, isWeb3Available } from '../services/web3';

export default function Web3WalletModal({ isOpen, onClose, onWalletConnected }) {
  const [activeTab, setActiveTab] = useState('wallets'); // 'wallets' | 'walletconnect' | 'sandbox'
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const hasInjected = isWeb3Available();

  const handleInjectedConnect = async () => {
    setConnecting(true);
    setErrorMsg('');
    try {
      if (!hasInjected) {
        throw new Error('No se detectó extensión de navegador (MetaMask / Trust Wallet). Puedes usar la pestaña de WalletConnect o la Wallet Sandbox de prueba.');
      }
      const conn = await connectWeb3Wallet();
      onWalletConnected(conn);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al conectar la billetera.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSandboxConnect = (network = 'BEP20') => {
    const fakeAddress = network === 'TRC20'
      ? 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
      : '0x71C8a9f3B12D04f16E890e72A1B00e00784a923C';

    const sandboxConn = {
      address: fakeAddress,
      chainId: network === 'TRC20' ? 72812641 : 56,
      networkName: network === 'TRC20' ? 'TRC20 (Tron Mainnet)' : 'BEP20 (BNB Chain)',
      shortAddress: `${fakeAddress.substring(0, 6)}...${fakeAddress.substring(fakeAddress.length - 4)}`,
      isSandbox: true
    };

    onWalletConnected(sandboxConn);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md pt-24 pb-12 overflow-y-auto animate-fade-in">
      <div className="glass-panel w-full max-w-lg p-6 sm:p-8 border border-cyan-500/40 shadow-2xl relative max-h-[85vh] overflow-y-auto my-auto">
        
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Conectar Billetera Web3</h3>
            <p className="text-xs text-neutral-400">
              Soporte Multi-Wallet, WalletConnect y Sandbox de pruebas en desarrollo.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-neutral-900 border border-white/10 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('wallets'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'wallets' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            🦊 Billeteras
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('walletconnect'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'walletconnect' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            📲 WalletConnect
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('sandbox'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'sandbox' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-neutral-400 hover:text-white'
            }`}
          >
            ⚡ Sandbox Demo
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl mb-4 font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Direct Injected Wallets */}
        {activeTab === 'wallets' && (
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
                    MetaMask / Browser Extension
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    {hasInjected ? 'Extensión detectada en navegador' : 'No detectada (Requiere extensión)'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                {connecting ? 'Conectando...' : 'Conectar'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleInjectedConnect}
              disabled={connecting}
              className="w-full bg-neutral-900/90 hover:bg-neutral-900 border border-white/10 hover:border-cyan-500/50 p-4 rounded-2xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-lg">
                  🛡️
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Trust Wallet
                  </h4>
                  <p className="text-[11px] text-neutral-400">Billetera multi-cadena Web3</p>
                </div>
              </div>
              <span className="text-xs font-bold text-neutral-400 group-hover:text-white">
                Seleccionar
              </span>
            </button>

            <button
              type="button"
              onClick={handleInjectedConnect}
              disabled={connecting}
              className="w-full bg-neutral-900/90 hover:bg-neutral-900 border border-white/10 hover:border-cyan-500/50 p-4 rounded-2xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-lg">
                  🔵
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Coinbase Wallet
                  </h4>
                  <p className="text-[11px] text-neutral-400">Conexión directa EIP-1193</p>
                </div>
              </div>
              <span className="text-xs font-bold text-neutral-400 group-hover:text-white">
                Seleccionar
              </span>
            </button>
          </div>
        )}

        {/* Tab 2: WalletConnect Real Integration */}
        {activeTab === 'walletconnect' && (
          <div className="glass-panel p-6 border border-white/10 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-cyan-400" />
              Conexión Universal WalletConnect
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Haz clic en el botón de abajo para desplegar el selector oficial de WalletConnect. Esto abrirá automáticamente MetaMask Mobile, Trust Wallet o cualquier otra app compatible desde tu celular.
            </p>

            {/* Componente nativo oficial de WalletConnect AppKit */}
            <div className="flex justify-center py-4">
              <w3m-button />
            </div>

            <button
              type="button"
              onClick={() => handleSandboxConnect('BEP20')}
              className="btn-secondary text-xs w-full border-cyan-500/30 text-cyan-300 mt-2"
            >
              Simular Conexión (Sandbox Móvil)
            </button>
          </div>
        )}

        {/* Tab 3: Sandbox Fallback Mode for Local Testing */}
        {activeTab === 'sandbox' && (
          <div className="glass-panel p-6 border border-cyan-500/30 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
              <h4 className="text-sm font-bold text-white">Modo Sandbox Web3 (Entorno Local)</h4>
            </div>
            
            <p className="text-xs text-neutral-300 leading-relaxed">
              Permite probar todas las transferencias de USDT y compras de fracciones sin depender de una extensión instalada en Chrome ni interrumpir el flujo con alertas.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSandboxConnect('BEP20')}
                className="w-full btn-primary bg-gradient-to-r from-cyan-500 to-teal-500 text-neutral-950 font-bold py-3 text-xs shadow-cyan-500/20"
              >
                ⚡ Conectar Sandbox USDT (Red BEP20 / BNB Chain)
              </button>

              <button
                type="button"
                onClick={() => handleSandboxConnect('TRC20')}
                className="w-full btn-secondary py-3 text-xs border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
              >
                🔴 Conectar Sandbox USDT (Red TRC20 / TRON)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
