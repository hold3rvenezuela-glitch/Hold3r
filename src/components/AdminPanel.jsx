import React, { useState } from 'react';
import { PlusCircle, ShieldAlert, CheckCircle2, RefreshCw, Sliders, ArrowRight, HelpCircle, Upload, Loader2, X, Shield, Trash2, Plus, Users } from 'lucide-react';
import { createAsset, updateAssetStatus, deleteAsset, uploadMultipleAssetImages } from '../services/api';

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
  
  // Multiple Images State
  const [imagesList, setImagesList] = useState([]);
  const [manualUrl, setManualUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [description, setDescription] = useState('');

  // Investment Limits State
  const [minInvestment, setMinInvestment] = useState('10');
  const [maxInvestment, setMaxInvestment] = useState('');

  // ── Bienes Raíces (real_estate) ──────────────────────────────
  const [location, setLocation] = useState('Caracas, Venezuela');
  const [areaM2, setAreaM2] = useState('');
  const [propertyType, setPropertyType] = useState('Residencial');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [flooring, setFlooring] = useState('');
  const [amenities, setAmenities] = useState('');

  // ── Vehículos (fleet) ────────────────────────────────────────
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState('');
  const [tireCondition, setTireCondition] = useState('');
  const [transmission, setTransmission] = useState('Automática');
  const [paintCondition, setPaintCondition] = useState('Excelente');

  // ── Maquinaria Pesada (heavy_machinery) ──────────────────────
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [manufactureYear, setManufactureYear] = useState('');
  const [machineHours, setMachineHours] = useState('');
  const [loadCapacity, setLoadCapacity] = useState('');
  const [maintenanceStatus, setMaintenanceStatus] = useState('Al día');

  // HOLD3RS Calculator
  const parsedValuation = Number(totalValuation) || 0;
  const parsedMin = Number(minInvestment) || 0;
  const parsedMax = Number(maxInvestment) || 0;
  const isFixedQuota = parsedMin > 0 && parsedMax > 0 && parsedMin === parsedMax;
  const totalHold3rs = isFixedQuota && parsedMin > 0 ? Math.floor(parsedValuation / parsedMin) : 0;

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

  // Handler para subir múltiples fotos en lote desde la galería del móvil / archivo local
  const handleMultipleImagesUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMsg('');
    try {
      const uploadedUrls = await uploadMultipleAssetImages(files);
      if (uploadedUrls && uploadedUrls.length > 0) {
        setImagesList(prev => [...prev, ...uploadedUrls].slice(0, 20)); // Límite máximo 20 fotos
      }
    } catch (err) {
      console.error('Error al procesar las imágenes:', err);
      setErrorMsg('No se pudieron procesar algunas imágenes.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImagesList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    setImagesList(prev => [...prev, manualUrl.trim()].slice(0, 20));
    setManualUrl('');
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

      // Construir objeto metadata técnica según categoría
      let metadata = {};
      if (category === 'real_estate') {
        metadata = {
          location,
          area_m2: areaM2,
          property_type: propertyType,
          bedrooms,
          bathrooms,
          flooring,
          amenities
        };
      } else if (category === 'fleet') {
        metadata = {
          vin,
          mileage,
          tire_condition: tireCondition,
          transmission,
          paint_condition: paintCondition,
          brand,
          model: modelName,
          year: manufactureYear
        };
      } else if (category === 'heavy_machinery') {
        metadata = {
          brand,
          model: modelName,
          year: manufactureYear,
          machine_hours: machineHours,
          load_capacity: loadCapacity,
          maintenance_status: maintenanceStatus
        };
      }

      const defaultFallbackImg = category === 'real_estate' 
        ? 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'
        : category === 'heavy_machinery'
        ? 'https://images.unsplash.com/photo-1579412690850-bd41cd0af397?auto=format&fit=crop&w=1200&q=80'
        : 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&w=1200&q=80';

      const finalImages = imagesList.length > 0 ? imagesList : [defaultFallbackImg];

      const newAsset = await createAsset({
        title,
        category,
        total_valuation: Number(totalValuation),
        funded_amount: Number(fundedAmount || 0),
        status,
        legal_contract_url: legalContractUrl,
        images: finalImages,
        description,
        metadata,
        min_investment: minInvestment ? Number(minInvestment) : 10,
        max_investment: maxInvestment ? Number(maxInvestment) : null
      });

      setLastCreatedAsset(newAsset);
      setSuccessMsg(`🎉 ¡Activo RWA "${title}" publicado en Supabase exitosamente con ${finalImages.length} fotos!`);
      
      // Limpiar formulario
      setTitle('');
      setTotalValuation('');
      setFundedAmount('0');
      setImagesList([]);
      setManualUrl('');
      setMinInvestment('10');
      setMaxInvestment('');
      setDescription('');
      // Reset metadata fields
      setLocation('Caracas, Venezuela'); setAreaM2(''); setPropertyType('Residencial');
      setBedrooms(''); setBathrooms(''); setFlooring(''); setAmenities('');
      setVin(''); setMileage(''); setTireCondition(''); setTransmission('Automática'); setPaintCondition('Excelente');
      setBrand(''); setModelName(''); setManufactureYear(''); setMachineHours(''); setLoadCapacity(''); setMaintenanceStatus('Al día');

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
                Ficha Técnica — {category === 'real_estate' ? '🏢 Bienes Raíces' : category === 'heavy_machinery' ? '🚜 Maquinaria' : '🚚 Vehículos'}
              </div>

              {/* ── BIENES RAÍCES ── */}
              {category === 'real_estate' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">📍 Ubicación / Ciudad</label>
                      <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Caracas, VE" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">📐 Área total (m²)</label>
                      <input type="text" value={areaM2} onChange={e => setAreaM2(e.target.value)} placeholder="180" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">🏢 Tipo de Propiedad</label>
                    <input type="text" value={propertyType} onChange={e => setPropertyType(e.target.value)} placeholder="Oficina Corporativa / Residencial" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">🛏 Habitaciones</label>
                      <input type="number" min="0" value={bedrooms} onChange={e => setBedrooms(e.target.value)} placeholder="3" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">🚿 Baños</label>
                      <input type="number" min="0" value={bathrooms} onChange={e => setBathrooms(e.target.value)} placeholder="2" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">🪨 Tipo de Pisos</label>
                    <input type="text" value={flooring} onChange={e => setFlooring(e.target.value)} placeholder="Mármol / Porcelanato / Madera" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">✨ Amenidades</label>
                    <input type="text" value={amenities} onChange={e => setAmenities(e.target.value)} placeholder="Piscina, Gimnasio, Estacionamiento" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                  </div>
                </>
              )}

              {/* ── VEHÍCULOS ── */}
              {category === 'fleet' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">🔩 Marca</label>
                      <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="RAM / Ford" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">🚚 Modelo</label>
                      <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="1500 / Transit" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">📅 Año</label>
                      <input type="text" value={manufactureYear} onChange={e => setManufactureYear(e.target.value)} placeholder="2024" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">📏 Kilometraje</label>
                      <input type="text" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="0 km" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">🔖 Serial / VIN</label>
                    <input type="text" value={vin} onChange={e => setVin(e.target.value)} placeholder="1HGBH41JXMN109186" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">⚙️ Transmisión</label>
                      <select value={transmission} onChange={e => setTransmission(e.target.value)} className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs">
                        <option>Automática</option>
                        <option>Manual</option>
                        <option>CVT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">🛞 Estado Cauchos</label>
                      <select value={tireCondition} onChange={e => setTireCondition(e.target.value)} className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs">
                        <option value="">Seleccionar...</option>
                        <option>Nuevos</option>
                        <option>Bueno</option>
                        <option>Regular</option>
                        <option>Necesita Cambio</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">🎨 Estado de Pintura</label>
                    <select value={paintCondition} onChange={e => setPaintCondition(e.target.value)} className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs">
                      <option>Excelente</option>
                      <option>Bueno</option>
                      <option>Regular (Rayones menores)</option>
                      <option>Necesita Retoque</option>
                    </select>
                  </div>
                </>
              )}

              {/* ── MAQUINARIA PESADA ── */}
              {category === 'heavy_machinery' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">🏭 Marca</label>
                      <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Caterpillar / Komatsu" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">🔧 Modelo</label>
                      <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="D8R / PC200" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">📅 Año Fabricación</label>
                      <input type="text" value={manufactureYear} onChange={e => setManufactureYear(e.target.value)} placeholder="2022" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">⏱️ Horas-Máquina</label>
                      <input type="text" value={machineHours} onChange={e => setMachineHours(e.target.value)} placeholder="0 hrs" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">🏋️ Capacidad de Carga</label>
                    <input type="text" value={loadCapacity} onChange={e => setLoadCapacity(e.target.value)} placeholder="40 toneladas" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">🔬 Estado de Mantenimiento</label>
                    <select value={maintenanceStatus} onChange={e => setMaintenanceStatus(e.target.value)} className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs">
                      <option>Al día</option>
                      <option>Revisión reciente</option>
                      <option>Requiere servicio próximo</option>
                    </select>
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
                💡 <strong>Modo Cuota Fija:</strong> Si Mínima = Máxima (ej. $13,000 USDT), el activo se fraccionará en cuotas fijas indivisibles.
              </p>

              {/* ── HOLD3RS Calculator ─────────────────── */}
              {isFixedQuota && parsedValuation > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-3 mt-1">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">HOLD3RS Totales</p>
                      <p className="text-[11px] text-neutral-300">${parsedValuation.toLocaleString()} ÷ ${parsedMin.toLocaleString()} USDT/cuota</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-white font-mono">{totalHold3rs}</span>
                    <p className="text-[10px] text-emerald-400 font-bold">HOLD3RS</p>
                  </div>
                </div>
              )}
              {!isFixedQuota && parsedMin > 0 && parsedMax > 0 && parsedMin !== parsedMax && (
                <p className="text-[10px] text-amber-400 font-medium pt-1">
                  ⚠️ Mínimo ≠ Máximo: modo de inversión libre (rango ${parsedMin.toLocaleString()} – ${parsedMax.toLocaleString()} USDT).
                </p>
              )}
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

            {/* Selector de Imágenes Múltiples desde Dispositivo / Supabase Storage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-300">
                  Galería de Fotos del Activo ({imagesList.length}/20)
                </label>
                {imagesList.length > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400">
                    {imagesList.length} {imagesList.length === 1 ? 'foto agregada' : 'fotos agregadas'}
                  </span>
                )}
              </div>

              {/* Input Múltiple para Seleccionar de Galería */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="file-upload-input-multiple"
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed text-xs font-semibold cursor-pointer transition-all ${
                    uploadingImage 
                      ? 'bg-neutral-800 border-neutral-600 text-neutral-400 cursor-wait'
                      : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400'
                  }`}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Subiendo fotos a Supabase Storage...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Seleccionar Múltiples Fotos (Galería Móvil/PC)</span>
                    </>
                  )}
                </label>
                <input
                  id="file-upload-input-multiple"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImage}
                  onChange={handleMultipleImagesUpload}
                  className="hidden"
                />
              </div>

              {/* Grid de Previsualización de Miniaturas */}
              {imagesList.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-neutral-950 p-2.5 rounded-2xl border border-white/10 max-h-48 overflow-y-auto">
                  {imagesList.map((url, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-white/15 h-20 bg-neutral-900 group">
                      <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-black/80 hover:bg-rose-600 text-white p-1 rounded-full text-xs transition-colors"
                        title="Remover esta foto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 text-[8px] font-mono bg-black/80 px-1 py-0.2 rounded text-neutral-300">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Opción Manual: Agregar URL adicional */}
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="O pega una URL de imagen (https://...)"
                  className="flex-1 bg-neutral-900 border border-white/15 text-white font-mono rounded-xl p-2 text-xs outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddManualUrl}
                  className="btn-secondary py-2 px-3 text-xs flex items-center gap-1"
                  title="Agregar URL a la Galería"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
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
