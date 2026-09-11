import React, { useState, useEffect } from 'react';
import {
  Vote, CheckCircle2, XCircle, Plus, Clock, ShoppingCart,
  RefreshCw, ShieldCheck, BarChart2, AlertTriangle
} from 'lucide-react';
import {
  fetchProposals, castVote, createProposal,
  fetchGovernanceMarketOrders, buyMarketplaceOrderInternal
} from '../services/api';

export default function GovernanceView({ userProfile, assets }) {
  const [proposals, setProposals]           = useState([]);
  const [votingPower, setVotingPower]        = useState(0);
  const [hasAccess, setHasAccess]            = useState(false);
  const [governanceOrders, setGovernanceOrders] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [loadingOrders, setLoadingOrders]   = useState(true);
  const [buyingOrderId, setBuyingOrderId]   = useState(null);
  const [showNewModal, setShowNewModal]     = useState(false);
  const [votingId, setVotingId]             = useState(null);

  // Form state
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [proposalTitle, setProposalTitle]     = useState('');
  const [proposalDesc, setProposalDesc]       = useState('');
  const [submitting, setSubmitting]           = useState(false);

  const isAdmin = userProfile?.role === 'admin';

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadGovernanceOrders = async () => {
    setLoadingOrders(true);
    try {
      const orders = await fetchGovernanceMarketOrders(
        userProfile?.id,
        userProfile?.role || 'investor'
      );
      setGovernanceOrders(orders);
    } catch (err) {
      console.error('Error al cargar ofertas de tanteo:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadProposals = async () => {
    setLoading(true);
    try {
      const result = await fetchProposals(userProfile?.id, userProfile?.role || 'investor');
      setProposals(result.proposals);
      setVotingPower(result.votingPower);
      setHasAccess(result.hasAccess || isAdmin);
    } catch (err) {
      console.error('Error al cargar propuestas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
    loadGovernanceOrders();
  }, [userProfile?.id]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleBuyInternal = async (orderId) => {
    if (!userProfile?.id) {
      alert('Debes iniciar sesión como socio o administrador.');
      return;
    }
    setBuyingOrderId(orderId);
    try {
      await buyMarketplaceOrderInternal({ orderId, buyerId: userProfile.id });
      alert('¡Compra completada! Los tokens fueron transferidos desde la Bóveda Escrow a tu wallet.');
      loadGovernanceOrders();
    } catch (err) {
      alert(err.message || 'Error al procesar la compra interna.');
    } finally {
      setBuyingOrderId(null);
    }
  };

  const handleVote = async (proposalId, voteChoice) => {
    if (!userProfile?.id) {
      alert('Debes iniciar sesión para votar.');
      return;
    }
    if (!hasAccess && !isAdmin) {
      alert('No posees fracciones activas. Solo los Socios con tenencia de acciones pueden votar.');
      return;
    }
    setVotingId(proposalId + voteChoice);
    try {
      const result = await castVote({ proposalId, userId: userProfile.id, voteChoice });
      // Refrescar propuestas para actualizar barras de votación
      await loadProposals();
      alert(`✅ Voto registrado con un poder de ${Number(result.voting_power || votingPower).toFixed(4)}% de participación.`);
    } catch (err) {
      alert(err.message || 'Error al registrar el voto.');
    } finally {
      setVotingId(null);
    }
  };

  const handleCreateProposalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssetId || !proposalTitle || !proposalDesc) return;
    setSubmitting(true);
    try {
      await createProposal({ assetId: selectedAssetId, title: proposalTitle, description: proposalDesc });
      setShowNewModal(false);
      setProposalTitle('');
      setProposalDesc('');
      loadProposals();
    } catch (err) {
      alert(err.message || 'Error al crear la propuesta.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers de cálculo ponderado ──────────────────────────────────────────
  /**
   * Calcula los porcentajes de votación basados en el PESO (shares_percentage)
   * en lugar del conteo simple de votos.
   */
  const getWeightedResults = (votesList = []) => {
    const yesPower = votesList
      .filter(v => v.vote === 'yes')
      .reduce((acc, v) => acc + Number(v.weight || 0), 0);
    const noPower = votesList
      .filter(v => v.vote === 'no')
      .reduce((acc, v) => acc + Number(v.weight || 0), 0);
    const totalPower = yesPower + noPower;
    const yesPercent = totalPower > 0 ? Math.round((yesPower / totalPower) * 100) : 0;
    return { yesPower, noPower, totalPower, yesPercent, noPercent: 100 - yesPercent };
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in pb-16">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Vote className="w-5 h-5 text-indigo-400" />
            <h2 className="text-2xl font-black text-white">Gobernanza Web3 HOLD3R</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Decisiones comunitarias descentralizadas para los titulares de fracciones de activos RWA.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge de Poder de Voto */}
          {userProfile && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
              votingPower > 0
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-500'
            }`}>
              <BarChart2 className="w-3.5 h-3.5" />
              Poder de Voto: {votingPower > 0 ? `${Number(votingPower).toFixed(4)}%` : '0%'}
            </div>
          )}

          {/* Crear Propuesta — solo socios con tenencia o admins */}
          {userProfile && (hasAccess || isAdmin) && (
            <button
              onClick={() => {
                if (assets.length > 0) setSelectedAssetId(assets[0].id);
                setShowNewModal(true);
              }}
              className="btn-primary text-xs shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Crear Propuesta
            </button>
          )}
        </div>
      </div>

      {/* ── DERECHO DE TANTEO 48H ──────────────────────────────────────── */}
      <div className="p-6 rounded-2xl space-y-4 animate-fade-in" style={{ background: '#0e1714', border: '1px solid rgba(0,255,136,0.2)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">Derecho de Tanteo (Ofertas Internas 48 Horas)</h3>
              <p className="text-xs text-neutral-400">
                Fracciones en Bóveda Escrow reservadas exclusivamente para Socios y Administradores.
              </p>
            </div>
          </div>
          <button onClick={loadGovernanceOrders} className="btn-secondary text-[11px] py-1 px-3 flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loadingOrders ? 'animate-spin' : ''}`} /> Refrescar
          </button>
        </div>

        {loadingOrders ? (
          <p className="text-xs font-mono text-neutral-400 py-4 text-center">Cargando órdenes en bóveda...</p>
        ) : governanceOrders.filter(o => o.status === 'IN_REVIEW_GOVERNANCE' && o.seller_id !== userProfile?.id).length === 0 ? (
          <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-400">
            No hay solicitudes de reventa en periodo de tanteo de 48 horas actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {governanceOrders
              .filter(o => o.status === 'IN_REVIEW_GOVERNANCE' && o.seller_id !== userProfile?.id)
              .map(ord => {
                const expiresAt    = new Date(ord.governance_expires_at);
                const remainingMs  = Math.max(0, expiresAt.getTime() - Date.now());
                const remainingHrs = Math.floor(remainingMs / (1000 * 60 * 60));
                const remainingMin = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

                return (
                  <div key={ord.id} className="p-4 rounded-xl bg-neutral-900 border border-emerald-500/30 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Bóveda Escrow #48H
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Expiración: {remainingHrs}h {remainingMin}m
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{ord.asset?.title || 'Activo RWA'}</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Vendedor: <strong className="text-neutral-200">{ord.seller?.full_name}</strong> ({ord.seller?.document_id})
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Participación</span>
                        <span className="text-white font-bold">{Number(ord.shares_percentage).toFixed(4)}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block">Precio Solicitado</span>
                        <span className="text-emerald-400 font-extrabold">${Number(ord.price_usdt).toLocaleString()} USDT</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuyInternal(ord.id)}
                      disabled={buyingOrderId === ord.id}
                      className="w-full btn-primary bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 text-xs flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {buyingOrderId === ord.id ? 'Ejecutando Compra Interna...' : 'Ejercer Derecho de Tanteo (Comprar)'}
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ── PROPUESTAS DE GOBERNANZA ───────────────────────────────────── */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-neutral-400 text-xs font-mono">
          Cargando propuestas de gobernanza...
        </div>

      ) : !hasAccess && !isAdmin ? (
        /* Bloqueo para inversores sin tenencia */
        <div className="glass-panel p-10 text-center space-y-4 border border-amber-500/20">
          <ShieldCheck className="w-14 h-14 text-amber-500/50 mx-auto" />
          <h3 className="text-lg font-bold text-white">Acceso Restringido — Solo Socios</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            La sección de Gobernanza está reservada para los titulares de fracciones RWA.
            Para participar en votaciones y propuestas, debes poseer al menos una fracción activa de cualquier activo.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
            <AlertTriangle className="w-4 h-4" />
            Aún no posees fracciones participativas
          </div>
        </div>

      ) : proposals.length === 0 ? (
        <div className="glass-panel p-12 text-center space-y-3">
          <Vote className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No hay propuestas activas en este momento</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Las propuestas permiten a los inversores votar mejoras, renovación de alquileres o venta de activos.
          </p>
        </div>

      ) : (
        <div className="space-y-4">
          {proposals.map(prop => {
            const asset      = prop.asset || {};
            const votesList  = prop.votes || [];
            const { yesPower, noPower, totalPower, yesPercent, noPercent } = getWeightedResults(votesList);
            const userVoted  = votesList.find(v => v.user_id === userProfile?.id);
            const totalCount = votesList.length;

            return (
              <div key={prop.id} className="glass-panel p-6 border border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                      Activo: {asset.title || 'General RWA'}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1.5">{prop.title}</h3>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{prop.description}</p>
                  </div>
                  <span className={`badge-category ${prop.status === 'active' ? 'badge-status-funding' : 'badge-status-sold'}`}>
                    {prop.status === 'active' ? 'Votación Abierta' : prop.status}
                  </span>
                </div>

                {/* Barra de votos PONDERADA */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-400 font-mono">
                      A Favor: {yesPower.toFixed(4)}% de poder ({yesPercent}%)
                    </span>
                    <span className="text-rose-400 font-mono">
                      En Contra: {noPower.toFixed(4)}% de poder ({noPercent}%)
                    </span>
                  </div>
                  <div className="progress-bar-bg flex overflow-hidden rounded-full">
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${yesPercent}%` }} />
                    <div className="bg-rose-500 h-full transition-all" style={{ width: `${noPercent}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>Poder total emitido: {totalPower.toFixed(4)}%</span>
                    <span>{totalCount} voto{totalCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Acciones de voto */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500">
                    <BarChart2 className="w-3 h-3 text-indigo-400" />
                    Tu poder: <strong className="text-indigo-300">{Number(votingPower).toFixed(4)}%</strong>
                  </div>

                  {userVoted ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                      Tu voto: <span className="uppercase font-mono">{userVoted.vote}</span>
                      <span className="text-cyan-500 font-mono">({Number(userVoted.weight || 0).toFixed(4)}%)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(prop.id, 'yes')}
                        disabled={!!votingId || (!hasAccess && !isAdmin)}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {votingId === prop.id + 'yes' ? 'Registrando...' : 'Votar A Favor'}
                      </button>
                      <button
                        onClick={() => handleVote(prop.id, 'no')}
                        disabled={!!votingId || (!hasAccess && !isAdmin)}
                        className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        {votingId === prop.id + 'no' ? 'Registrando...' : 'Votar En Contra'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Nueva Propuesta ──────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 border border-indigo-500/40 shadow-2xl relative">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-xl font-bold"
            >✕</button>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Vote className="w-5 h-5 text-indigo-400" />
              Nueva Propuesta de Gobernanza
            </h3>

            <form onSubmit={handleCreateProposalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Activo Asociado:</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/15 text-white rounded-xl p-2.5 text-xs outline-none"
                >
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Título de la Propuesta:</label>
                <input
                  type="text"
                  required
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  placeholder="Ej. Renovación de contrato de alquiler 2027"
                  className="w-full bg-neutral-900 border border-white/15 text-white rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Descripción / Términos:</label>
                <textarea
                  required
                  rows={4}
                  value={proposalDesc}
                  onChange={(e) => setProposalDesc(e.target.value)}
                  placeholder="Explica los detalles de la propuesta para la comunidad de holders..."
                  className="w-full bg-neutral-900 border border-white/15 text-white rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="btn-secondary text-xs">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs shadow-indigo-500/20">
                  {submitting ? 'Publicando...' : 'Publicar Propuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
