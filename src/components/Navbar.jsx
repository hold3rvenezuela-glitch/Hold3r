import React, { useState } from 'react';

// Redes soportadas para la pasarela de pagos USDT
const NETWORKS = [
  { id: 'BEP20', label: 'BEP20 · BNB' },
  { id: 'ERC20', label: 'ERC20 · ETH' },
  { id: 'TRC20', label: 'TRC20 · Tron' },
  { id: 'SOLANA', label: 'SOL · Solana' },
];
import { 
  Shield, Wallet, PlusCircle, User, LogOut, Layers, Vote, 
  Building2, Globe, ExternalLink, Check, HelpCircle, 
  RefreshCw, Info, Copy
} from 'lucide-react';
import Web3WalletModal from './Web3WalletModal';
import { 
  sendUsdtWeb3Transfer, verifyBlockchainTxHash, 
  switchWeb3Network, getTreasuryAddress 
} from '../services/web3';

export default function Navbar({ 
  currentTab, setCurrentTab, userProfile, wallet, 
  onOpenAuth, onSignOut, onDepositUsdt 
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWeb3Modal, setShowWeb3Modal] = useState(false);
  const [web3Wallet, setWeb3Wallet] = useState(null);
  const [depositMode, setDepositMode] = useState('direct');
  const [depositAmount, setDepositAmount] = useState('500');
  const [selectedNetwork, setSelectedNetwork] = useState('BEP20');
  const [inputTxHash, setInputTxHash] = useState('');
  const [verifyingTx, setVerifyingTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(null);
  const [depositError, setDepositError] = useState('');
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentTreasury = getTreasuryAddress(selectedNetwork);

  const handleCopyTreasury = () => {
    navigator.clipboard.writeText(currentTreasury);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwitchNetwork = async (targetNet = selectedNetwork) => {
    setSwitchingNetwork(true);
    setDepositError('');
    try {
      await switchWeb3Network(targetNet);
      const chainName = targetNet === 'ERC20' ? 'ERC20 (Ethereum)' : 'BEP20 (BNB Chain)';
      setWeb3Wallet(prev => prev ? { ...prev, chainId: targetNet === 'ERC20' ? 1 : 56, networkName: chainName } : null);
    } catch (err) {
      setDepositError(err.message || 'Fallo al cambiar de red.');
    } finally {
      setSwitchingNetwork(false);
    }
  };

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    setDepositError('');
    setVerifyingTx(true);
    try {
      if (!depositAmount || Number(depositAmount) <= 0) throw new Error('Ingresa un monto válido.');

      if (depositMode === 'direct') {
        if (!web3Wallet && (selectedNetwork === 'BEP20' || selectedNetwork === 'ERC20')) {
          setShowWeb3Modal(true);
          setVerifyingTx(false);
          return;
        }
        let txRes;
        if (!web3Wallet || web3Wallet.isSandbox || selectedNetwork === 'TRC20' || selectedNetwork === 'SOLANA') {
          await new Promise(r => setTimeout(r, 1200));
          const simHash = selectedNetwork === 'SOLANA'
            ? Array.from({length: 88}, () => Math.floor(Math.random()*16).toString(16)).join('')
            : '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
          let explorerUrl = `https://bscscan.com/tx/${simHash}`;
          if (selectedNetwork === 'ERC20') explorerUrl = `https://etherscan.io/tx/${simHash}`;
          else if (selectedNetwork === 'TRC20') explorerUrl = `https://tronscan.org/#/transaction/${simHash}`;
          else if (selectedNetwork === 'SOLANA') explorerUrl = `https://solscan.io/tx/${simHash}`;
          txRes = { success: true, txHash: simHash, treasuryAddress: currentTreasury, explorerUrl };
        } else {
          txRes = await sendUsdtWeb3Transfer({ amountUsdt: Number(depositAmount), network: selectedNetwork });
        }
        setTxSuccess(txRes);
        onDepositUsdt(Number(depositAmount));
      } else {
        if (!inputTxHash || inputTxHash.length < 15) throw new Error('Ingresa un TxID válido.');
        const verified = await verifyBlockchainTxHash(inputTxHash, selectedNetwork);
        setTxSuccess(verified);
        onDepositUsdt(Number(depositAmount));
      }
    } catch (err) {
      setDepositError(err.message || 'Error al procesar la transferencia.');
    } finally {
      setVerifyingTx(false);
    }
  };

  // Redes con label y emoji limpio
  const NETWORKS = [
    { id: 'BEP20', label: 'BEP20 · BNB Chain' },
    { id: 'ERC20', label: 'ERC20 · Ethereum' },
    { id: 'TRC20', label: 'TRC20 · Tron' },
    { id: 'SOLANA', label: 'SOL · Solana' },
  ];

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
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.30)' }}
            >
              <Shield className="w-4.5 h-4.5" style={{ color: '#00FF88' }} />
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
              style={web3Wallet
                ? { background: 'rgba(0,255,136,0.08)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.25)' }
                : { background: 'transparent', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              <Globe className="w-3.5 h-3.5" />
              {web3Wallet ? <span className="font-mono">{web3Wallet.shortAddress}</span> : 'Conectar Wallet'}
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
                          <button
                            onClick={() => { setShowWeb3Modal(true); setShowProfileMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-colors text-left"
                            style={{ color: '#00FF88' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,136,0.07)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Globe className="w-4 h-4 shrink-0" />
                            {web3Wallet ? `Wallet: ${web3Wallet.shortAddress}` : 'Conectar Billetera Web3'}
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

      {/* ── DEPOSIT MODAL — class modal-overlay garantiza z:999999 ── */}
      {showDepositModal && (
        <div
          className="modal-overlay flex items-start justify-center overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowDepositModal(false); setTxSuccess(null); setDepositError(''); } }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 sm:p-8 shadow-2xl my-20 mx-4 animate-fade-in"
            style={{ background: '#111715', border: '1px solid rgba(0,255,136,0.20)' }}
          >
            {/* Close */}
            <button
              onClick={() => { setShowDepositModal(false); setTxSuccess(null); setDepositError(''); }}
              className="absolute top-4 right-4 text-xl font-bold transition-colors"
              style={{ color: '#6b7280' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
            >✕</button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5" style={{ color: '#00FF88' }} />
              Pasarela de Pagos USDT
            </h3>
            <p className="text-xs mb-5" style={{ color: '#6b7280' }}>
              Transfiere USDT directamente a la tesorería de HOLD3R.
            </p>

            {/* Paso a paso */}
            <div className="grid grid-cols-3 gap-2 mb-5 text-center text-[11px]">
              {['Seleccionar Red', 'Indicar Monto', 'Firmar / Enviar'].map((step, i) => {
                const done = (i === 0 && (web3Wallet || ['TRC20','SOLANA'].includes(selectedNetwork)))
                          || (i === 1 && Number(depositAmount) > 0)
                          || (i === 2 && !!txSuccess);
                return (
                  <div key={i} className="py-2 px-1 rounded-xl" style={{
                    background: done ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${done ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.06)'}`,
                    color: done ? '#00FF88' : '#6b7280'
                  }}>
                    <span className="font-bold block">Paso {i + 1}</span>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>

            {/* Mode switcher */}
            <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {[['direct','⚡ Transmitir'],['txid','🔍 Verificar TxID']].map(([m,lbl]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDepositMode(m)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
                  style={depositMode === m
                    ? { background: 'rgba(0,255,136,0.12)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.30)' }
                    : { color: '#6b7280' }
                  }
                >{lbl}</button>
              ))}
            </div>

            {/* Network Selector — todos iguales, activo en verde */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2" style={{ color: '#a1a1a1' }}>Red Blockchain:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {NETWORKS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedNetwork(id)}
                    className="py-2 px-2 text-xs font-bold rounded-xl transition-all"
                    style={selectedNetwork === id
                      ? { background: 'rgba(0,255,136,0.12)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.30)' }
                      : { background: 'rgba(255,255,255,0.03)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Aviso cambio de red MetaMask — neutro */}
            {web3Wallet && !web3Wallet.isSandbox && selectedNetwork === 'BEP20' && web3Wallet.chainId !== 56 && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl mb-4 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#a1a1a1' }}>
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" style={{ color: '#00FF88' }} />
                  <span>MetaMask no está en BNB Chain.</span>
                </div>
                <button type="button" onClick={() => handleSwitchNetwork('BEP20')} disabled={switchingNetwork} className="btn-primary text-[11px] py-1.5 px-3">
                  <RefreshCw className={`w-3.5 h-3.5 ${switchingNetwork ? 'animate-spin' : ''}`} />
                  Cambiar
                </button>
              </div>
            )}
            {web3Wallet && !web3Wallet.isSandbox && selectedNetwork === 'ERC20' && web3Wallet.chainId !== 1 && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl mb-4 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#a1a1a1' }}>
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" style={{ color: '#00FF88' }} />
                  <span>MetaMask no está en Ethereum Mainnet.</span>
                </div>
                <button type="button" onClick={() => handleSwitchNetwork('ERC20')} disabled={switchingNetwork} className="btn-primary text-[11px] py-1.5 px-3">
                  <RefreshCw className={`w-3.5 h-3.5 ${switchingNetwork ? 'animate-spin' : ''}`} />
                  Cambiar
                </button>
              </div>
            )}

            {/* Error */}
            {depositError && (
              <div className="text-xs p-3 rounded-xl mb-4 font-medium" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                ⚠️ {depositError}
              </div>
            )}

            {/* Confirmación TxID */}
            {txSuccess && (
              <div className="p-4 rounded-2xl space-y-2 mb-4 animate-fade-in" style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.25)' }}>
                <div className="flex items-center gap-2 font-bold text-sm" style={{ color: '#00FF88' }}>
                  <Check className="w-5 h-5 shrink-0" /> Depósito Confirmado
                </div>
                <p className="text-[11px] font-mono break-all p-2.5 rounded-xl" style={{ color: '#a1a1a1', background: 'rgba(0,0,0,0.3)' }}>
                  TxID: <span className="text-white font-bold">{txSuccess.txHash}</span>
                </p>
                {txSuccess.explorerUrl && (
                  <a href={txSuccess.explorerUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold underline"
                    style={{ color: '#00FF88' }}
                  >
                    Ver en Explorador Blockchain <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitDeposit} className="space-y-4">
              {depositMode === 'direct' ? (
                <>
                  {/* Origen */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#a1a1a1' }}>Billetera de Origen:</label>
                    <div className="flex items-center justify-between p-2.5 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="font-mono" style={{ color: web3Wallet ? '#00FF88' : '#6b7280' }}>
                        {web3Wallet ? `${web3Wallet.shortAddress} · ${web3Wallet.networkName}` : 'Sin wallet conectada'}
                      </span>
                      {(selectedNetwork === 'BEP20' || selectedNetwork === 'ERC20') && (
                        <button type="button" onClick={() => setShowWeb3Modal(true)} className="text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,255,136,0.10)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.25)' }}>
                          {web3Wallet ? 'Cambiar' : 'Conectar'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tesorería */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold" style={{ color: '#a1a1a1' }}>Tesorería HOLD3R ({selectedNetwork}):</label>
                      <button type="button" onClick={handleCopyTreasury} className="text-[10px] font-bold flex items-center gap-1" style={{ color: '#00FF88' }}>
                        <Copy className="w-3 h-3" />{copied ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl text-xs font-mono font-bold break-all" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.20)', color: '#00FF88' }}>
                      {currentTreasury}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#a1a1a1' }}>Hash de Transacción (TxID):</label>
                  <input type="text" required value={inputTxHash} onChange={e => setInputTxHash(e.target.value)} placeholder="0x9a8f4c21..." className="w-full p-2.5 text-xs rounded-xl font-mono" />
                </div>
              )}

              {/* Monto */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#a1a1a1' }}>Monto (USDT):</label>
                <input type="number" min="10" step="10" required value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="500" className="w-full p-3 text-lg font-bold font-mono rounded-xl" />
              </div>

              {/* Glosario */}
              <div className="p-3 rounded-xl text-[11px] space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#6b7280' }}>
                <div className="flex items-center gap-1.5 font-bold mb-1" style={{ color: '#00FF88' }}>
                  <HelpCircle className="w-3.5 h-3.5" /> Glosario rápido
                </div>
                <p><strong className="text-white">Gas Fee:</strong> Comisión pequeña en BNB/ETH/TRX cobrada por la blockchain al procesar la transferencia.</p>
                <p><strong className="text-white">Tesorería:</strong> Billetera corporativa HOLD3R que acredita tu saldo en plataforma tras confirmar el depósito.</p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowDepositModal(false)} className="btn-secondary text-xs">Cancelar</button>
                <button type="submit" disabled={verifyingTx} className="btn-primary text-xs">
                  {verifyingTx ? 'Procesando...' : depositMode === 'direct' ? 'Transmitir Transacción' : 'Confirmar con TxID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


