import React, { useState } from 'react';
import { 
  Shield, Wallet, PlusCircle, User, LogOut, Layers, Vote, 
  Building2, Globe, ExternalLink, Check, RefreshCw
} from 'lucide-react';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';
import Web3WalletModal from './Web3WalletModal';
import DepositModal from './DepositModal';

export default function Navbar({ 
  currentTab, setCurrentTab, userProfile, wallet, 
  onOpenAuth, onSignOut, onDepositUsdt 
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWeb3Modal, setShowWeb3Modal] = useState(false);
  const [web3Wallet, setWeb3Wallet] = useState(null);
  // Integración en tiempo real con WalletConnect / Web3Modal Account
  const { address: wcAddress, chainId: wcChainId, isConnected: wcIsConnected } = useWeb3ModalAccount();

  const activeWalletAddress = (wcIsConnected && wcAddress) ? wcAddress : (web3Wallet?.address || null);
  const activeChainId = (wcIsConnected && wcChainId) ? wcChainId : (web3Wallet?.chainId || null);
  const activeShortAddress = activeWalletAddress
    ? `${activeWalletAddress.substring(0, 6)}...${activeWalletAddress.substring(activeWalletAddress.length - 4)}`
    : null;

  return (
    <>
      {/* ── NAVBAR ── */}
      <header
        className="sticky top-0 w-full border-b border-white/[0.07] backdrop-blur-xl"
        style={{ background: 'rgba(11,15,14,0.92)', zIndex: 40 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">

          {/* Brand */}
          <button
            onClick={() => setCurrentTab('investor')}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-emerald-500/10"
              style={{ background: '#0B0F0E', border: '1px solid rgba(0,255,102,0.35)' }}
            >
              <img src="/pwa-icon.jpg" alt="H" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-white">HOLD3R</span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest uppercase"
                  style={{ color: '#00FF88', border: '1px solid rgba(0,255,136,0.30)', background: 'rgba(0,255,136,0.08)' }}
                >
                  RWA
                </span>
              </div>
              <p className="text-[10px] hidden sm:block" style={{ color: '#6b7280' }}>
                Inversión Fraccionada · Venezuela
              </p>
            </div>
          </button>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { id: 'investor',      Icon: Building2, label: 'Explorar Activos' },
              ...(userProfile ? [{ id: 'my-investments', Icon: Layers,    label: 'Mis Inversiones' }] : []),
              { id: 'governance',   Icon: Vote,     label: 'Gobernanza' },
              ...(userProfile?.role === 'admin' ? [{ id: 'admin', Icon: PlusCircle, label: 'Admin' }] : []),
            ].map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setCurrentTab(id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={currentTab === id
                  ? { background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.10)' }
                  : { color: '#6b7280', border: '1px solid transparent' }
                }
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={{ color: currentTab === id ? '#00FF88' : '#6b7280' }}
                />
                {label}
              </button>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Web3 Connect pill */}
            <button
              onClick={() => setShowWeb3Modal(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={activeWalletAddress
                ? { background: 'rgba(0,255,136,0.08)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.25)' }
                : { background: 'transparent', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              <Globe className="w-3.5 h-3.5" />
              {activeWalletAddress ? <span className="font-mono">{activeShortAddress}</span> : 'Conectar Wallet'}
            </button>

            {userProfile ? (
              <>
                {/* USDT Balance pill */}
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                  style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.20)' }}
                >
                  <Wallet className="w-3.5 h-3.5" style={{ color: '#00FF88' }} />
                  <div className="text-left">
                    <span className="text-[9px] uppercase tracking-widest block" style={{ color: '#00FF88', opacity: 0.7 }}>USDT</span>
                    <span className="text-xs font-bold font-mono text-white">
                      ${Number(wallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>

                {/* User avatar + dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(v => !v)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'rgba(0,255,136,0.18)' }}
                    >
                      {userProfile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-bold text-white max-w-[100px] truncate">{userProfile.full_name}</p>
                      <p className="text-[10px] font-mono" style={{ color: '#6b7280' }}>{userProfile.document_id}</p>
                    </div>
                  </button>

                  {/* ── DROPDOWN MENU — usa clase modal-overlay para z:999999 ── */}
                  {showProfileMenu && (
                    <>
                      {/* Click-away backdrop */}
                      <div
                        className="fixed inset-0"
                        style={{ zIndex: 999998 }}
                        onClick={() => setShowProfileMenu(false)}
                      />
                      <div
                        className="absolute right-0 mt-2 w-60 rounded-2xl shadow-2xl animate-fade-in"
                        style={{
                          background: '#111715',
                          border: '1px solid rgba(255,255,255,0.10)',
                          zIndex: 999999,
                          position: 'absolute',
                        }}
                      >
                        {/* Header */}
                        <div className="p-3.5 border-b border-white/[0.07]">
                          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Sesión Activa</p>
                          <p className="text-sm font-bold text-white truncate">{userProfile.full_name}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ color: '#00FF88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.20)' }}>
                              {userProfile.document_id}
                            </span>
                            <span className={userProfile.role === 'admin' ? 'badge-role-admin' : 'badge-role-investor'}>
                              {userProfile.role}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-2 space-y-0.5">
                          {userProfile?.role === 'admin' && (
                            <button
                              onClick={() => { setCurrentTab('admin'); setShowProfileMenu(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-colors text-left"
                              style={{ color: '#00FF88' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,136,0.07)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <PlusCircle className="w-4 h-4 shrink-0" />
                              Oficina Virtual Admin
                            </button>
                          )}

                          <button
                            onClick={() => { setShowWeb3Modal(true); setShowProfileMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-colors text-left"
                            style={{ color: activeWalletAddress ? '#00FF88' : '#a1a1a1' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Globe className="w-4 h-4 shrink-0" />
                            {activeWalletAddress ? `Wallet: ${activeShortAddress}` : 'Conectar Billetera Web3'}
                          </button>

                          <button
                            onClick={() => { setShowDepositModal(true); setShowProfileMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-colors text-left"
                            style={{ color: '#a1a1a1' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Wallet className="w-4 h-4 shrink-0" />
                            Depositar USDT
                          </button>

                          <button
                            onClick={() => { onSignOut(); setShowProfileMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-colors text-left"
                            style={{ color: '#ef4444' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <LogOut className="w-4 h-4 shrink-0" />
                            Cerrar Sesión
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <button onClick={onOpenAuth} className="btn-primary text-xs">
                <User className="w-3.5 h-3.5" />
                Ingresar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── WEB3 WALLET MODAL ── */}
      <Web3WalletModal
        isOpen={showWeb3Modal}
        onClose={() => setShowWeb3Modal(false)}
        onWalletConnected={conn => setWeb3Wallet(conn)}
      />

      {/* ── DEPOSIT MODAL PASARELA USDT MULTI-RED ── */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDepositUsdt={onDepositUsdt}
        web3Wallet={web3Wallet}
        onOpenWeb3Modal={() => setShowWeb3Modal(true)}
      />
    </>
  );
}


