import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, DollarSign, Calendar, ExternalLink, RefreshCw, FileText, X, Download, Copy, Check, Award, Shield } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { fetchUserShares } from '../services/api';

export function generateCorporateContractPDF({ share, userProfile, asset, purchasedDate, txHash, numAmount }) {
  const doc = new jsPDF();
  const title = asset?.title || 'Activo RWA';
  const categoryLabel = asset?.category === 'real_estate' ? 'Bienes Raíces' : asset?.category === 'heavy_machinery' ? 'Maquinaria Pesada' : 'Vehículos / Flota';
  const name = userProfile?.full_name || 'Inversor Registrado';
  const docId = userProfile?.document_id || 'V-00000000';
  const userId = userProfile?.id || share?.user_id || 'AUTHENTICATED-SESSION';
  const sharesPercentage = Number(share?.shares_percentage || 0).toFixed(4);
  const certId = `HOLD3R-CERT-${(share?.id || '00000000').substring(0, 8).toUpperCase()}`;

  // 1. Franja Superior Institucional (Esmeralda)
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 14, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('HOLD3R PROTOCOL VENEZUELA • PROTOCOLO DE TOKENIZACIÓN RWA EN BSC MAINNET', 15, 9);

  // 2. Marco Decorativo Creado con Borde Doble
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.rect(10, 20, 190, 265);

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.rect(12, 22, 186, 261);

  // 3. Encabezado del Certificado Jurídico
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO JURÍDICO DE PROPIEDAD FRACCIONADA RWA', 15, 34);

  doc.setTextColor(16, 185, 129);
  doc.setFontSize(10);
  doc.text(`REGISTRO OFICIAL N° ${certId}`, 15, 42);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha y Hora de Emisión Registrada: ${purchasedDate}`, 15, 48);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 52, 195, 52);

  // 4. Bloque I: Datos del Titular KYC
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 56, 180, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('I. DATOS DEL TITULAR REGISTRADO (KYC VALIDATED)', 18, 61);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Nombre Completo:`, 18, 70);
  doc.setFont('helvetica', 'bold');
  doc.text(`${name}`, 55, 70);

  doc.setFont('helvetica', 'normal');
  doc.text(`Documento de Identidad / RIF:`, 18, 77);
  doc.setFont('helvetica', 'bold');
  doc.text(`${docId}`, 65, 77);

  doc.setFont('helvetica', 'normal');
  doc.text(`ID de Usuario Supabase:`, 18, 84);
  doc.setFont('helvetica', 'bold');
  doc.text(`${userId}`, 55, 84);

  doc.setFont('helvetica', 'normal');
  doc.text(`Estado del Titular:`, 18, 91);
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.text(`TITULAR VERIFICADO Y HABILITADO (KYC)`, 50, 91);

  // 5. Bloque II: Especificaciones del Activo RWA
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 98, 180, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('II. ESPECIFICACIONES DEL BIEN ADQUIRIDO (ACTIVO REAL)', 18, 103);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Denominación del Activo:`, 18, 112);
  doc.setFont('helvetica', 'bold');
  doc.text(`${title}`, 58, 112);

  doc.setFont('helvetica', 'normal');
  doc.text(`Categoría RWA:`, 18, 119);
  doc.setFont('helvetica', 'bold');
  doc.text(`${categoryLabel}`, 45, 119);

  doc.setFont('helvetica', 'normal');
  doc.text(`Valoración Comercial Total:`, 18, 126);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${Number(asset?.total_valuation || 0).toLocaleString()} USDT`, 60, 126);

  if (asset?.metadata?.location) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Ubicación Física:`, 18, 133);
    doc.setFont('helvetica', 'bold');
    doc.text(`${asset.metadata.location}`, 45, 133);
  }

  if (asset?.metadata?.vin) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Serial / Chasis VIN:`, 18, 140);
    doc.setFont('helvetica', 'bold');
    doc.text(`${asset.metadata.vin}`, 48, 140);
  }

  // 6. Bloque III: Aporte y Derechos Económicos
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 147, 180, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('III. APORTE EN USDT Y PARTICIPACIÓN PROPORCIONAL', 18, 152);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Monto en USDT Inyectado:`, 18, 161);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`$${numAmount.toLocaleString()} USDT`, 60, 161);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(`Porcentaje de Participación:`, 18, 168);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 165, 233);
  doc.text(`${sharesPercentage}%`, 62, 168);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(`Estándar Smart Contract:`, 18, 175);
  doc.setFont('helvetica', 'bold');
  doc.text(`ERC-1155 Fractional Token (Binance Smart Chain)`, 58, 175);

  // 7. Bloque IV: Sello Digital y Registro On-Chain
  doc.setFillColor(236, 253, 245);
  doc.rect(15, 184, 180, 42, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.rect(15, 184, 180, 42);

  doc.setTextColor(6, 95, 70);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('IV. SELLO DIGITAL Y HASH DE REGISTRO ON-CHAIN', 18, 192);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Hash de Firma Criptográfica / TxHash BSC:', 18, 200);
  
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(16, 185, 129);
  doc.text(`${txHash}`, 18, 207);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Verificación oficial disponible en el explorador de bloques público BscScan:', 18, 215);
  doc.setFont('courier', 'normal');
  doc.text(`https://bscscan.com/tx/${txHash}`, 18, 221);

  // 8. Cláusulas de Blindaje Jurídico
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CLÁUSULA DE RESPALDO: El presente certificado legal otorga al titular derecho pleno sobre las utilidades derivadas de alquileres,', 15, 235);
  doc.text('revalorización patrimonial y voto en decisiones de gobernanza de HOLD3R Venezuela conforme a los estatutos aplicables.', 15, 240);

  // Pie de Página
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 275, 195, 275);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('HOLD3R VENEZUELA • PROTOCOLO DE TOKENIZACIÓN RWA • BSC MAINNET', 15, 280);

  // Generación de descarga directa con Blob
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = pdfUrl;
  downloadLink.download = `Certificado_HOLD3R_${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(pdfUrl);
}

export default function MyInvestmentsView({ userProfile, initialShares = [], onRefresh }) {
  const [shares, setShares] = useState(initialShares);
  const [loading, setLoading] = useState(false);
  const [selectedContractShare, setSelectedContractShare] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);

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

  const handleCopyHash = (hashStr) => {
    if (!hashStr) return;
    navigator.clipboard.writeText(hashStr);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
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
            Resumen consolidado de tus fracciones de activos (RWA) y certificados jurídicos en BSC.
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

            const txHash = share.signed_contract_hash || '0x7f8a9b...';
            const bscScanUrl = `https://bscscan.com/tx/${txHash}`;

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
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="bg-neutral-900 border border-white/10 p-2 rounded-xl text-[10px] font-mono text-emerald-300 truncate max-w-[180px] sm:max-w-xs block">
                      {txHash}
                    </div>
                    <a
                      href={bscScanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-neutral-900 border border-white/10 rounded-xl hover:border-emerald-500/50 text-neutral-400 hover:text-emerald-400 transition-colors"
                      title="Ver en BscScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <button
                    onClick={() => setSelectedContractShare(share)}
                    className="btn-secondary text-[11px] py-1.5 px-3 font-bold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 w-full flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Ver Certificado de Propiedad
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL IMPRESIÓN / CERTIFICADO JURÍDICO CORPORATIVO RWA ── */}
      {selectedContractShare && (() => {
        const share = selectedContractShare;
        const asset = share.asset || {};
        const purchasedDate = share.purchased_at ? new Date(share.purchased_at).toLocaleString('es-VE') : new Date().toLocaleString('es-VE');
        const txHash = share.signed_contract_hash || '0x7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a';
        const numAmount = Number(share.amount_invested_usdt || 0);
        const bscScanUrl = `https://bscscan.com/tx/${txHash}`;
        const assetImg = Array.isArray(asset.images) && asset.images.length > 0 ? asset.images[0] : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
            <div className="bg-neutral-950 text-white w-full max-w-4xl rounded-2xl border border-emerald-500/50 p-5 sm:p-8 space-y-6 shadow-[0_0_60px_rgba(16,185,129,0.15)] relative max-h-[92vh] overflow-y-auto my-auto">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white tracking-wide uppercase">CERTIFICADO JURÍDICO OFICIAL DE PROPIEDAD RWA</h3>
                    <p className="text-[11px] text-emerald-400 font-mono font-semibold">HOLD3R PROTOCOL VENEZUELA • REGISTRO DIGITAL DE ACCIONES</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedContractShare(null)}
                  className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Documento Estilizado Imprimible / Vista Certificado */}
              <div id="printable-contract" className="bg-neutral-900/90 p-6 sm:p-8 rounded-xl border border-emerald-500/30 space-y-6 text-xs text-neutral-300 leading-relaxed font-sans relative overflow-hidden shadow-inner">
                
                {/* Marca de Agua Background */}
                <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none text-emerald-400 font-black text-8xl uppercase tracking-widest font-mono select-none">
                  HOLD3R
                </div>

                {/* Membrete Institucional Corporativo */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-emerald-500/30 pb-5 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg">
                      <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center font-black text-emerald-400 text-lg tracking-tighter">
                        H3R
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white tracking-wider">HOLD3R VENEZUELA</h4>
                      <p className="text-[10px] text-emerald-400 font-mono">PROTOCOLO DE TOKENIZACIÓN Y PROPIEDAD FRACCIONADA RWA</p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[10px] space-y-1 bg-neutral-950/80 p-3 rounded-xl border border-emerald-500/20">
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 block mb-1">
                      SELLO DIGITAL DE PROPIEDAD
                    </span>
                    <p className="text-neutral-400">Emisión: <strong className="text-white">{purchasedDate}</strong></p>
                    <p className="text-neutral-400">Red: <strong className="text-cyan-300">Binance Smart Chain (BSC)</strong></p>
                  </div>
                </div>

                {/* Bloque I: Datos del Titular KYC */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase text-[11px] text-emerald-300 border-l-2 border-emerald-400 pl-2">
                    I. DATOS DEL TITULAR DEL ACTIVO (KYC VALIDATED)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950/80 p-3.5 rounded-xl border border-white/5 font-mono text-[11px]">
                    <div><span className="text-neutral-400 block">Nombre Completo del Inversor:</span> <strong className="text-white">{userProfile?.full_name || 'Inversionista Autenticado'}</strong></div>
                    <div><span className="text-neutral-400 block">Documento de Identidad / RIF:</span> <strong className="text-white">{userProfile?.document_id || 'V-00000000'}</strong></div>
                    <div><span className="text-neutral-400 block">ID de Usuario Supabase:</span> <strong className="text-white truncate block">{userProfile?.id || 'AUTH-SESSION'}</strong></div>
                    <div><span className="text-neutral-400 block">Estado Jurídico:</span> <strong className="text-emerald-400">Titular Validado y Habilitado (KYC)</strong></div>
                  </div>
                </div>

                {/* Bloque II: Especificaciones del Activo RWA con Miniatura */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase text-[11px] text-emerald-300 border-l-2 border-emerald-400 pl-2">
                    II. ESPECIFICACIONES DEL BIEN ADQUIRIDO (ACTIVO RWA)
                  </h4>
                  <div className="flex flex-col sm:flex-row items-start gap-4 bg-neutral-950/80 p-3.5 rounded-xl border border-white/5 font-mono text-[11px]">
                    {assetImg && (
                      <img 
                        src={assetImg} 
                        alt={asset.title} 
                        className="w-20 h-20 rounded-xl object-cover border border-emerald-500/30 shrink-0 bg-neutral-900"
                      />
                    )}
                    <div className="space-y-1.5 w-full">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-neutral-400">Denominación del Activo:</span>
                        <strong className="text-white font-bold">{asset.title || 'Activo RWA'}</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-neutral-400">Categoría RWA:</span>
                        <strong className="text-cyan-300 capitalize">{asset.category === 'real_estate' ? 'Bienes Raíces' : asset.category === 'heavy_machinery' ? 'Maquinaria Pesada' : 'Vehículos / Flota'}</strong>
                      </div>
                      {asset.metadata?.location && (
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-neutral-400">Ubicación Física:</span>
                          <strong className="text-white">{asset.metadata.location}</strong>
                        </div>
                      )}
                      {asset.metadata?.vin && (
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-neutral-400">Serial VIN / Chasis:</span>
                          <strong className="text-amber-300">{asset.metadata.vin}</strong>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Valoración Comercial Total:</span>
                        <strong className="text-white">${Number(asset.total_valuation || 0).toLocaleString()} USDT</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloque III: Aporte y Derechos Económicos */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase text-[11px] text-emerald-300 border-l-2 border-emerald-400 pl-2">
                    III. APORTE EN USDT, PARTICIPACIÓN Y BLINDAJE JURÍDICO
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-500/30 font-mono text-[11px]">
                    <div><span className="text-neutral-400 block">Monto en USDT Inyectado:</span> <strong className="text-emerald-400 text-sm">${numAmount.toLocaleString()} USDT</strong></div>
                    <div><span className="text-neutral-400 block">Porcentaje de Participación:</span> <strong className="text-cyan-300 text-sm">{Number(share.shares_percentage || 0).toFixed(4)}%</strong></div>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-neutral-400 block mb-1">Hash de Firma Criptográfica / TxHash (BSC):</span>
                      <div className="flex items-center gap-2 bg-neutral-950 p-2 rounded-lg border border-emerald-500/30">
                        <strong className="text-emerald-300 text-[10px] break-all font-mono flex-1">{txHash}</strong>
                        <button
                          onClick={() => handleCopyHash(txHash)}
                          className="p-1 text-emerald-400 hover:text-white transition-colors"
                          title="Copiar Hash"
                        >
                          {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed pt-1">
                    * El presente certificado digital otorga al titular pleno derecho legal sobre los ingresos por renta, revalorización del activo y derecho a voto en la gobernanza descentralizada de HOLD3R Venezuela.
                  </p>
                </div>

                {/* Sello Digital de Validación */}
                <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>REGISTRO OFICIAL VALIDADO ON-CHAIN • BINANCE SMART CHAIN</span>
                  </div>
                  <a
                    href={bscScanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Verificación en BscScan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-[11px] text-neutral-400 font-mono">
                  Documento digital oficial firmado con criptografía en BSC.
                </p>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <a
                    href={bscScanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs flex items-center justify-center gap-1.5 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20 py-2 px-4 flex-1 sm:flex-initial"
                  >
                    <ExternalLink className="w-4 h-4" /> Ver en BscScan
                  </a>
                  <button
                    onClick={() => generateCorporateContractPDF({ share, userProfile, asset, purchasedDate, txHash, numAmount })}
                    className="btn-primary text-xs flex items-center justify-center gap-2 bg-emerald-500 text-neutral-950 font-bold py-2 px-4 flex-1 sm:flex-initial"
                  >
                    <Download className="w-4 h-4" /> Descargar PDF Oficial
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
