import React, { useState } from 'react';
import { PlusCircle, ShieldAlert, CheckCircle2, RefreshCw, Sliders, ArrowRight, HelpCircle, Upload, Image as ImageIcon, Loader2, X, Shield, Trash2 } from 'lucide-react';
import { createAsset, updateAssetStatus, deleteAsset, uploadAssetImage } from '../services/api';

export default function AdminPanel({ assets, userProfile, onAssetCreated, onRefresh, onViewCatalog }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lastCreatedAsset, setLastCreatedAsset] = useState(null);

  // Form Base State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('real_estate');
  const [totalValuation, setTotalValuation] = useState('');
  const [fundedAmount, setFundedAmount] = useState('0');
  const [status, setStatus] = useState('funding');
  const [legalContractUrl, setLegalContractUrl] = useState('https://hold3r.io/contracts/legal_spec_v1.pdf');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [description, setDescription] = useState('');

  // Investment Limits State
  const [minInvestment, setMinInvestment] = useState('10');
  const [maxInvestment, setMaxInvestment] = useState('');

  // Dynamic Technical Specs State
  // Bienes Raíces (real_estate)
  const [location, setLocation] = useState('Caracas, Venezuela');
  const [areaM2, setAreaM2] = useState('180');
  const [propertyType, setPropertyType] = useState('Residencial / Comercial');

  // Vehículos (fleet) y Maquinaria (heavy_machinery)
  const [brand, setBrand] = useState('RAM / Caterpillar');
  const [modelName, setModelName] = useState('2025 Spec Model');
  const [manufactureYear, setManufactureYear] = useState('2024');
  const [usageStats, setUsageStats] = useState('0 km / Horas Nuevas');

  if (userProfile?.role !== 'admin') {
    return (
      <div className="glass-panel p-12 text-center space-y-4 max-w-md mx-auto my-12 border border-white/20">
        <ShieldAlert className="w-12 h-12 text-neutral-400 mx-auto" />
        <h3 className="text-xl font-black text-white">Acceso Restringido</h3>
        <p className="text-xs text-neutral-300">
          El Panel de Administración es exclusivo para usuarios con el rol <strong className="text-emerald-400 font-mono">admin</strong>.
        </p>
      </div>
    );
  }

  // Handler para subir foto directamente desde la galería del móvil / archivo local
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMsg('');
    try {
      const uploadedUrl = await uploadAssetImage(file);
      if (uploadedUrl) {
        setImageUrl(uploadedUrl);
        setImagePreview(uploadedUrl);
      }
    } catch (err) {
      console.error('Error al procesar la imagen:', err);
      setErrorMsg('No se pudo procesar la imagen del activo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (!title || !totalValuation || !description) {
        throw new Error('Completa todos los campos requeridos para publicar el activo.');
      }

      // Ensamblar ficha técnica dinámica
      let techSpecHeader = '';
      if (category === 'real_estate') {
        techSpecHeader = `📍 Ubicación: ${location} | 📐 Área: ${areaM2} m² | 🏢 Tipo: ${propertyType}\n\n`;
      } else {
        techSpecHeader = `⚙️ Marca: ${brand} | 🚜 Modelo: ${modelName} | 📅 Año: ${manufactureYear} | 📊 Uso: ${usageStats}\n\n`;
      }

      const fullDescription = techSpecHeader + description;

      const imgList = imageUrl.trim() 
        ? [imageUrl.trim()]
        : [
            category === 'real_estate' 
              ? 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'
              : category === 'heavy_machinery'
              ? 'https://images.unsplash.com/photo-1579412690850-bd41cd0af397?auto=format&fit=crop&w=1200&q=80'
              : 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&w=1200&q=80'
          ];

      const newAsset = await createAsset({
        title,
        category,
        total_valuation: Number(totalValuation),
        funded_amount: Number(fundedAmount || 0),
        status,
        legal_contract_url: legalContractUrl,
        images: imgList,
        description: fullDescription,
        min_investment: minInvestment ? Number(minInvestment) : 10,
        max_investment: maxInvestment ? Number(maxInvestment) : null
      });

      setLastCreatedAsset(newAsset);
      setSuccessMsg(`🎉 ¡Activo RWA "${title}" publicado en Supabase exitosamente!`);
      
      // Limpiar formulario
      setTitle('');
      setTotalValuation('');
      setFundedAmount('0');
      setImageUrl('');
      setImagePreview('');
      setMinInvestment('10');
      setMaxInvestment('');
      setDescription('');

      if (onAssetCreated) {
        onAssetCreated(newAsset);
      }
    } catch (err) {
      console.error('Error al crear activo:', err);
      setErrorMsg(err.message || 'Error al guardar activo.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (assetId, newStatus) => {
    try {
      await updateAssetStatus(assetId, newStatus);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Error al cambiar estatus.');
    }
  };

  const handleDeleteAsset = async (assetId, assetTitle) => {
    if (!window.confirm(`¿Estás seguro de eliminar / descartar el activo "${assetTitle}" de Supabase? Esta acción no se puede deshacer.`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    try {
      await deleteAsset(assetId);
      setSuccessMsg(`🗑️ Activo "${assetTitle}" eliminado exitosamente de la base de datos.`);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error al eliminar activo:', err);
      setErrorMsg(err.message || 'No se pudo eliminar el activo.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-2xl font-extrabold text-white">Panel de Administración RWA</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Carga de activos fraccionados a Supabase con ficha técnica dinámica.
          </p>
        </div>
      </div>

      {/* Success Toast Banner */}
      {successMsg && (
        <div className="bg-neutral-900 border border-emerald-500/60 text-emerald-200 text-xs p-4 rounded-2xl font-semibold flex items-center justify-between gap-4 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {onViewCatalog && (
            <button
              onClick={onViewCatalog}
              className="bg-emerald-500 text-neutral-950 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 hover:bg-emerald-400 transition-colors shrink-0"
            >
              Ver en Catálogo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs p-4 rounded-2xl font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Main Grid: Form + Asset List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 1 Col: Create Asset Form */}
        <div className="glass-panel p-6 border border-white/10 space-y-4 lg:col-span-1">
          <h3 className="text-base font-bold text-white pb-3 border-b border-white/10 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            Nuevo Activo RWA
          </h3>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Título del Activo *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Torre Comercial Altamira o Van RAM 1500"
                className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white rounded-xl p-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Categoría del Activo *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-900 border border-white/15 text-white font-bold rounded-xl p-2.5 text-xs outline-none"
              >
                <option value="real_estate">🏢 Bienes Raíces (real_estate)</option>
                <option value="heavy_machinery">🚜 Maquinaria Pesada (heavy_machinery)</option>
                <option value="fleet">🚚 Vehículos (fleet)</option>
              </select>
            </div>

            {/* Ficha Técnica Dinámica según Categoría */}
            <div className="bg-neutral-900/90 border border-white/10 p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" />
                Especificaciones Técnicas ({category === 'real_estate' ? 'Bienes Raíces' : category === 'heavy_machinery' ? 'Maquinaria' : 'Vehículos'})
              </div>

              {category === 'real_estate' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">Ubicación / Ciudad</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Caracas, VE"
                        className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">Área (m²)</label>
                      <input
                        type="text"
                        value={areaM2}
                        onChange={(e) => setAreaM2(e.target.value)}
                        placeholder="180 m²"
                        className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">Tipo de Propiedad</label>
                    <input
                      type="text"
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      placeholder="Oficina Corporativa / Residencial"
                      className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">Marca</label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Caterpillar / RAM"
                        className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">Modelo</label>
                      <input
                        type="text"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="D8R / 1500 Promaster"
                        className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">Año Fabricación</label>
                      <input
                        type="text"
                        value={manufactureYear}
                        onChange={(e) => setManufactureYear(e.target.value)}
                        placeholder="2024"
                        className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">Uso / Kilometraje</label>
                      <input
                        type="text"
                        value={usageStats}
                        onChange={(e) => setUsageStats(e.target.value)}
                        placeholder="0 km / Cero Horas"
                        className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Valor Total (USDT) *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="100"
                  value={totalValuation}
                  onChange={(e) => setTotalValuation(e.target.value)}
                  placeholder="120000"
                  className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white font-mono font-bold rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Fondeo Inicial (USDT)
                  </label>
                  <div className="relative group cursor-pointer">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-400 opacity-90 hover:opacity-100 transition-opacity" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2.5 bg-neutral-900 border border-emerald-500/40 text-[11px] text-neutral-200 rounded-xl shadow-2xl z-30 pointer-events-none leading-relaxed">
                      💡 Monto inicial inyectado al activo previo a la ronda pública. Déjalo en 0 si inicia desde cero.
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={fundedAmount}
                  onChange={(e) => setFundedAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white font-mono rounded-xl p-2.5 text-xs outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-neutral-400 -mt-1 font-medium leading-tight">
              * Monto inicial inyectado al activo previo a la ronda pública. Déjalo en 0 si inicia desde cero.
            </p>

            {/* Límites de Inversión por Inversionista */}
            <div className="bg-neutral-900/90 border border-white/10 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                Límites por Socio (USDT)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-300 mb-1">Inversión Mínima</label>
                  <input
                    type="number"
                    min="1"
                    value={minInvestment}
                    onChange={(e) => setMinInvestment(e.target.value)}
                    placeholder="10"
                    className="w-full bg-neutral-950 border border-white/10 text-white font-mono rounded-lg p-2 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-300 mb-1">Inversión Máxima</label>
                  <input
                    type="number"
                    min="1"
                    value={maxInvestment}
                    onChange={(e) => setMaxInvestment(e.target.value)}
                    placeholder="Ej. 10000"
                    className="w-full bg-neutral-950 border border-white/10 text-white font-mono rounded-lg p-2 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-neutral-400 leading-relaxed pt-1">
                💡 <strong>Modo Cuota Fija:</strong> Si la Inversión Mínima es igual a la Inversión Máxima (ej. $13,000 USDT), el activo se fraccionará en cuotas fijas indivisibles.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Estado Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-neutral-900 border border-white/15 text-white rounded-xl p-2.5 text-xs outline-none"
              >
                <option value="funding">🟢 Fondeando (funding)</option>
                <option value="active_rent">🔵 Renta Activa (active_rent)</option>
                <option value="sold">⚪ Vendido (sold)</option>
              </select>
            </div>

            {/* Selector de Imagen Directo desde Dispositivo / Supabase Storage */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-300">
                Imagen Destacada del Activo
              </label>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="file-upload-input"
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed text-xs font-semibold cursor-pointer transition-all ${
                    uploadingImage 
                      ? 'bg-neutral-800 border-neutral-600 text-neutral-400 cursor-wait'
                      : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400'
                  }`}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Subiendo a Supabase Storage...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Seleccionar Foto de Galería / Dispositivo</span>
                    </>
                  )}
                </label>
                <input
                  id="file-upload-input"
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage}
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </div>

              {imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-white/15 h-28 bg-neutral-950 group">
                  <img src={imageUrl} alt="Vista Previa" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageUrl(''); setImagePreview(''); }}
                    className="absolute top-2 right-2 bg-black/80 text-white hover:text-rose-400 p-1 rounded-full text-xs transition-colors"
                    title="Remover imagen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[9px] font-mono bg-black/75 px-2 py-0.5 rounded text-emerald-300 border border-emerald-500/30">
                    ✓ Imagen cargada
                  </span>
                </div>
              )}

              <div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="O ingresa enlace URL directo (https://...)"
                  className="w-full bg-neutral-900 border border-white/15 text-white font-mono rounded-xl p-2.5 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                URL Contrato Legal Digital
              </label>
              <input
                type="text"
                value={legalContractUrl}
                onChange={(e) => setLegalContractUrl(e.target.value)}
                className="w-full bg-neutral-900 border border-white/15 text-white font-mono rounded-xl p-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Descripción Comercial *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escribe la proyección de rendimientos y plan de alquiler..."
                className="w-full bg-neutral-900 border border-white/15 text-white rounded-xl p-2.5 text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-xs font-bold"
            >
              {loading ? 'Guardando en Supabase...' : 'Publicar Activo en Plataforma'}
            </button>
          </form>
        </div>

        {/* Right 2 Cols: Manage Existing Assets */}
        <div className="glass-panel p-6 border border-white/10 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white">Activos Registrados ({assets.length})</h3>
            <button onClick={onRefresh} className="btn-secondary text-[11px] p-1.5 px-3">
              <RefreshCw className="w-3.5 h-3.5" /> Refrescar
            </button>
          </div>

          <div className="space-y-3">
            {assets.map(asset => (
              <div 
                key={asset.id}
                className="bg-neutral-900/80 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`badge-category badge-${asset.category}`}>
                      {asset.category === 'fleet' ? 'Vehículos' : asset.category === 'real_estate' ? 'Bienes Raíces' : 'Maquinaria'}
                    </span>
                    <h4 className="text-sm font-bold text-white">{asset.title}</h4>
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    Valoración: <strong>${Number(asset.total_valuation).toLocaleString()} USDT</strong> | Fondeado: <strong className="text-emerald-400">${Number(asset.funded_amount).toLocaleString()} USDT</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <label className="text-[11px] text-neutral-400 font-semibold hidden sm:block">Estado:</label>
                  <select
                    value={asset.status}
                    onChange={(e) => handleStatusChange(asset.id, e.target.value)}
                    className="bg-neutral-950 border border-white/15 text-white rounded-xl p-2 text-xs font-semibold outline-none"
                  >
                    <option value="funding">Fondeando</option>
                    <option value="active_rent">Renta Activa</option>
                    <option value="sold">Vendido</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(asset.id, asset.title)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Eliminar / Descartar Borrador"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
