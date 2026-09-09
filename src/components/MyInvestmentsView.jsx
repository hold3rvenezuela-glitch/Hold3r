import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, DollarSign, Calendar, ExternalLink, RefreshCw, FileText, X, Download, Copy, Check, Award, Shield, ArrowDownLeft, ArrowUpRight, Wallet, History } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { fetchUserShares, fetchUserWalletMovements, createMarketplaceOrder } from '../services/api';

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
  doc.text(`ID de Usuario:`, 18, 84);
  doc.setFont('helvetica', 'bold');
  const displayNick = userProfile?.nickname ? `@${userProfile.nickname}` : `@${(name || 'inversor').toLowerCase().replace(/\s+/g, '_')}`;
  doc.text(`${displayNick}`, 45, 84);

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
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedContractShare, setSelectedContractShare] = useState(null);
  const [resaleShare, setResaleShare] = useState(null);
  const [resalePrice, setResalePrice] = useState('');
  const [publishingResale, setPublishingResale] = useState(false);
  const [resaleSuccessMsg, setResaleSuccessMsg] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedMovementHashId, setCopiedMovementHashId] = useState(null);

  useEffect(() => {
    if (initialShares && initialShares.length > 0) {
      setShares(initialShares);
    } else {
      loadShares();
    }
    loadMovements();
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

  const loadMovements = async () => {
    if (!userProfile?.id) return;
    setLoadingMovements(true);
    try {
      const movs = await fetchUserWalletMovements(userProfile.id);
      setMovements(movs);
    } catch (err) {
      console.error('Error al cargar movimientos de wallet:', err);
    } finally {
      setLoadingMovements(false);
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

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setSelectedContractShare(share)}
                      className="btn-secondary text-[11px] py-1.5 px-2 font-bold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Certificado
                    </button>
                    <button
                      onClick={() => setResaleShare(share)}
                      className="btn-secondary text-[11px] py-1.5 px-2 font-bold text-amber-400 border-amber-500/30 hover:bg-amber-500/20 flex items-center justify-center gap-1"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" /> Revender
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SECCIÓN: HISTORIAL DETALLADO DE LA WALLET (INGRESOS Y EGRESOS) ── */}
      <div 
        className="p-6 rounded-2xl space-y-5 animate-fade-in"
        style={{ background: '#111715', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide">Historial Detallado de la Wallet</h3>
              <p className="text-xs text-neutral-400">
                Registro transparente y auditable de todos los ingresos (depósitos) y egresos (compras RWA).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadMovements}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMovements ? 'animate-spin' : ''}`} />
            <span>Refrescar Registro</span>
          </button>
        </div>

        {loadingMovements ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-400">
            Cargando historial de movimientos on-chain...
          </div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center space-y-2 rounded-xl bg-neutral-900/40 border border-neutral-800">
            <Wallet className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-bold text-white">Sin movimientos registrados</p>
            <p className="text-xs text-neutral-400">Tus depósitos en USDT e inversiones fraccionadas aparecerán reflejados aquí automáticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] text-neutral-400 uppercase font-mono tracking-wider">
                  <th className="py-3 px-4">Operación / Etiqueta</th>
                  <th className="py-3 px-4">Monto</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4 text-right">Hash de Transacción (TxID)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {movements.map((mov, mIdx) => {
                  const isIncome = mov.type === 'income';
                  const dateObj = mov.timestamp ? new Date(mov.timestamp) : new Date();
                  
                  // Formato DD/MM/YYYY - HH:MM
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const year = dateObj.getFullYear();
                  const hours = String(dateObj.getHours()).padStart(2, '0');
                  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                  const formattedDateTime = `${day}/${month}/${year} - ${hours}:${minutes}`;

                  const txHash = mov.txHash || '0x...';
                  const bscUrl = `https://bscscan.com/tx/${txHash}`;
                  const isCopied = copiedMovementHashId === mov.id;

                  return (
                    <tr key={mov.id || `mov-${mIdx}`} className="hover:bg-neutral-900/50 transition-colors">
                      {/* Tipo / Etiqueta */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            isIncome
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                              : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                          }`}>
                            {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{mov.label}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {isIncome ? 'Ingreso · Depósito USDT' : 'Egreso · Fracción Token RWA'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Monto */}
                      <td className="py-3.5 px-4 font-extrabold whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg border text-xs ${
                          isIncome
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                        }`}>
                          {isIncome ? '+' : '-'}${mov.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                        </span>
                      </td>

                      {/* Fecha y Hora */}
                      <td className="py-3.5 px-4 text-neutral-300 whitespace-nowrap font-mono text-[11px]">
                        {formattedDateTime}
                      </td>

                      {/* Hash TxID completo con BscScan & Copiar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span 
                            title={txHash}
                            className="bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-lg text-[10px] font-mono text-emerald-400 break-all select-all inline-block max-w-[200px] sm:max-w-xs truncate"
                          >
                            {txHash}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(txHash);
                              setCopiedMovementHashId(mov.id);
                              setTimeout(() => setCopiedMovementHashId(null), 2000);
                            }}
                            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 text-neutral-400 hover:text-emerald-400 transition-colors shrink-0"
                            title="Copiar Hash completo"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={bscUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 transition-colors shrink-0 flex items-center gap-1"
                            title="Ver en BscScan"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                    <div><span className="text-neutral-400 block">ID de Usuario:</span> <strong className="text-emerald-400 font-bold truncate block">@{userProfile?.nickname || 'inversor'}</strong></div>
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

      {/* ── MODAL SOLICITUD DE REVENTA EN BÓVEDA / ESCROW ── */}
      {resaleShare && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 border border-amber-500/40 shadow-2xl relative my-auto text-white space-y-4">
            <button
              onClick={() => { setResaleShare(null); setResaleSuccessMsg(''); }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Revender Fracciones RWA</h3>
                <p className="text-xs text-neutral-400">Bloqueo en Bóveda Escrow y Tanteo 48h</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2 text-xs">
              <p className="text-neutral-300">
                Activo: <strong className="text-white">{resaleShare.asset?.title || 'Activo RWA'}</strong>
              </p>
              <p className="text-neutral-300">
                Participación a Bloquear: <strong className="text-amber-400 font-mono">{Number(resaleShare.shares_percentage || 0).toFixed(4)}%</strong>
              </p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                🔒 Al confirmar, tus fracciones se transferirán a la <strong>Bóveda de Garantía Escrow</strong>. Permanecerán durante <strong>48 horas exactas</strong> en oferta interna para Socios/Admin antes de pasar al mercado público.
              </p>
            </div>

            {resaleSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium space-y-2 text-center">
                <p>✅ {resaleSuccessMsg}</p>
                <button
                  type="button"
                  onClick={() => { setResaleShare(null); setResaleSuccessMsg(''); }}
                  className="mt-2 btn-primary bg-emerald-500 text-black font-bold py-1.5 px-4 text-xs"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!resalePrice || Number(resalePrice) <= 0) return;
                  setPublishingResale(true);
                  try {
                    await createMarketplaceOrder({
                      sellerId: userProfile.id,
                      shareId: resaleShare.id,
                      assetId: resaleShare.asset_id,
                      sharesPercentage: resaleShare.shares_percentage,
                      priceUsdt: resalePrice,
                    });
                    setResaleSuccessMsg('Orden enviada a Bóveda Escrow. En fase de tanteo interno (48h).');
                    loadShares();
                  } catch (err) {
                    alert(err.message);
                  } finally {
                    setPublishingResale(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Precio de Venta Solicitado (USDT):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-amber-400 font-mono font-bold">$</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={resalePrice}
                      onChange={e => setResalePrice(e.target.value)}
                      placeholder="Monto en USDT"
                      className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 text-white font-mono font-bold text-base rounded-xl py-2 pl-8 pr-16 outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-neutral-400">USDT</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResaleShare(null)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={publishingResale}
                    className="btn-primary bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs py-2 px-5"
                  >
                    {publishingResale ? 'Bloqueando en Bóveda...' : 'Confirmar Venta en Bóveda'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );

}
