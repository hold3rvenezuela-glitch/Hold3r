import React, { useState } from 'react';
import { 
  Shield, Wallet, PlusCircle, User, LogOut, Layers, Vote, 
  Building2, Globe, ExternalLink, Check, RefreshCw, Menu, X, Sparkles
} from 'lucide-react';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';
import Web3WalletModal from './Web3WalletModal';
import DepositModal from './DepositModal';

export default function Navbar({ 
  currentTab, setCurrentTab, userProfile, wallet, 
  onOpenAuth, onSignOut, onDepositUsdt 
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const navItems = [
    { id: 'investor', Icon: Building2, label: 'Explorar Activos' },
    ...(userProfile ? [{ id: 'my-investments', Icon: Layers, label: 'Mis Inversiones' }] : []),
    { id: 'governance', Icon: Vote, label: 'Gobernanza' },
    ...(userProfile?.role === 'admin' ? [{ id: 'admin', Icon: PlusCircle, label: 'Admin' }] : []),
  ];

  const handleNavClick = (tabId) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
    setShowProfileMenu(false);
  };

  return (
    <>
      {/* ── NAVBAR HEADER ── */}
      <header
        className="sticky top-0 w-full border-b border-white/[0.07] backdrop-blur-xl"
        style={{ background: 'rgba(11,15,14,0.92)', zIndex: 40 }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-2 sm:gap-4">

          {/* Brand */}
          <button
            onClick={() => handleNavClick('investor')}
            className="flex items-center gap-2 group shrink-0"
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

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {navItems.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
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

            {/* Web3 Connect pill (Desktop) */}
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

                {/* User avatar button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowProfileMenu(v => !v);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'rgba(0,255,136,0.18)' }}
                    >
                      {userProfile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-bold text-white max-w-[100px] truncate">{userProfile.full_name}</p>
                      <p className="text-[10px] font-mono" style={{ color: '#6b7280' }}>{userProfile.document_id}</p>
                    </div>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <>
                      <div
                        className="fixed inset-0"
                        style={{ zIndex: 999998 }}
                        onClick={() => setShowProfileMenu(false)}
                      />
                      <div
                        className="absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl animate-fade-in"
                        style={{
                          background: '#111715',
                          border: '1px solid rgba(255,255,255,0.12)',
                          zIndex: 999999,
                        }}
                      >
                        {/* Header Profile */}
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
                        <div className="p-2 space-y-1">
                          {/* Saldo Móvil en Dropdown */}
                          <div className="sm:hidden p-2.5 rounded-xl bg-black/40 border border-emerald-500/30 flex items-center justify-between">
                            <div>
                              <span className="text-[9px] uppercase tracking-widest block text-emerald-400">Saldo USDT</span>
                              <span className="text-xs font-bold font-mono text-white">
                                ${Number(wallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <button
                              onClick={() => { setShowDepositModal(true); setShowProfileMenu(false); }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg"
                            >
                              + Depositar
                            </button>
                          </div>

                          {userProfile?.role === 'admin' && (
                            <button
                              onClick={() => handleNavClick('admin')}
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
                            Pasarela de Depósito USDT
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
              <button onClick={onOpenAuth} className="btn-primary text-xs py-1.5 px-3">
                <User className="w-3.5 h-3.5" />
                Ingresar
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(v => !v);
                setShowProfileMenu(false);
              }}
              className="md:hidden p-2 rounded-xl text-neutral-300 hover:text-white bg-neutral-900 border border-white/10 transition-colors"
              aria-label="Abrir Menú de Navegación"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5 text-white" />}
            </button>

          </div>
        </div>

        {/* ── MOBILE MENU SLIDE-DOWN DRAWER ── */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0B0F0E]/98 backdrop-blur-2xl px-4 py-4 space-y-3 animate-fade-in shadow-2xl border-b border-emerald-500/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-1">
              Menú Principal HOLD3R
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {navItems.map(({ id, Icon, label }) => {
                const isActive = currentTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleNavClick(id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
                      isActive
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-md'
                        : 'bg-neutral-900/80 border border-white/5 text-neutral-300 hover:bg-neutral-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
                      <span>{label}</span>
                    </div>
                    {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* Mobile Web3 status & quick deposit bar */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <button
                onClick={() => { setShowWeb3Modal(true); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-900/90 border border-white/10 text-xs font-semibold text-neutral-300"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Estado Web3:</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-400">
                  {activeWalletAddress ? activeShortAddress : 'Conectar Wallet'}
                </span>
              </button>

              {userProfile && (
                <button
                  onClick={() => { setShowDepositModal(true); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>Saldo USDT: ${Number(wallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <span className="bg-emerald-500 text-neutral-950 px-2 py-0.5 rounded text-[10px] uppercase font-extrabold">
                    Depositar
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── FLOATING MOBILE BOTTOM NAVIGATION DOCK (Native PWA style) ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#0B0F0E]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 shadow-2xl">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map(({ id, Icon, label }) => {
            const isActive = currentTab === id;
            return (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                  isActive ? 'text-emerald-400 font-extrabold scale-105' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
                <span className="text-[10px] tracking-tight">{label.split(' ')[0]}</span>
              </button>
            );
          })}

          {userProfile ? (
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex flex-col items-center gap-0.5 py-1 px-2 text-emerald-400 font-bold"
            >
              <Wallet className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-[10px]">Depositar</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex flex-col items-center gap-0.5 py-1 px-2 text-emerald-400 font-bold"
            >
              <User className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px]">Ingresar</span>
            </button>
          )}
        </div>
      </div>

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


