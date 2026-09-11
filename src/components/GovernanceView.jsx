import React, { useState, useEffect } from 'react';
import { Vote, CheckCircle2, XCircle, Plus, Sparkles, MessageSquare, AlertCircle, Clock, ShieldCheck, ShoppingCart, DollarSign, RefreshCw } from 'lucide-react';
import { fetchProposals, castVote, createProposal, fetchGovernanceMarketOrders, buyMarketplaceOrderInternal } from '../services/api';

export default function GovernanceView({ userProfile, assets }) {
  const [proposals, setProposals] = useState([]);
  const [governanceOrders, setGovernanceOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [buyingOrderId, setBuyingOrderId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form State
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadGovernanceOrders = async () => {
    setLoadingOrders(true);
    try {
      const orders = await fetchGovernanceMarketOrders(userProfile?.id, userProfile?.role || 'investor');
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
      const data = await fetchProposals();
      setProposals(data);
    } catch (err) {
      console.error('Error al cargar propuestas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
    loadGovernanceOrders();
  }, []);

  const handleBuyInternal = async (orderId) => {
    if (!userProfile?.id) {
      alert('Debes iniciar sesión como socio o administrador.');
      return;
    }
    setBuyingOrderId(orderId);
    try {
      await buyMarketplaceOrderInternal({ orderId, buyerId: userProfile.id });
      alert('¡Compra de la oferta interna completada con éxito! Los tokens fueron transferidos desde la Bóveda Escrow a tu wallet.');
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
    try {
      await castVote({
        proposalId,
        userId: userProfile.id,
        voteChoice,
        weight: 1.0
      });
      loadProposals();
    } catch (err) {
      alert(err.message || 'Error al registrar el voto.');
    }
  };

  const handleCreateProposalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssetId || !proposalTitle || !proposalDesc) return;
    setSubmitting(true);
    try {
      await createProposal({
        assetId: selectedAssetId,
        title: proposalTitle,
        description: proposalDesc
      });
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

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header */}
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

        {userProfile && (
          <button
            onClick={() => {
              if (assets.length > 0) setSelectedAssetId(assets[0].id);
              setShowNewModal(true);
            }}
            className="btn-primary text-xs shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Crear Propuesta de Votación
          </button>
        )}
      </div>

      {/* ── SECCIÓN GOBERNANZA: DERECHO DE TANTEO 48H (OFERTAS INTERNAS) ── */}
      <div className="p-6 rounded-2xl space-y-4 animate-fade-in" style={{ background: '#0e1714', border: '1px solid rgba(0,255,136,0.2)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">Derecho de Tanteo (Ofertas Internas 48 Horas)</h3>
              <p className="text-xs text-neutral-400">
                Fracciones en Bóveda Escrow reservadas exclusivamente para adquisición por Socios y Administradores.
              </p>
            </div>
          </div>
          <button onClick={loadGovernanceOrders} className="btn-secondary text-[11px] py-1 px-3 flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loadingOrders ? 'animate-spin' : ''}`} /> Refrescar
          </button>
        </div>

        {loadingOrders ? (
          <p className="text-xs font-mono text-neutral-400 py-4 text-center">Cargando órdenes en bóveda...</p>
        ) : governanceOrders.filter(o => o.status === 'IN_REVIEW_GOVERNANCE').length === 0 ? (
          <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-400">
            No hay solicitudes de reventa en periodo de tanteo de 48 horas actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {governanceOrders.filter(o => o.status === 'IN_REVIEW_GOVERNANCE').map(ord => {
              const expiresAt = new Date(ord.governance_expires_at);
              const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());
              const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
              const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

              return (
                <div key={ord.id} className="p-4 rounded-xl bg-neutral-900 border border-emerald-500/30 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Bóveda Escrow #48H
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Expiración: {remainingHours}h {remainingMins}m
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

      {/* Proposals List */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-neutral-400 text-xs font-mono">
          Cargando propuestas de gobernanza...
        </div>
      ) : proposals.length === 0 ? (
        <div className="glass-panel p-12 text-center space-y-3">
          <Vote className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No hay propuestas activas en este momento</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Las propuestas permiten a los inversionistas votar mejoras, renovación de alquileres o venta de activos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map(prop => {
            const asset = prop.asset || {};
            const votesList = prop.votes || [];
            const yesVotes = votesList.filter(v => v.vote === 'yes').length;
            const noVotes = votesList.filter(v => v.vote === 'no').length;
            const totalVotes = yesVotes + noVotes;
            const yesPercent = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;

            const userVoted = votesList.find(v => v.user_id === userProfile?.id);

            return (
              <div 
                key={prop.id}
                className="glass-panel p-6 border border-white/10 space-y-4"
              >
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

                {/* Progress bar of votes */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-400 font-mono">A Favor: {yesVotes} ({yesPercent}%)</span>
                    <span className="text-rose-400 font-mono">En Contra: {noVotes} ({100 - yesPercent}%)</span>
                  </div>
                  <div className="progress-bar-bg flex">
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${yesPercent}%` }} />
                    <div className="bg-rose-500 h-full transition-all" style={{ width: `${100 - yesPercent}%` }} />
                  </div>
                </div>

                {/* Voting Actions */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-neutral-400 font-mono">
                    Total de Votos: <strong>{totalVotes}</strong>
                  </span>

                  {userVoted ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                      Tu voto registrado: <span className="uppercase font-mono">{userVoted.vote}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(prop.id, 'yes')}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Votar A Favor
                      </button>
                      <button
                        onClick={() => handleVote(prop.id, 'no')}
                        className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" /> Votar En Contra
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Proposal Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 border border-indigo-500/40 shadow-2xl relative">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Vote className="w-5 h-5 text-indigo-400" />
              Nueva Propuesta de Gobernanza
            </h3>

            <form onSubmit={handleCreateProposalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Activo Asociado:
                </label>
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
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Título de la Propuesta:
                </label>
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
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Descripción / Términos de la Propuesta:
                </label>
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
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs shadow-indigo-500/20"
                >
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
