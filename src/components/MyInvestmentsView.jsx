import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, DollarSign, Calendar, ExternalLink, RefreshCw, FileText } from 'lucide-react';
import { fetchUserShares } from '../services/api';

export default function MyInvestmentsView({ userProfile, initialShares = [], onRefresh }) {
  const [shares, setShares] = useState(initialShares);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialShares && initialShares.length > 0) {
      setShares(initialShares);
    } else {
      loadShares();
    }
  }, [initialShares, userProfile?.id]);

  const loadShares = async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const data = await fetchUserShares(userProfile.id);
      if (data && data.length > 0) {
        setShares(data);
      }
    } catch (err) {
      console.error('Error al cargar portafolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    loadShares();
    if (onRefresh) onRefresh();
  };

  const totalInvested = shares.reduce((acc, curr) => acc + Number(curr.amount_invested_usdt || 0), 0);
  const totalAssetsCount = shares.length;
  const projectedMonthlyYield = (totalInvested * 0.142) / 12; // 14.2% APR promedio

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-2xl font-black text-white">Mi Portafolio de Inversión</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Resumen consolidado de tus fracciones de activos (RWA) y hashes de contratos firmados.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          className="btn-secondary text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Portafolio
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-5 border border-emerald-500/30">
          <span className="text-xs text-neutral-400 font-medium block mb-1">Total Invertido en RWA</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
          </span>
        </div>

        <div className="glass-panel p-5 border border-cyan-500/30">
          <span className="text-xs text-neutral-400 font-medium block mb-1">Activos Fraccionados Poseídos</span>
          <span className="text-2xl font-black text-cyan-300 font-mono">
            {totalAssetsCount} {totalAssetsCount === 1 ? 'Activo' : 'Activos'}
          </span>
        </div>

        <div className="glass-panel p-5 border border-indigo-500/30">
          <span className="text-xs text-neutral-400 font-medium block mb-1">Rendimiento Mensual Estimado</span>
          <span className="text-2xl font-black text-indigo-300 font-mono">
            +${projectedMonthlyYield.toFixed(2)} USDT / mes
          </span>
        </div>
      </div>

      {/* Investments List */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-neutral-400 text-xs font-mono">
          Cargando portafolio de activos fraccionados...
        </div>
      ) : shares.length === 0 ? (
        <div className="glass-panel p-12 text-center space-y-4">
          <Layers className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Aún no posees fracciones de activos</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Explora los activos disponibles en el catálogo e invierte desde $10 USDT para comenzar a generar retornos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shares.map((share, idx) => {
            const asset = share.asset || {};
            const firstImg = Array.isArray(asset.images) && asset.images.length > 0
              ? asset.images[0]
              : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80';

            return (
              <div 
                key={share.id || `share-${idx}`}
                className="glass-panel p-5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-emerald-500/40 transition-colors"
              >
                {/* Left: Asset info */}
                <div className="flex items-center gap-4">
                  <img 
                    src={firstImg} 
                    alt={asset.title || 'Activo RWA'} 
                    className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0 bg-neutral-900"
                  />
                  <div className="space-y-1">
                    <span className={`badge-category badge-${asset.category || 'real_estate'}`}>
                      {asset.category === 'real_estate' ? 'Bienes Raíces' : asset.category === 'heavy_machinery' ? 'Maquinaria' : 'Vehículos'}
                    </span>
                    <h4 className="text-base font-bold text-white">{asset.title || 'Activo Tokenizado RWA'}</h4>
                    <p className="text-xs text-neutral-400 font-mono">
                      Adquirido el: {share.purchased_at ? new Date(share.purchased_at).toLocaleDateString('es-VE') : 'Hoy'}
                    </p>
                  </div>
                </div>

                {/* Center: Share stats */}
                <div className="grid grid-cols-2 gap-4 bg-neutral-900/60 p-3 rounded-xl border border-white/5 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Monto Invertido:</span>
                    <strong className="font-mono text-emerald-400 text-sm">
                      ${Number(share.amount_invested_usdt || 0).toLocaleString()} USDT
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Participación:</span>
                    <strong className="font-mono text-cyan-300 text-sm">
                      {Number(share.shares_percentage || 0).toFixed(4)}%
                    </strong>
                  </div>
                </div>

                {/* Right: Contract Hash & Action */}
                <div className="w-full md:w-auto text-right space-y-1">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">
                    Hash de Contrato Web3
                  </span>
                  <div className="bg-neutral-900 border border-white/10 p-2 rounded-xl text-[10px] font-mono text-emerald-300 truncate max-w-xs inline-block">
                    {share.signed_contract_hash || '0x7f8a...31b'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
