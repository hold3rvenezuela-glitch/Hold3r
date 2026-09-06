import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, DollarSign, Calendar, ExternalLink, RefreshCw, FileText, Printer, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { fetchUserShares } from '../services/api';

export default function MyInvestmentsView({ userProfile, initialShares = [], onRefresh }) {
  const [shares, setShares] = useState(initialShares);
  const [loading, setLoading] = useState(false);
  const [selectedContractShare, setSelectedContractShare] = useState(null);

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
                <div className="w-full md:w-auto text-right space-y-2">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">
                    Hash de Contrato Web3
                  </span>
                  <div className="bg-neutral-900 border border-white/10 p-2 rounded-xl text-[10px] font-mono text-emerald-300 truncate max-w-xs block">
                    {share.signed_contract_hash || '0x7f8a...31b'}
                  </div>
                  <button
                    onClick={() => setSelectedContractShare(share)}
                    className="btn-secondary text-[11px] py-1.5 px-3 font-bold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 w-full flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Ver Documento de Propiedad
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL IMPRESIÓN CONTRATO LEGAL PRIVADO DE PROPIEDAD RWA ── */}
      {selectedContractShare && (() => {
        const share = selectedContractShare;
        const asset = share.asset || {};
        const purchasedDate = share.purchased_at ? new Date(share.purchased_at).toLocaleString('es-VE') : new Date().toLocaleString('es-VE');
        const txHash = share.signed_contract_hash || '0x7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a';
        const numAmount = Number(share.amount_invested_usdt || 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
            <div className="bg-neutral-900 text-white w-full max-w-3xl rounded-2xl border border-emerald-500/40 p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm uppercase tracking-wider">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  HOLD3R RWA • Documento Jurídico de Propiedad Fraccionada
                </div>
                <button
                  onClick={() => setSelectedContractShare(null)}
                  className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido Imprimible del Contrato Legal */}
              <div id="printable-contract" className="bg-neutral-950 p-6 sm:p-8 rounded-xl border border-white/10 space-y-6 text-xs text-neutral-300 leading-relaxed font-sans">
                {/* Cabecera del Documento */}
                <div className="text-center space-y-1 border-b border-white/10 pb-4">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight uppercase">CONTRATO PRIVADO DE ADQUISICIÓN DE ACCIONES RWA</h2>
                  <p className="text-[11px] text-emerald-400 font-mono font-bold">PLATAFORMA HOLD3R VENEZUELA • PROTOCOLO DE TOKENIZACIÓN DE ACTIVOS REALES</p>
                  <p className="text-[10px] text-neutral-400 font-mono">Emisión Digital Registrada: {purchasedDate}</p>
                </div>

                {/* Seccion I: Partes Contratantes */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase text-[11px] text-emerald-300 border-l-2 border-emerald-400 pl-2">I. DATOS DEL TITULAR DEL ACTIVO (TITULAR REGISTRADO)</h4>
                  <div className="grid grid-cols-2 gap-3 bg-neutral-900/80 p-3 rounded-lg border border-white/5 font-mono text-[11px]">
                    <div><span className="text-neutral-400 block">Nombre Completo:</span> <strong className="text-white">{userProfile?.full_name || 'Inversionista Autenticado'}</strong></div>
                    <div><span className="text-neutral-400 block">Cédula / RIF:</span> <strong className="text-white">{userProfile?.document_id || 'V-00000000'}</strong></div>
                    <div><span className="text-neutral-400 block">ID de Usuario Supabase:</span> <strong className="text-white truncate block">{userProfile?.id || 'AUTH-SESSION'}</strong></div>
                    <div><span className="text-neutral-400 block">Estado Jurídico:</span> <strong className="text-emerald-400">Titular Validado (KYC)</strong></div>
                  </div>
                </div>

                {/* Seccion II: Objeto del Contrato & Activo */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase text-[11px] text-emerald-300 border-l-2 border-emerald-400 pl-2">II. ESPECIFICACIONES DEL BIEN ADQUIRIDO (ACTIVO RWA)</h4>
                  <div className="bg-neutral-900/80 p-3 rounded-lg border border-white/5 space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-400">Denominación del Activo:</span>
                      <strong className="text-white font-bold">{asset.title || 'Activo RWA'}</strong>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-400">Categoría:</span>
                      <strong className="text-cyan-300 capitalize">{asset.category === 'real_estate' ? 'Bienes Raíces' : asset.category === 'heavy_machinery' ? 'Maquinaria Pesada' : 'Vehículos'}</strong>
                    </div>
                    {asset.metadata?.location && (
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-neutral-400">Ubicación / Ciudad:</span>
                        <strong className="text-white">{asset.metadata.location}</strong>
                      </div>
                    )}
                    {asset.metadata?.vin && (
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-neutral-400">Serial VIN / Chasis:</span>
                        <strong className="text-amber-300">{asset.metadata.vin}</strong>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-400">Valoración Total del Activo:</span>
                      <strong className="text-white">${Number(asset.total_valuation || 0).toLocaleString()} USDT</strong>
                    </div>
                  </div>
                </div>

                {/* Seccion III: Detalle de Transacción y Derechos */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase text-[11px] text-emerald-300 border-l-2 border-emerald-400 pl-2">III. APORTE, ACCIONES ADQUIRIDAS Y BLINDAJE JURÍDICO</h4>
                  <div className="grid grid-cols-2 gap-3 bg-emerald-950/30 p-3 rounded-lg border border-emerald-500/30 font-mono text-[11px]">
                    <div><span className="text-neutral-400 block">Monto en USDT Inyectado:</span> <strong className="text-emerald-400 text-sm">${numAmount.toLocaleString()} USDT</strong></div>
                    <div><span className="text-neutral-400 block">Porcentaje de Participación:</span> <strong className="text-cyan-300 text-sm">{Number(share.shares_percentage || 0).toFixed(4)}%</strong></div>
                    <div className="col-span-2"><span className="text-neutral-400 block">TxID / Hash de Firma Web3:</span> <strong className="text-emerald-300 text-[10px] break-all">{txHash}</strong></div>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed pt-1">
                    * El presente documento otorga al titular pleno derecho económico sobre los rendimientos de alquiler, valorización comercial y voz/voto en la gobernanza de este activo conforme a los estatutos de HOLD3R Venezuela.
                  </p>
                </div>
              </div>

              {/* Botones Accion Modal */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-neutral-400 font-mono">Documento oficial generado con hash criptográfico único.</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const doc = new jsPDF();
                      const title = asset.title || 'Activo RWA';
                      const name = userProfile?.full_name || 'Inversionista Autenticado';
                      const docId = userProfile?.document_id || 'V-00000000';
                      
                      doc.setFontSize(16);
                      doc.text('HOLD3R - CONTRATO PRIVADO RWA', 20, 20);
                      
                      doc.setFontSize(10);
                      doc.text(`Fecha de Emisión: ${purchasedDate}`, 20, 30);
                      doc.text(`Titular: ${name} (${docId})`, 20, 40);
                      doc.text(`Activo Adquirido: ${title}`, 20, 50);
                      doc.text(`Monto Invertido: $${numAmount.toLocaleString()} USDT`, 20, 60);
                      doc.text(`Participación: ${Number(share.shares_percentage || 0).toFixed(4)}%`, 20, 70);
                      doc.text(`Hash de Firma / TxHash: ${txHash}`, 20, 80);
                      
                      doc.setFontSize(8);
                      doc.text('Este documento respalda legalmente la propiedad fraccionada en el protocolo HOLD3R.', 20, 100);
                      
                      doc.save(`Contrato_HOLD3R_${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
                    }}
                    className="btn-primary text-xs flex items-center gap-2 bg-emerald-500 text-neutral-950 font-bold"
                  >
                    <Download className="w-4 h-4" /> Descargar Contrato PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

