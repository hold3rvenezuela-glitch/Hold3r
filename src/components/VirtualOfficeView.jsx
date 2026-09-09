import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Camera, Wallet, Layers, Vote,
  Clock, User, RefreshCw, Copy, Check,
  ExternalLink, TrendingUp, TrendingDown, Edit3,
  Save, X, Loader2, AlertCircle, CheckCircle2,
  Building2, BarChart3
} from 'lucide-react';
import {
  fetchUserShares,
  fetchWalletTransactions,
  uploadUserAvatar,
  updateUserProfile,
  getUserWallet,
} from '../services/api';
import GovernanceView from './GovernanceView';

// ─── Utilidades ──────────────────────────────────────────────────────────────
const BSCSCAN = 'https://bscscan.com/tx/';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function shortHash(hash) {
  if (!hash) return '—';
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
}

// ─── Badge KYC ────────────────────────────────────────────────────────────────
function KycBadge({ status }) {
  if (status === 'approved') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35">
      <ShieldCheck className="w-3.5 h-3.5" /> KYC Verificado
    </span>
  );
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/35">
      <Clock className="w-3.5 h-3.5" /> KYC Pendiente
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
      <AlertCircle className="w-3.5 h-3.5" /> Sin Verificar
    </span>
  );
}

// ─── Tab: Mis Inversiones ────────────────────────────────────────────────────
function InvestmentsTab({ userId, initialShares }) {
  const [shares, setShares] = useState(initialShares || []);
  const [loading, setLoading] = useState(!initialShares?.length);

  useEffect(() => {
    if (!initialShares?.length) {
      fetchUserShares(userId).then(s => { setShares(s); setLoading(false); });
    }
  }, [userId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-neutral-400 text-xs font-mono">
      <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-400" /> Cargando inversiones...
    </div>
  );

  if (!shares.length) return (
    <div className="py-16 text-center">
      <Building2 className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
      <p className="text-sm font-bold text-white">Sin inversiones activas</p>
      <p className="text-xs text-neutral-500 mt-1">Explora el catálogo de activos y realiza tu primera inversión.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {shares.map(s => (
        <div key={s.id} className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold text-white">{s.asset?.title || 'Activo'}</p>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5 capitalize">{s.asset?.category?.replace('_', ' ') || '—'}</p>
            </div>
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase font-mono ${
              s.asset?.status === 'active_rent' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : s.asset?.status === 'funding' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
            }`}>
              {s.asset?.status === 'active_rent' ? 'En Renta' : s.asset?.status === 'funding' ? 'En Fondeo' : s.asset?.status || '—'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-black/30 rounded-xl p-2.5">
              <span className="text-neutral-500 block text-[10px] uppercase mb-0.5">Participación</span>
              <strong className="text-emerald-400">{Number(s.shares_percentage).toFixed(4)}%</strong>
            </div>
            <div className="bg-black/30 rounded-xl p-2.5">
              <span className="text-neutral-500 block text-[10px] uppercase mb-0.5">Invertido</span>
              <strong className="text-white">${Number(s.amount_invested_usdt).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</strong>
            </div>
          </div>
          <p className="text-[10px] text-neutral-600 font-mono">
            Adquirido: {formatDate(s.purchased_at)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Wallet & Saldo ─────────────────────────────────────────────────────
function WalletTab({ userId, wallet, onOpenDeposit }) {
  const [walletData, setWalletData] = useState(wallet);

  useEffect(() => {
    getUserWallet(userId).then(w => w && setWalletData(w));
  }, [userId]);

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div
        className="p-6 rounded-2xl relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.12) 0%, rgba(0,200,100,0.04) 100%)', border: '1px solid rgba(0,255,136,0.25)' }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #00FF88, transparent)', transform: 'translate(30%, -30%)' }} />
        <p className="text-[11px] text-emerald-400 uppercase tracking-widest font-bold mb-1">Saldo Disponible</p>
        <p className="text-4xl font-black text-white font-mono">
          ${Number(walletData?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          <span className="text-lg text-emerald-400 ml-2">USDT</span>
        </p>
        <button
          onClick={onOpenDeposit}
          className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#00FF88' }}
        >
          + Depositar USDT
        </button>
      </div>

      {/* Wallet details */}
      {walletData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <p className="text-[10px] text-neutral-500 uppercase font-mono mb-1">Dirección USDT</p>
            <p className="text-xs font-mono text-emerald-400 break-all">{walletData.usdt_address || 'No configurada'}</p>
          </div>
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <p className="text-[10px] text-neutral-500 uppercase font-mono mb-1">Red</p>
            <p className="text-sm font-bold text-white">{walletData.network || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Historial de Transacciones ─────────────────────────────────────────
function HistoryTab({ userId }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchWalletTransactions(userId);
    setTxs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const copyHash = (hash, id) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-neutral-400 text-xs font-mono">
      <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-400" /> Cargando historial...
    </div>
  );

  if (!txs.length) return (
    <div className="py-16 text-center">
      <BarChart3 className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
      <p className="text-sm font-bold text-white">Sin movimientos registrados</p>
      <p className="text-xs text-neutral-500 mt-1">Los depósitos y compras aparecerán aquí.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500 font-mono">{txs.length} movimientos</p>
        <button onClick={load} className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-white transition-colors font-mono">
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-2xl overflow-hidden border border-neutral-800">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-neutral-900/80 text-neutral-500 uppercase text-[10px] tracking-wider">
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Descripción</th>
              <th className="text-right px-4 py-3">Monto USDT</th>
              <th className="text-left px-4 py-3">Fecha y Hora</th>
              <th className="text-left px-4 py-3">Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {txs.map(tx => (
              <tr key={tx.id} className="bg-neutral-950/40 hover:bg-neutral-900/60 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    tx.type === 'deposit' || tx.type === 'yield'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'yield'
                      ? <TrendingUp className="w-2.5 h-2.5" />
                      : <TrendingDown className="w-2.5 h-2.5" />}
                    {tx.label || tx.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-300 max-w-[180px] truncate">{tx.description || '—'}</td>
                <td className={`px-4 py-3 text-right font-bold ${
                  tx.type === 'deposit' || tx.type === 'yield' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {tx.type === 'deposit' || tx.type === 'yield' ? '+' : '-'}
                  ${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                <td className="px-4 py-3">
                  {tx.tx_hash ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500">{shortHash(tx.tx_hash)}</span>
                      <button onClick={() => copyHash(tx.tx_hash, tx.id)} className="text-neutral-600 hover:text-white transition-colors">
                        {copiedId === tx.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <a href={`${BSCSCAN}${tx.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:text-emerald-400 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : <span className="text-neutral-700">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {txs.map(tx => (
          <div key={tx.id} className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                tx.type === 'deposit' || tx.type === 'yield'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {tx.label || tx.type}
              </span>
              <span className={`font-bold font-mono text-sm ${
                tx.type === 'deposit' || tx.type === 'yield' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {tx.type === 'deposit' || tx.type === 'yield' ? '+' : '-'}${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono">{formatDate(tx.created_at)}</p>
            {tx.tx_hash && (
              <div className="flex items-center gap-2 bg-black/30 rounded-lg px-2.5 py-1.5">
                <span className="text-[10px] font-mono text-neutral-500 flex-1 truncate">{tx.tx_hash}</span>
                <button onClick={() => copyHash(tx.tx_hash, tx.id)}>
                  {copiedId === tx.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-500" />}
                </button>
                <a href={`${BSCSCAN}${tx.tx_hash}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 text-neutral-500 hover:text-emerald-400 transition-colors" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Editar Perfil ───────────────────────────────────────────────────────
function ProfileTab({ userProfile, onProfileUpdated }) {
  const [form, setForm] = useState({
    full_name: userProfile?.full_name || '',
    document_id: userProfile?.document_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.full_name.trim()) { setError('El nombre completo es requerido.'); return; }
    setSaving(true); setError(''); setSuccess(false);
    try {
      const updated = await updateUserProfile(userProfile.id, form);
      onProfileUpdated(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] text-neutral-400 uppercase font-mono font-bold mb-1.5">
            Nombre Completo
          </label>
          <input
            value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/60 transition-colors font-mono"
            placeholder="Nombre Apellido"
          />
        </div>
        <div>
          <label className="block text-[11px] text-neutral-400 uppercase font-mono font-bold mb-1.5">
            Cédula / RIF
          </label>
          <input
            value={form.document_id}
            onChange={e => setForm(p => ({ ...p, document_id: e.target.value }))}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/60 transition-colors font-mono"
            placeholder="V-12345678 / J-123456789"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Perfil actualizado correctamente.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        style={{ background: '#00FF88' }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Guardando...' : 'Guardar Cambios'}
      </button>

      {/* Datos de solo lectura */}
      <div className="pt-4 border-t border-neutral-800 space-y-2">
        <p className="text-[11px] text-neutral-600 uppercase font-mono font-bold mb-2">Datos de Sistema (solo lectura)</p>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-800">
            <span className="text-neutral-600 block text-[10px]">Rol</span>
            <span className="text-neutral-300 capitalize">{userProfile?.role || '—'}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-800">
            <span className="text-neutral-600 block text-[10px]">Miembro desde</span>
            <span className="text-neutral-300">{userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('es-VE') : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal: VirtualOfficeView ─────────────────────────────────
const TABS = [
  { id: 'investments', icon: Layers,   label: 'Mis Inversiones' },
  { id: 'governance',  icon: Vote,     label: 'Gobernanza'      },
  { id: 'wallet',      icon: Wallet,   label: 'Wallet & Saldo'  },
  { id: 'history',     icon: Clock,    label: 'Historial'       },
  { id: 'profile',     icon: Edit3,    label: 'Editar Perfil'   },
];

export default function VirtualOfficeView({
  userProfile,
  initialShares,
  wallet,
  assets,
  onProfileUpdated,
  onOpenDeposit,
  onOpenKyc,
}) {
  const [activeTab, setActiveTab] = useState('investments');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadUserAvatar(userProfile.id, file);
      setAvatarUrl(url);
      onProfileUpdated?.({ ...userProfile, avatar_url: url });
    } catch (err) {
      console.error('Error subiendo avatar:', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── CABECERA ESTILO PERFIL SOCIAL ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-6"
        style={{ background: 'linear-gradient(145deg, #0f1c18 0%, #0B0F0E 60%)', border: '1px solid rgba(0,255,136,0.15)' }}
      >
        {/* Fondo decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #00FF88, transparent)', transform: 'translate(30%, -30%)' }} />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar editable */}
          <div className="relative shrink-0">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden cursor-pointer border-2 border-emerald-500/40 hover:border-emerald-400/70 transition-all group"
              onClick={() => fileInputRef.current?.click()}
              title="Cambiar foto de perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-emerald-400" style={{ background: 'rgba(0,255,136,0.10)' }}>
                  {userProfile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              {/* Overlay cámara */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Info del usuario */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap justify-center sm:justify-start">
              <h1 className="text-2xl font-black text-white">{userProfile?.full_name}</h1>
              <KycBadge status={userProfile?.kyc_status} />
            </div>

            <p className="text-emerald-400 font-mono font-bold text-sm mt-1">
              @{userProfile?.nickname || 'usuario'}
            </p>

            <div className="flex items-center gap-3 mt-2 flex-wrap justify-center sm:justify-start text-xs font-mono text-neutral-500">
              <span>Cédula/RIF: <strong className="text-neutral-300">{userProfile?.document_id}</strong></span>
              <span>·</span>
              <span className="capitalize">{userProfile?.role === 'admin' ? '🛡️ Administrador' : '👤 Inversor'}</span>
              <span>·</span>
              <span>Miembro desde {userProfile?.created_at ? new Date(userProfile.created_at).getFullYear() : '—'}</span>
            </div>

            {/* Acciones rápidas */}
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center sm:justify-start">
              {userProfile?.kyc_status !== 'approved' && (
                <button
                  onClick={onOpenKyc}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                >
                  🔒 Completar KYC
                </button>
              )}
              <button
                onClick={onOpenDeposit}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
              >
                + Depositar USDT
              </button>
            </div>
          </div>

          {/* Saldo rápido */}
          <div className="shrink-0 text-center px-5 py-3 rounded-2xl" style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.18)' }}>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-0.5">Saldo USDT</p>
            <p className="text-2xl font-black text-white font-mono">
              ${Number(wallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* ── TABS DE NAVEGACIÓN ── */}
      <div className="flex items-center gap-1 p-1 rounded-2xl overflow-x-auto no-scrollbar" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0"
            style={activeTab === id
              ? { background: 'rgba(0,255,136,0.12)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.25)' }
              : { color: '#6b7280', border: '1px solid transparent' }
            }
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* ── CONTENIDO DE TABS ── */}
      <div className="min-h-[300px]">
        {activeTab === 'investments' && (
          <InvestmentsTab userId={userProfile.id} initialShares={initialShares} />
        )}
        {activeTab === 'governance' && (
          <GovernanceView userProfile={userProfile} assets={assets} />
        )}
        {activeTab === 'wallet' && (
          <WalletTab userId={userProfile.id} wallet={wallet} onOpenDeposit={onOpenDeposit} />
        )}
        {activeTab === 'history' && (
          <HistoryTab userId={userProfile.id} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab userProfile={userProfile} onProfileUpdated={onProfileUpdated} />
        )}
      </div>
    </div>
  );
}
