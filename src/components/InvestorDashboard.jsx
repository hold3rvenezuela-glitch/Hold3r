import React, { useState } from 'react';
import { 
  Building2, 
  Truck, 
  TrendingUp, 
  DollarSign, 
  ExternalLink, 
  Search, 
  Filter, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Sparkles,
  PieChart
} from 'lucide-react';

export default function InvestorDashboard({ 
  assets, 
  userWallet, 
  onSelectInvestAsset, 
  onOpenAuth,
  isLoggedIn 
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrado dinámico de activos
  const filteredAssets = assets.filter(asset => {
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Estadísticas globales del Dashboard
  const totalValuation = assets.reduce((acc, curr) => acc + Number(curr.total_valuation || 0), 0);
  const totalFunded = assets.reduce((acc, curr) => acc + Number(curr.funded_amount || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Hero Header Institucional Limpio */}
      <div className="relative overflow-hidden glass-panel p-8 sm:p-12 border border-white/10">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Tokenización RWA Institucional
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            El mundo real, <span className="text-emerald-400">tokenizado para ti</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 font-normal leading-relaxed">
            Participación fraccionada en bienes raíces, maquinaria pesada y flotas de vehículos con respaldo legal auditado.
          </p>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="bg-neutral-900/80 p-4 rounded-2xl border border-white/5">
              <span className="text-xs text-neutral-400 font-medium block mb-1">Valoración Total RWA</span>
              <span className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                ${totalValuation.toLocaleString('en-US')} USDT
              </span>
            </div>

            <div className="bg-neutral-900/80 p-4 rounded-2xl border border-white/5">
              <span className="text-xs text-neutral-400 font-medium block mb-1">Total Fondeado</span>
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
                ${totalFunded.toLocaleString('en-US')} USDT
              </span>
            </div>

            <div className="bg-neutral-900/80 p-4 rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
              <span className="text-xs text-neutral-400 font-medium block mb-1">Retorno Estimado Prom.</span>
              <span className="text-xl sm:text-2xl font-extrabold text-neutral-200 font-mono">
                12.5% - 16.0% APR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 glass-panel p-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por activo, ubicación o especificación..."
            className="w-full bg-neutral-900/80 border border-white/10 focus:border-emerald-500 text-white rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {[
            { id: 'all', label: 'Todos los Activos' },
            { id: 'real_estate', label: '🏢 Bienes Raíces' },
            { id: 'heavy_machinery', label: '🚜 Maquinaria' },
            { id: 'fleet', label: '🚚 Vehículos' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-neutral-900/80 text-neutral-400 hover:text-white border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Cards Grid */}
      {filteredAssets.length === 0 ? (
        <div className="glass-panel p-12 text-center space-y-3">
          <Building2 className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No se encontraron activos</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Prueba ajustando el término de búsqueda o cambiando la categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map(asset => {
            const valuation = Number(asset.total_valuation);
            const funded = Number(asset.funded_amount);
            const percent = valuation > 0 ? Math.min(100, Math.round((funded / valuation) * 100)) : 0;
            const remaining = Math.max(0, valuation - funded);
            const firstImg = Array.isArray(asset.images) && asset.images.length > 0
              ? asset.images[0]
              : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80';

            return (
              <div 
                key={asset.id}
                className="glass-panel glass-panel-hover overflow-hidden flex flex-col group border border-white/10"
              >
                {/* Image & Badges Overlay */}
                <div className="relative h-52 w-full overflow-hidden bg-neutral-900">
                  <img 
                    src={firstImg} 
                    alt={asset.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-85" />

                  {/* Category & Status Pills */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`badge-category badge-${asset.category}`}>
                      {asset.category === 'real_estate' ? 'Bienes Raíces' : asset.category === 'heavy_machinery' ? 'Maquinaria' : 'Vehículos'}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className={`badge-category badge-status-${asset.status}`}>
                      {asset.status === 'funding' ? 'Fondeando' : asset.status === 'active_rent' ? 'Renta Activa' : 'Vendido'}
                    </span>
                  </div>

                  {/* Valuation Tag */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Valoración Total</span>
                      <span className="text-lg font-bold text-white font-mono">
                        ${valuation.toLocaleString('en-US')} USDT
                      </span>
                    </div>
                    {asset.legal_contract_url && (
                      <a 
                        href={asset.legal_contract_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-neutral-900/80 hover:bg-neutral-900 text-neutral-300 hover:text-white p-2 rounded-xl border border-white/15 transition-colors"
                        title="Ver Contrato Legal Auditado"
                      >
                        <ExternalLink className="w-4 h-4 text-emerald-400" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {asset.title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 mt-1 font-normal leading-relaxed">
                      {asset.description}
                    </p>
                  </div>

                  {/* Funding Progress */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-neutral-400">Progreso de Fondeo</span>
                      <span className="text-emerald-400 font-mono font-bold">{percent}%</span>
                    </div>

                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                      <span>Recolectado: <strong>${funded.toLocaleString()} USDT</strong></span>
                      <span>Restante: <strong>${remaining.toLocaleString()} USDT</strong></span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        onOpenAuth();
                      } else {
                        onSelectInvestAsset(asset);
                      }
                    }}
                    disabled={asset.status === 'sold'}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      asset.status === 'sold'
                        ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5'
                        : 'btn-primary'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    {asset.status === 'sold' ? 'Activo Vendido' : 'Invertir en Fracción'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
