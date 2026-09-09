import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, UserCheck, ExternalLink, Lock, CheckCircle, Award, PieChart, Layers, Building2, Copy, Check } from 'lucide-react';
import { searchPublicContractHash, searchPublicUserPortfolio } from '../services/api';

export default function PublicExplorerView() {
  const [searchMode, setSearchMode] = useState('hash'); // 'hash' | 'nickname'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hashResult, setHashResult] = useState(null);
  const [portfolioResult, setPortfolioResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setSearched(true);
    setHashResult(null);
    setPortfolioResult(null);

    try {
      if (searchMode === 'hash') {
        const res = await searchPublicContractHash(cleanQuery);
        setHashResult(res);
      } else {
        const res = await searchPublicUserPortfolio(cleanQuery);
        setPortfolioResult(res);
      }
    } catch (err) {
      console.error('Error en búsqueda pública:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header Banner */}
      <div 
        className="p-6 sm:p-8 rounded-2xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6"
        style={{ 
          background: 'linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(17,23,21,0.95) 100%)',
          border: '1px solid rgba(0,255,136,0.25)' 
        }}
      >
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider" style={{ background: 'rgba(0,255,136,0.15)', color: '#00FF88' }}>
            <ShieldCheck className="w-3.5 h-3.5" />
            Transparencia Pública Blockchain & Resguardo KYC
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Buscador Público de Contratos y Portafolios
          </h1>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Verifica la autenticidad e inmutabilidad de cualquier adquisición RWA en la Binance Smart Chain (BSC) o consulta el portafolio consolidado por apodo, protegiendo 100% la identidad legal del usuario.
          </p>
        </div>

        <div className="flex flex-col items-center sm:items-end gap-1 font-mono text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
            <Lock className="w-4 h-4" />
            <span>Nombres Reales Encriptados</span>
          </div>
          <span className="text-[10px] text-neutral-400">Acceso libre sin registro</span>
        </div>
      </div>

      {/* Control Box: Search Selector + Input */}
      <div 
        className="p-5 rounded-2xl space-y-4"
        style={{ background: '#111715', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 p-1 rounded-xl bg-neutral-900/80 border border-neutral-800 max-w-md">
          <button
            type="button"
            onClick={() => { setSearchMode('hash'); setQuery(''); setSearched(false); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              searchMode === 'hash' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Buscar por Hash Web3
          </button>
          <button
            type="button"
            onClick={() => { setSearchMode('nickname'); setQuery(''); setSearched(false); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              searchMode === 'nickname' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Buscar por @Apodo
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-neutral-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchMode === 'hash'
                  ? 'Introduce el Signed Contract Hash (ej. 0x892a0134F47...)'
                  : 'Introduce el apodo del usuario (ej. @inversor_pro)'
              }
              className="w-full py-3 pl-11 pr-4 text-xs font-mono rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="btn-primary py-3 px-6 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Consultando Node BSC...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Verificar Transparencia</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {searched && (
        <div className="space-y-6">
          {/* Option A: Contract Hash Result */}
          {searchMode === 'hash' && (
            hashResult ? (
              <div 
                className="p-6 rounded-2xl space-y-5 animate-scale-up"
                style={{ background: '#111715', border: '1px solid rgba(0,255,136,0.3)' }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">Hash Auténtico Verificado</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">BSC Mainnet</span>
                      </div>
                      <h3 className="text-lg font-extrabold text-white mt-0.5">Certificado de Firma Válido</h3>
                    </div>
                  </div>

                  <a
                    href={`https://bscscan.com/tx/${hashResult.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-emerald-400 border border-neutral-700 transition-all"
                  >
                    <span>Ver en BscScan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Apodo único */}
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">Apodo / Username Único</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">@{hashResult.nickname}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">Privacidad Activa</span>
                    </div>
                  </div>

                  {/* Activo Adquirido */}
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">Activo RWA Adquirido</span>
                    <span className="text-xs font-bold text-white line-clamp-1">{hashResult.assetTitle}</span>
                  </div>

                  {/* Precio / Inversión */}
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">Monto Invertido</span>
                    <span className="text-sm font-extrabold text-emerald-400 font-mono">${Number(hashResult.amountInvestedUsdt).toLocaleString()} USDT</span>
                  </div>

                  {/* % de Participación */}
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">% de Participación</span>
                    <span className="text-sm font-extrabold text-white font-mono">{Number(hashResult.sharesPercentage).toFixed(4)}%</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-neutral-300">
                  <div className="flex-1 min-w-0 w-full">
                    <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">Signed Contract Hash (TxID)</span>
                    <p className="text-emerald-400 font-bold break-all text-xs tracking-wide bg-neutral-950 p-2.5 rounded-lg border border-emerald-500/20 select-all">
                      {hashResult.txHash}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (hashResult?.txHash) {
                          navigator.clipboard.writeText(hashResult.txHash);
                          setCopiedHash(true);
                          setTimeout(() => setCopiedHash(false), 2000);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {copiedHash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedHash ? '¡Copiado!' : 'Copiar Hash'}</span>
                    </button>
                    <span className="text-neutral-400 text-[11px] font-mono">{new Date(hashResult.purchasedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 text-neutral-400">
                <Lock className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                <p className="text-sm font-bold text-white">No se encontró ningún contrato con este Hash</p>
                <p className="text-xs mt-1">Verifica que el Signed Contract Hash esté completo o bien escrito.</p>
              </div>
            )
          )}

          {/* Option B: Nickname Portfolio Result */}
          {searchMode === 'nickname' && (
            portfolioResult ? (
              <div className="space-y-6 animate-scale-up">
                {/* Profile Portfolio Card */}
                <div 
                  className="p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                  style={{ background: '#111715', border: '1px solid rgba(0,255,136,0.25)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold font-mono text-xl">
                      @{portfolioResult.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-white font-mono">@{portfolioResult.nickname}</h2>
                        {portfolioResult.kycVerified && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" />
                            KYC Verificado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">Portafolio Público Confidencial · Inversor HOLD3R</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-right">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-mono block">Total Invertido</span>
                      <span className="text-xl font-extrabold text-emerald-400 font-mono">${portfolioResult.totalInvestedUsdt.toLocaleString()} USDT</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-mono block">Activos Poseídos</span>
                      <span className="text-xl font-extrabold text-white font-mono">{portfolioResult.totalHoldingsCount}</span>
                    </div>
                  </div>
                </div>

                {/* Holdings List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Activos y Fracciones de @{portfolioResult.nickname}
                  </h3>

                  {portfolioResult.holdings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {portfolioResult.holdings.map((h, idx) => (
                        <div 
                          key={idx}
                          className="p-4 rounded-xl flex items-center gap-4"
                          style={{ background: '#111715', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {h.image ? (
                            <img src={h.image} alt={h.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                              <Building2 className="w-6 h-6" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{h.title}</h4>
                            <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
                              <span className="text-emerald-400 font-bold">${h.totalInvested.toLocaleString()} USDT</span>
                              <span className="text-neutral-400">· {h.fractionCount} fracción(es) ({h.sharesPercentageSum.toFixed(3)}%)</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl bg-neutral-900/40 border border-neutral-800 text-xs text-neutral-400">
                      Este usuario aún no tiene inversiones registradas.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 text-neutral-400">
                <UserCheck className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                <p className="text-sm font-bold text-white">No se encontró ningún usuario con el apodo "@ {query.replace(/^@/, '')}"</p>
                <p className="text-xs mt-1">Verifica el nombre de usuario único e intentalo nuevamente.</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
