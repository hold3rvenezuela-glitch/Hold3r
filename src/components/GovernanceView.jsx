import React, { useState, useEffect, useRef } from 'react';
import {
  Vote, CheckCircle2, XCircle, Plus, Clock, ShoppingCart,
  RefreshCw, ShieldCheck, BarChart2, AlertTriangle, Bell, Trophy, Minus,
  Trash2, Edit3
} from 'lucide-react';
import {
  fetchProposals, castVote, createProposal, deleteProposal, updateProposal,
  fetchGovernanceMarketOrders, buyMarketplaceOrderInternal,
  closeExpiredProposals, fetchGovernanceNotifications, markGovernanceNotificationsRead
} from '../services/api';
import { supabase } from '../../lib/supabase';

export default function GovernanceView({ userProfile, assets }) {
  const [proposals, setProposals]               = useState([]);
  const [votingPower, setVotingPower]            = useState(0);
  const [byAssetPower, setByAssetPower]          = useState({});
  const [hasAccess, setHasAccess]                = useState(false);
  const [governanceOrders, setGovernanceOrders]  = useState([]);
  const [loading, setLoading]                    = useState(true);
  const [loadingOrders, setLoadingOrders]        = useState(true);
  const [buyingOrderId, setBuyingOrderId]        = useState(null);
  const [showNewModal, setShowNewModal]          = useState(false);
  const [votingId, setVotingId]                  = useState(null);
  const [notifications, setNotifications]        = useState([]);
  const [showNotifPanel, setShowNotifPanel]      = useState(false);
  const realtimeChannelRef                       = useRef(null);

  // Form state
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [proposalTitle, setProposalTitle]     = useState('');
  const [proposalDesc, setProposalDesc]       = useState('');
  const [submitting, setSubmitting]           = useState(false);

  const isAdmin = userProfile?.role === 'admin';
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Assets donde el usuario tiene acciones (para el modal de nueva propuesta)
  const assetsWithShares = isAdmin
    ? assets
    : assets.filter(a => (byAssetPower[a.id] || 0) > 0);

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
      // Cerrar propuestas expiradas antes de cargar (fallback cuando pg_cron no está activo)
      await closeExpiredProposals();

      const result = await fetchProposals(userProfile?.id, userProfile?.role || 'investor');
      setProposals(result.proposals);
      setVotingPower(result.votingPower);
      setByAssetPower(result.proposals.reduce((acc, p) => {
        acc[p.asset_id] = p.userVotingPower || 0;
        return acc;
      }, {}));
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

    // Cargar notificaciones del usuario
    if (userProfile?.id) {
      fetchGovernanceNotifications(userProfile.id).then(setNotifications);

      // Suscripción Realtime para nuevas notificaciones (push in-app)
      const channel = supabase
        .channel(`gov-notif-${userProfile.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'governance_notifications',
          filter: `user_id=eq.${userProfile.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
        })
        .subscribe();

      realtimeChannelRef.current = channel;
    }

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
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

  const handleVote = async (proposalId, voteChoice, propUserPower) => {
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
      await loadProposals();
      const power = Number(result.voting_power ?? propUserPower ?? votingPower);
      alert(`✅ Voto registrado con un poder de ${power.toFixed(4)}% de participación en este activo.`);
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

  const handleDeleteProposal = async (proposalId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta propuesta durante tu ventana de gracia (5m)?')) {
      return;
    }
    try {
      await deleteProposal({ proposalId, userId: userProfile.id });
      alert('Propuesta eliminada correctamente.');
      loadProposals();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar la propuesta.');
    }
  };

  const handleEditProposal = async (prop) => {
    const newTitle = window.prompt('Editar título de la propuesta:', prop.title);
    if (!newTitle) return;
    const newDesc = window.prompt('Editar descripción de la propuesta:', prop.description);
    if (!newDesc) return;

    try {
      await updateProposal({
        proposalId: prop.id,
        userId: userProfile.id,
        title: newTitle,
        description: newDesc
      });
      alert('Propuesta actualizada correctamente.');
      loadProposals();
    } catch (err) {
      alert(err.message || 'No se pudo editar la propuesta.');
    }
  };

  // Abrir modal con el primer activo donde el usuario tiene acciones
  const openNewProposalModal = () => {
    const first = assetsWithShares[0];
    if (first) setSelectedAssetId(first.id);
    setShowNewModal(true);
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

  // Retorna el tiempo restante de votación de una propuesta (legible)
  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return { expired: true, label: 'Expirada' };
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, label: h > 0 ? `${h}h ${m}m restantes` : `${m}m restantes` };
  };

  const getRemainingLabel = (expiresAt) => {
    const timeInfo = getTimeRemaining(expiresAt);
    return timeInfo ? timeInfo.label : 'Sin expiración';
  };

  // Handler para marcar notificaciones como leídas y abrir panel
  const handleOpenNotifPanel = async () => {
    setShowNotifPanel(v => !v);
    if (!showNotifPanel && unreadCount > 0) {
      await markGovernanceNotificationsRead(userProfile?.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
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

          {/* Campana de Notificaciones */}
          {userProfile && (
            <div className="relative">
              <button
                onClick={handleOpenNotifPanel}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-neutral-300 transition-all"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Panel desplegable de notificaciones */}
              {showNotifPanel && (
                <div className="absolute right-0 top-10 z-50 w-80 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl animate-fade-in">
                  <div className="p-3 border-b border-white/10">
                    <h4 className="text-xs font-bold text-white">Notificaciones de Gobernanza</h4>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-500">Sin notificaciones recientes.</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 border-b border-white/5 text-xs ${
                        n.is_read ? 'text-neutral-500' : 'text-neutral-200 bg-indigo-500/5'
                      }`}>
                        <p className="font-semibold mb-0.5">{n.asset?.title || 'Activo RWA'}</p>
                        <p className="leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-neutral-600 mt-1 font-mono">
                          {new Date(n.created_at).toLocaleString('es-VE')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Crear Propuesta — solo socios con tenencia o admins */}
          {userProfile && (hasAccess || isAdmin) && assetsWithShares.length > 0 && (
            <button
              onClick={openNewProposalModal}
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
            const propPower  = Number(prop.userVotingPower || 0);  // poder específico del usuario en ESTE activo
            const { yesPower, noPower, totalPower, yesPercent, noPercent } = getWeightedResults(votesList);
            const userVoted  = votesList.find(v => v.user_id === userProfile?.id);
            const totalCount = votesList.length;
            const canVote    = isAdmin || propPower > 0;
            const isClosed   = prop.status !== 'active' || (prop.expires_at && new Date(prop.expires_at) < new Date());
            const winner     = yesPower > noPower ? 'approved' : noPower > yesPower ? 'rejected' : 'tie';
            const isCreator  = prop.created_by ? prop.created_by === userProfile?.id : true;
            const createdMs  = prop.created_at ? new Date(prop.created_at).getTime() : Date.now();
            const inGracePeriod = (Date.now() - createdMs) <= 5 * 60 * 1000;

            return (
              <div key={prop.id} className="glass-panel p-6 border border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                        Activo: {asset.title || 'General RWA'}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                        isClosed ? 'bg-neutral-800 text-neutral-400 border-neutral-700' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {getRemainingLabel(prop.expires_at)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1.5">{prop.title}</h3>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{prop.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Botones de acción para ventana de gracia de 5 minutos */}
                    {isCreator && totalCount === 0 && inGracePeriod && !isClosed && (
                      <div className="flex items-center gap-1.5 mr-2">
                        <button
                          onClick={() => handleEditProposal(prop)}
                          className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 border border-indigo-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                          title="Editar propuesta (Ventana de gracia de 5m)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProposal(prop.id)}
                          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                          title="Eliminar propuesta (Ventana de gracia de 5m)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>
                      </div>
                    )}
                    <span className={`badge-category ${
                      isClosed
                        ? winner === 'approved' ? 'badge-status-active bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : winner === 'rejected' ? 'badge-status-sold bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-neutral-700 text-neutral-300 border-neutral-600'
                        : 'badge-status-funding'
                    }`}>
                      {isClosed
                        ? winner === 'approved' ? ' Aprobada' : winner === 'rejected' ? ' Rechazada' : ' Empate (Cerrada)'
                        : 'Votación Abierta'}
                    </span>
                  </div>
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
                    Tu poder en este activo: <strong className="text-indigo-300">{propPower.toFixed(4)}%</strong>
                  </div>

                  {isClosed ? (
                    <div className="text-xs font-mono font-bold text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-700">
                      Votación Finalizada
                    </div>
                  ) : userVoted ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                      Tu voto: <span className="uppercase font-mono">{userVoted.vote}</span>
                      <span className="text-cyan-500 font-mono">({Number(userVoted.weight || 0).toFixed(4)}%)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(prop.id, 'yes', propPower)}
                        disabled={!!votingId || !canVote}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        {votingId === prop.id + 'yes' ? 'Registrando...' : 'Votar A Favor'}
                      </button>
                      <button
                        onClick={() => handleVote(prop.id, 'no', propPower)}
                        disabled={!!votingId || !canVote}
                        className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4 text-rose-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-panel w-full max-w-lg p-6 border border-indigo-500/40 shadow-2xl relative max-h-[90vh] overflow-y-auto my-auto">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-xl font-bold z-10"
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
                  {assetsWithShares.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.title} {byAssetPower[a.id] ? `(Tu participación: ${Number(byAssetPower[a.id]).toFixed(4)}%)` : ''}
                    </option>
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
