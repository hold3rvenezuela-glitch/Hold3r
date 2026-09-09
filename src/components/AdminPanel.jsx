import React, { useState, useEffect } from 'react';
import { PlusCircle, ShieldAlert, CheckCircle2, RefreshCw, Sliders, ArrowRight, HelpCircle, Upload, Loader2, X, Shield, Trash2, Plus, Users, TrendingUp, Search, Filter, FileText, ExternalLink, Download, Copy, Check } from 'lucide-react';
import { createAsset, updateAssetStatus, deleteAsset, uploadMultipleAssetImages, fetchAllPurchases, fetchKycVerifications, reviewKycVerification } from '../services/api';
import { generateCorporateContractPDF } from './MyInvestmentsView';

export default function AdminPanel({ assets, userProfile, onAssetCreated, onRefresh, onViewCatalog }) {
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'purchases'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lastCreatedAsset, setLastCreatedAsset] = useState(null);

  // Historial de Compras RWA State
  const [purchasesList, setPurchasesList] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [purchasesCategoryFilter, setPurchasesCategoryFilter] = useState('all');
  const [selectedAdminContractShare, setSelectedAdminContractShare] = useState(null);
  const [copiedAdminHash, setCopiedAdminHash] = useState(false);

  // KYC Verifications State
  const [kycList, setKycList] = useState([]);
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [selectedKycPhoto, setSelectedKycPhoto] = useState(null);
  const [expandedKycId, setExpandedKycId] = useState(null);

  useEffect(() => {
    if (activeTab === 'purchases') {
      loadPurchasesHistory();
    } else if (activeTab === 'kyc') {
      loadKycVerifications();
    }
  }, [activeTab]);

  const loadPurchasesHistory = async () => {
    setLoadingPurchases(true);
    try {
      const data = await fetchAllPurchases();
      setPurchasesList(data || []);
    } catch (err) {
      console.error('Error al cargar historial de compras:', err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const loadKycVerifications = async () => {
    setLoadingKyc(true);
    try {
      const data = await fetchKycVerifications();
      setKycList(data || []);
    } catch (err) {
      console.error('Error al cargar verificaciones KYC:', err);
    } finally {
      setLoadingKyc(false);
    }
  };

  const handleReviewKyc = async (kycId, userId, status, reason = '') => {
    try {
      await reviewKycVerification({ kycId, userId, status, rejectionReason: reason });
      setSuccessMsg(`Estado KYC actualizado a "${status === 'approved' ? 'Aprobado' : 'Rechazado'}" exitosamente.`);
      loadKycVerifications();
    } catch (err) {
      setErrorMsg(err.message || 'Error al actualizar revisión KYC.');
    }
  };

  const handleCopyAdminHash = (hashStr) => {
    if (!hashStr) return;
    navigator.clipboard.writeText(hashStr);
    setCopiedAdminHash(true);
    setTimeout(() => setCopiedAdminHash(false), 2000);
  };

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

  // ── Cantidad de Holders (auto-calculador de cuota fija) ──────
  const [numHolders, setNumHolders] = useState('');
  
  // ── Valor Real de Mercado (USD) - Gancho de Inversión ────────
  const [marketValuation, setMarketValuation] = useState('');

  // ── Ratings 0-10 por categoría (etiquetas exclusivas según categoría) ─
  const [ratings, setRatings] = useState({
    // Maquinaria Pesada: Motor, Cabina, Neumáticos, Pintura, Bomba Hidráulica, Mantenimiento
    engine_machinery: 8, cabin_machinery: 8, tires_machinery: 8, paint_machinery: 8, hydraulic_machinery: 8, maintenance_machinery: 8,
    // Vehículo: Motor, Tren, Pintura, Caja, Neumáticos
    engine_vehicle: 8, drive_vehicle: 8, paint_vehicle: 8, gearbox_vehicle: 8, tires_vehicle: 8,
    // Bienes Raíces: Pintura, Pisos, Baños, Cuartos, Cocina, Estructura, Ubicación
    paint_realestate: 8, floors_realestate: 8, bathrooms_realestate: 8, rooms_realestate: 8, kitchen_realestate: 8, structure_realestate: 8, location_realestate: 8
  });

  const updateRating = (key, delta) => {
    setRatings(prev => ({
      ...prev,
      [key]: Math.min(10, Math.max(0, (prev[key] ?? 8) + delta))
    }));
  };

  // ── Ubicación Dinámica (Venezuela e Importación) ──────────────
  const [selectedCity, setSelectedCity] = useState('Caracas, Venezuela');
  const [customCity, setCustomCity] = useState('');
  const [isImported, setIsImported] = useState('no'); // 'no' | 'venezuela_import' | 'usa_import'
  const [originPort, setOriginPort] = useState('Puerto de Miami, FL (USA)');
  const [arrivalPort, setArrivalPort] = useState('Puerto Cabello, Carabobo (VE)');
  const [arrivalDays, setArrivalDays] = useState('25');

  // ── Alquiler Estimado & ROI Reventa ──────────────────────────
  const [estimatedRentalPrice, setEstimatedRentalPrice] = useState('');
  const [estimatedRentalPeriod, setEstimatedRentalPeriod] = useState('mensual'); // 'diario' | 'mensual'
  const [estimatedResaleRoiMonths, setEstimatedResaleRoiMonths] = useState('');

  // ── Bienes Raíces (real_estate) ──────────────────────────────
  const [location, setLocation] = useState('Caracas, Venezuela');
  const [areaM2, setAreaM2] = useState('');
  const [propertyType, setPropertyType] = useState('Residencial');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [flooring, setFlooring] = useState('');
  const [amenities, setAmenities] = useState('');

  // ── Vehículos (fleet) ────────────────────────────────────────
  const [vehicleTitle, setVehicleTitle] = useState('1-1'); // Título 1-1, 2-1, 3-1, etc.
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState('');
  const [transmission, setTransmission] = useState('Automática');

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
  const parsedNumHolders = Number(numHolders) || 0;
  // If numHolders is set, override min/max with the auto-calculated quota
  const autoQuota = parsedNumHolders > 0 && parsedValuation > 0
    ? Math.floor(parsedValuation / parsedNumHolders)
    : 0;
  const effectiveMin = autoQuota > 0 ? autoQuota : parsedMin;
  const effectiveMax = autoQuota > 0 ? autoQuota : parsedMax;
  const isFixedQuota = effectiveMin > 0 && effectiveMax > 0 && effectiveMin === effectiveMax;
  const totalHold3rs = autoQuota > 0
    ? parsedNumHolders
    : (isFixedQuota && parsedMin > 0 ? Math.floor(parsedValuation / parsedMin) : 0);

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

      // Resolver ubicación final
      const finalLocation = selectedCity === 'custom' ? customCity : selectedCity;

      // Construir objeto metadata técnica según categoría
      let metadata = {
        location: finalLocation,
        is_imported: isImported,
        origin_port: isImported === 'usa_import' ? originPort : null,
        arrival_port: isImported === 'usa_import' ? arrivalPort : null,
        arrival_days: isImported === 'usa_import' ? arrivalDays : null,
        estimated_rental_price: estimatedRentalPrice ? Number(estimatedRentalPrice) : null,
        estimated_rental_period: estimatedRentalPeriod,
        estimated_resale_roi_months: estimatedResaleRoiMonths ? Number(estimatedResaleRoiMonths) : null,
      };

      if (category === 'real_estate') {
        metadata = {
          ...metadata,
          area_m2: areaM2,
          property_type: propertyType,
          bedrooms,
          bathrooms,
          flooring,
          amenities
        };
      } else if (category === 'fleet') {
        metadata = {
          ...metadata,
          vehicle_title: vehicleTitle,
          vin,
          mileage,
          transmission,
          brand,
          model: modelName,
          year: manufactureYear
        };
      } else if (category === 'heavy_machinery') {
        metadata = {
          ...metadata,
          brand,
          model: modelName,
          year: manufactureYear,
          machine_hours: machineHours,
          load_capacity: loadCapacity,
          maintenance_status: maintenanceStatus
        };
      }

      // Si se especificó Valor Real de Mercado, incluirlo en metadata
      if (marketValuation && Number(marketValuation) > 0) {
        metadata.market_valuation = Number(marketValuation);
      }

      // Construir objeto ratings según categoría
      let activeRatings = {};
      if (category === 'real_estate') {
        activeRatings = {
          paint: ratings.paint_realestate,
          floors: ratings.floors_realestate,
          bathrooms: ratings.bathrooms_realestate,
          rooms: ratings.rooms_realestate,
          kitchen: ratings.kitchen_realestate,
          structure: ratings.structure_realestate,
          location: ratings.location_realestate,
        };
      } else if (category === 'fleet') {
        activeRatings = {
          engine: ratings.engine_vehicle,
          drive: ratings.drive_vehicle,
          paint: ratings.paint_vehicle,
          gearbox: ratings.gearbox_vehicle,
          tires: ratings.tires_vehicle,
        };
      } else if (category === 'heavy_machinery') {
        activeRatings = {
          engine: ratings.engine_machinery,
          cabin: ratings.cabin_machinery,
          tires: ratings.tires_machinery,
          paint: ratings.paint_machinery,
          hydraulic: ratings.hydraulic_machinery,
          maintenance: ratings.maintenance_machinery,
        };
      }

      // Calcular cuota final considerando numHolders
      const autoQuotaFinal = parsedNumHolders > 0 && parsedValuation > 0
        ? Math.floor(parsedValuation / parsedNumHolders)
        : null;
      const finalMin = autoQuotaFinal || (minInvestment ? Number(minInvestment) : 10);
      const finalMax = autoQuotaFinal || (maxInvestment ? Number(maxInvestment) : null);

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
        ratings: activeRatings,
        num_holders: parsedNumHolders > 0 ? parsedNumHolders : null,
        min_investment: finalMin,
        max_investment: finalMax
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
      setNumHolders('');
      setMarketValuation('');
      setDescription('');
      setRatings({
        engine_machinery: 8, cabin_machinery: 8, tires_machinery: 8, paint_machinery: 8, hydraulic_machinery: 8, maintenance_machinery: 8,
        engine_vehicle: 8, drive_vehicle: 8, paint_vehicle: 8, gearbox_vehicle: 8, tires_vehicle: 8,
        paint_realestate: 8, floors_realestate: 8, bathrooms_realestate: 8, rooms_realestate: 8, kitchen_realestate: 8, structure_realestate: 8, location_realestate: 8
      });
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

  const filteredPurchases = purchasesList.filter(item => {
    const asset = item.asset || {};
    const profile = item.profile || {};
    
    const matchesCategory = purchasesCategoryFilter === 'all' || asset.category === purchasesCategoryFilter;
    const q = purchasesSearch.toLowerCase().trim();
    if (!q) return matchesCategory;

    const name = (profile.full_name || '').toLowerCase();
    const docId = (profile.document_id || '').toLowerCase();
    const userId = (item.user_id || '').toLowerCase();
    const assetTitle = (asset.title || '').toLowerCase();
    const hash = (item.signed_contract_hash || '').toLowerCase();

    return matchesCategory && (name.includes(q) || docId.includes(q) || userId.includes(q) || assetTitle.includes(q) || hash.includes(q));
  });

  const totalPurchasesVolume = purchasesList.reduce((acc, curr) => acc + Number(curr.amount_invested_usdt || 0), 0);
  const uniqueInvestorsCount = new Set(purchasesList.map(p => p.user_id)).size;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-2xl font-extrabold text-white">Panel de Administración RWA</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Gestión de activos tokenizados e historial de compras auditables en Binance Smart Chain.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-neutral-900/90 p-1.5 rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'manage'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" /> Publicar y Gestionar Activos
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'purchases'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Historial de Compras RWA ({purchasesList.length})
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'kyc'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Verificaciones KYC ({kycList.filter(k => k.status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
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

      {/* VISTA 1: GESTIÓN Y PUBLICACIÓN DE ACTIVOS */}
      {activeTab === 'manage' && (
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

            {/* Selector de Ubicación e Importación (Venezuela / USA) */}
            <div className="bg-neutral-900/90 border border-emerald-500/30 p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                📍 Ubicación & Origen del Activo
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-300 mb-1">Ciudad en Venezuela / Ubicación</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                  >
                    <option value="Caracas, Venezuela">Caracas, Venezuela</option>
                    <option value="Valencia, Carabobo">Valencia, Carabobo</option>
                    <option value="Maracaibo, Zulia">Maracaibo, Zulia</option>
                    <option value="Barquisimeto, Lara">Barquisimeto, Lara</option>
                    <option value="Maracay, Aragua">Maracay, Aragua</option>
                    <option value="Puerto La Cruz, Anzoátegui">Puerto La Cruz, Anzoátegui</option>
                    <option value="Puerto Ordaz, Bolívar">Puerto Ordaz, Bolívar</option>
                    <option value="Margarita, Nueva Esparta">Margarita, Nueva Esparta</option>
                    <option value="Mérida, Mérida">Mérida, Mérida</option>
                    <option value="San Cristóbal, Táchira">San Cristóbal, Táchira</option>
                    <option value="Maturín, Monagas">Maturín, Monagas</option>
                    <option value="Barinas, Barinas">Barinas, Barinas</option>
                    <option value="custom">Otra ciudad / Importación...</option>
                  </select>
                </div>

                {selectedCity === 'custom' && (
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">Escribe la ciudad / pueblo libre</label>
                    <input
                      type="text"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      placeholder="Ej. El Tigre / Cabimas / Miami, FL"
                      className="w-full bg-neutral-950 border border-emerald-500/40 text-white rounded-lg p-2 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Opción Activo Importado */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <label className="block text-[11px] font-semibold text-neutral-300">¿Es un activo Importado?</label>
                <select
                  value={isImported}
                  onChange={(e) => setIsImported(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                >
                  <option value="no">No, está listo e instalado en Venezuela</option>
                  <option value="venezuela_import">Está en Venezuela (En proceso de nacionalización / aduana)</option>
                  <option value="usa_import">Está en USA (En tránsito marítimo hacia Venezuela)</option>
                </select>

                {isImported === 'usa_import' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30">
                    <div>
                      <label className="block text-[10px] text-emerald-300 mb-0.5 font-semibold">Puerto de Origen (USA)</label>
                      <input
                        type="text"
                        value={originPort}
                        onChange={(e) => setOriginPort(e.target.value)}
                        placeholder="Miami, FL"
                        className="w-full bg-neutral-950 border border-white/10 text-white rounded p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-emerald-300 mb-0.5 font-semibold">Puerto Llegada (VE)</label>
                      <input
                        type="text"
                        value={arrivalPort}
                        onChange={(e) => setArrivalPort(e.target.value)}
                        placeholder="Puerto Cabello"
                        className="w-full bg-neutral-950 border border-white/10 text-white rounded p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-emerald-300 mb-0.5 font-semibold">Días Estimados Llegada</label>
                      <input
                        type="number"
                        value={arrivalDays}
                        onChange={(e) => setArrivalDays(e.target.value)}
                        placeholder="25"
                        className="w-full bg-neutral-950 border border-white/10 text-white rounded p-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Estimación de Alquiler & Retorno por Reventa */}
            <div className="bg-neutral-900/90 border border-cyan-500/30 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                💰 Estimación de Alquiler & Tiempo de Reventa (ROI)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-300 mb-1">Precio Alquiler Aproximado (USDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={estimatedRentalPrice}
                    onChange={(e) => setEstimatedRentalPrice(e.target.value)}
                    placeholder="Ej. 1200"
                    className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-300 mb-1">Periodo Alquiler</label>
                  <select
                    value={estimatedRentalPeriod}
                    onChange={(e) => setEstimatedRentalPeriod(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs"
                  >
                    <option value="mensual">Mensual (USD/mes)</option>
                    <option value="diario">Diario (USD/día)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-300 mb-1">Tiempo Reventa Estimado (Meses)</label>
                  <input
                    type="number"
                    min="1"
                    value={estimatedResaleRoiMonths}
                    onChange={(e) => setEstimatedResaleRoiMonths(e.target.value)}
                    placeholder="Ej. 12 meses"
                    className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>
              {parsedNumHolders > 0 && Number(estimatedRentalPrice) > 0 && (
                <p className="text-[10px] text-cyan-300 font-semibold bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/30">
                  🔥 Alquiler estimado por Holder ({parsedNumHolders} acciones): <strong className="text-white font-mono">+${Math.floor(Number(estimatedRentalPrice) / parsedNumHolders).toLocaleString()} USDT / holder</strong> ({estimatedRentalPeriod})
                </p>
              )}
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
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">📐 Área total (m²)</label>
                    <input type="text" value={areaM2} onChange={e => setAreaM2(e.target.value)} placeholder="180 m²" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs" />
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
                      <label className="block text-[11px] text-neutral-300 mb-1">📄 Título del Vehículo</label>
                      <input type="text" value={vehicleTitle} onChange={e => setVehicleTitle(e.target.value)} placeholder="Título 1-1" className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs font-mono font-bold" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-300 mb-1">⚙️ Transmisión</label>
                      <select value={transmission} onChange={e => setTransmission(e.target.value)} className="w-full bg-neutral-950 border border-white/10 text-white rounded-lg p-2 text-xs">
                        <option>Automática</option>
                        <option>Manual</option>
                        <option>CVT</option>
                      </select>
                    </div>
                  </div>
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

            {/* Cantidad de Holders (Calculador Automático de Cuota Fija) */}
            <div className="bg-neutral-900/90 border border-purple-500/30 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                Calculador por Núm. de Holders
              </div>
              <div>
                <label className="block text-[11px] text-neutral-300 mb-1">
                  Cantidad de Holders (Socios)
                </label>
                <input
                  type="number"
                  min="1"
                  value={numHolders}
                  onChange={(e) => setNumHolders(e.target.value)}
                  placeholder="Ej. 10"
                  className="w-full bg-neutral-950 border border-purple-500/30 text-white font-mono rounded-lg p-2 text-xs outline-none focus:border-purple-400"
                />
              </div>
              {parsedNumHolders > 0 && parsedValuation > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300">Valor de Acción Calculado</p>
                    <p className="text-[11px] text-neutral-300">${parsedValuation.toLocaleString()} ÷ {parsedNumHolders} holders</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-white font-mono">${autoQuota.toLocaleString()}</span>
                    <p className="text-[10px] text-purple-400 font-bold">USDT / acción</p>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                💡 Al ingresar la cantidad de holders, el sistema calculará automáticamente la acción fija (Mín = Máx). Los campos manuales de Inversión Mín / Máx quedan como respaldo si dejas este campo vacío.
              </p>
            </div>

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
                💡 <strong>Modo Acción Fija:</strong> Si Mínima = Máxima (ej. $13,000 USDT), el activo se fraccionará en acciones fijas indivisibles.
              </p>

              {/* ── HOLD3RS Calculator ─────────────────── */}
              {isFixedQuota && parsedValuation > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-3 mt-1">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">HOLD3RS Totales</p>
                      <p className="text-[11px] text-neutral-300">
                        ${parsedValuation.toLocaleString()} ÷ ${(autoQuota > 0 ? autoQuota : effectiveMin).toLocaleString()} USDT/acción
                      </p>
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

            {/* Valor Real de Mercado (USD) — Gancho de Inversión / Plusvalía */}
            <div className="bg-neutral-900/90 border border-emerald-500/30 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Valor Real de Mercado (USD)
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/40">
                  Gancho de Inversión
                </span>
              </div>
              <div>
                <label className="block text-[11px] text-neutral-300 mb-1">
                  Valor Comercial Estimado de Mercado (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={marketValuation}
                  onChange={(e) => setMarketValuation(e.target.value)}
                  placeholder="Ej. 170000"
                  className="w-full bg-neutral-950 border border-emerald-500/30 text-white font-mono rounded-lg p-2 text-xs outline-none focus:border-emerald-400"
                />
              </div>
              {(() => {
                const parsedMkt = Number(marketValuation) || 0;
                const appreciation = parsedMkt - parsedValuation;
                const gainPerHolder = totalHold3rs > 0 && appreciation > 0 ? Math.floor(appreciation / totalHold3rs) : 0;
                if (parsedMkt > parsedValuation && parsedValuation > 0) {
                  return (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-300">Precio Adquisición: <strong className="text-white font-mono">${parsedValuation.toLocaleString()}</strong></span>
                        <span className="text-emerald-400 font-bold font-mono">Valor Mercado: ${parsedMkt.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-500/20">
                        <span className="font-extrabold text-emerald-300">Plusvalía Proyectada:</span>
                        <span className="font-extrabold text-emerald-400 font-mono">+${appreciation.toLocaleString()} USDT</span>
                      </div>
                      {gainPerHolder > 0 && (
                        <p className="text-[10px] text-emerald-300/90 font-medium text-right">
                          🔥 Ganancia estimada: <strong className="text-white font-mono">+${gainPerHolder.toLocaleString()} USDT</strong> por Holder
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                💡 Opcional. Permite resaltar el descuento de compra y la ganancia por revalorización en la ficha técnica del inversionista.
              </p>
            </div>

            {/* Ratings 0-10 por Categoría */}
            <div className="bg-neutral-900/90 border border-amber-500/30 p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                ★ Calificación del Activo (0–10)
              </div>
              {(() => {
                const ratingItems = category === 'heavy_machinery' ? [
                  { key: 'engine_machinery', label: '⚙️ Motor' },
                  { key: 'cabin_machinery', label: '💺 Cabina' },
                  { key: 'tires_machinery', label: '🛞 Neumáticos' },
                  { key: 'paint_machinery', label: '🎨 Pintura' },
                  { key: 'hydraulic_machinery', label: '💧 Bomba Hidráulica' },
                  { key: 'maintenance_machinery', label: '🔬 Mantenimiento' },
                ] : category === 'fleet' ? [
                  { key: 'engine_vehicle', label: '⚙️ Motor' },
                  { key: 'drive_vehicle', label: '🏎️ Tren' },
                  { key: 'paint_vehicle', label: '🎨 Pintura' },
                  { key: 'gearbox_vehicle', label: '🕹️ Caja' },
                  { key: 'tires_vehicle', label: '🛞 Neumáticos' },
                ] : [
                  { key: 'paint_realestate', label: '🎨 Pintura' },
                  { key: 'floors_realestate', label: '🪨 Pisos' },
                  { key: 'bathrooms_realestate', label: '🚿 Baños' },
                  { key: 'rooms_realestate', label: '🛏️ Cuartos' },
                  { key: 'kitchen_realestate', label: '🍳 Cocina' },
                  { key: 'structure_realestate', label: '🏢 Estructura' },
                  { key: 'location_realestate', label: '📍 Ubicación' },
                ];
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ratingItems.map(({ key, label }) => {
                      const val = ratings[key] ?? 8;
                      const color = val >= 8 ? 'text-emerald-400' : val >= 5 ? 'text-amber-400' : 'text-rose-400';
                      const badge = val >= 8 ? 'bg-emerald-500/15 border-emerald-500/30' : val >= 5 ? 'bg-amber-500/15 border-amber-500/30' : 'bg-rose-500/15 border-rose-500/30';
                      return (
                        <div key={key} className="flex items-center justify-between gap-1.5 bg-neutral-950/60 p-2 rounded-xl border border-white/5">
                          <span className="text-[11px] text-neutral-300 truncate">{label}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateRating(key, -1)}
                              className="w-5 h-5 rounded bg-neutral-800 hover:bg-rose-500/20 text-neutral-300 text-xs font-bold flex items-center justify-center transition-colors"
                            >−</button>
                            <span className={`w-8 text-center font-extrabold text-xs font-mono border rounded px-1 py-0.5 ${color} ${badge}`}>
                              {val}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateRating(key, +1)}
                              className="w-5 h-5 rounded bg-neutral-800 hover:bg-emerald-500/20 text-neutral-300 text-xs font-bold flex items-center justify-center transition-colors"
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
      )}

      {/* VISTA 2: HISTORIAL DE COMPRAS RWA Y CONTRATOS AUDITABLES */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="glass-panel p-5 border border-emerald-500/30">
              <span className="text-xs text-neutral-400 font-medium block mb-1">Volumen Total Recaudado</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ${totalPurchasesVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
              </span>
            </div>

            <div className="glass-panel p-5 border border-cyan-500/30">
              <span className="text-xs text-neutral-400 font-medium block mb-1">Transacciones Minadas en BSC</span>
              <span className="text-2xl font-black text-cyan-300 font-mono">
                {purchasesList.length} Compras
              </span>
            </div>

            <div className="glass-panel p-5 border border-indigo-500/30">
              <span className="text-xs text-neutral-400 font-medium block mb-1">Inversores Registrados</span>
              <span className="text-2xl font-black text-indigo-300 font-mono">
                {uniqueInvestorsCount} Únicos
              </span>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="glass-panel p-5 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={purchasesSearch}
                onChange={(e) => setPurchasesSearch(e.target.value)}
                placeholder="Buscar por inversor, Cédula/RIF, ID usuario, activo o Hash BSC..."
                className="w-full bg-neutral-900 border border-white/15 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-emerald-500/60"
              />
              {purchasesSearch && (
                <button
                  onClick={() => setPurchasesSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'real_estate', label: 'Bienes Raíces' },
                { id: 'heavy_machinery', label: 'Maquinaria' },
                { id: 'fleet', label: 'Vehículos' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setPurchasesCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    purchasesCategoryFilter === cat.id
                      ? 'bg-emerald-500 text-neutral-950 font-bold'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              
              <button
                onClick={loadPurchasesHistory}
                className="p-2 bg-neutral-900 border border-white/10 rounded-xl hover:border-emerald-500/50 text-neutral-400 hover:text-emerald-400 transition-colors ml-2"
                title="Refrescar Compras"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPurchases ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* List of Filtered Purchases */}
          {loadingPurchases ? (
            <div className="glass-panel p-12 text-center text-neutral-400 text-xs font-mono">
              Cargando historial de compras desde Supabase...
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="glass-panel p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-neutral-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No se encontraron compras con el filtro aplicado</h4>
              <p className="text-xs text-neutral-400">Intenta cambiar los términos de búsqueda o seleccionar otra categoría.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPurchases.map((item, idx) => {
                const asset = item.asset || {};
                const profile = item.profile || {};
                const firstImg = Array.isArray(asset.images) && asset.images.length > 0
                  ? asset.images[0]
                  : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80';

                const txHash = item.signed_contract_hash || item.signed_contract_hash || '0x7f8a...';
                const bscScanUrl = `https://bscscan.com/tx/${txHash}`;
                const amount = Number(item.amount_invested_usdt || 0);

                return (
                  <div
                    key={item.id || `purchase-${idx}`}
                    className="glass-panel p-5 border border-white/10 hover:border-emerald-500/40 transition-colors space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                      
                      {/* Asset & Investor info */}
                      <div className="flex items-start gap-4">
                        <img
                          src={firstImg}
                          alt={asset.title || 'Activo RWA'}
                          className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0 bg-neutral-900"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`badge-category badge-${asset.category || 'real_estate'}`}>
                              {asset.category === 'real_estate' ? 'Bienes Raíces' : asset.category === 'heavy_machinery' ? 'Maquinaria' : 'Vehículos'}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400">
                              {item.purchased_at ? new Date(item.purchased_at).toLocaleString('es-VE') : 'Hoy'}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white">{asset.title || 'Activo Tokenizado RWA'}</h4>
                          
                          {/* Profile Data */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-300 font-mono pt-1">
                            <span>Inversor: <strong className="text-white">{profile.full_name || 'Inversor Autenticado'}</strong></span>
                            <span>Cédula/RIF: <strong className="text-emerald-400">{profile.document_id || 'V-00000000'}</strong></span>
                            <span>ID: <strong className="text-neutral-400">{item.user_id ? `${item.user_id.substring(0,8)}...` : 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Stats & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto shrink-0">
                        {/* Numbers */}
                        <div className="bg-neutral-950 border border-white/10 p-3 rounded-xl font-mono text-xs space-y-1 min-w-[170px]">
                          <div className="flex justify-between gap-2">
                            <span className="text-neutral-400">Inyección:</span>
                            <strong className="text-emerald-400">${amount.toLocaleString()} USDT</strong>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-neutral-400">Participación:</span>
                            <strong className="text-cyan-300">{Number(item.shares_percentage || 0).toFixed(4)}%</strong>
                          </div>
                        </div>

                        {/* Hash & Actions */}
                        <div className="space-y-2 w-full sm:w-auto text-right">
                          <div className="flex items-center gap-1.5">
                            <div className="bg-neutral-950 border border-white/10 px-2.5 py-1.5 rounded-xl text-[10px] font-mono text-emerald-300 truncate max-w-[150px] sm:max-w-xs block">
                              {txHash}
                            </div>
                            <button
                              onClick={() => handleCopyAdminHash(txHash)}
                              className="p-1.5 bg-neutral-950 border border-white/10 rounded-xl hover:border-emerald-500/50 text-neutral-400 hover:text-emerald-400 transition-colors"
                              title="Copiar Hash"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={bscScanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-neutral-950 border border-white/10 rounded-xl hover:border-emerald-500/50 text-neutral-400 hover:text-emerald-400 transition-colors"
                              title="Ver en BscScan"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          <button
                            onClick={() => setSelectedAdminContractShare(item)}
                            className="btn-secondary text-[11px] py-1.5 px-3 font-bold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 w-full flex items-center justify-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ver Certificado Jurídico
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ── TAB 3: MÓDULO DE VERIFICACIÓN Y APROBACIÓN KYC ── */}
      {activeTab === 'kyc' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase font-mono flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Solicitudes de Verificación KYC
              </h3>
              <p className="text-xs text-neutral-400">
                Revisa los documentos legales y la foto selfie en vivo de los usuarios para aprobar o rechazar su capacidad de inversión.
              </p>
            </div>
            <button
              onClick={loadKycVerifications}
              className="btn-secondary text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingKyc ? 'animate-spin' : ''}`} /> Refrescar Solicitudes
            </button>
          </div>

          {loadingKyc ? (
            <div className="p-12 text-center text-xs font-mono text-neutral-400 bg-neutral-900/50 rounded-2xl border border-neutral-800">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
              Cargando solicitudes KYC desde Supabase...
            </div>
          ) : kycList.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400 bg-neutral-900/40 rounded-2xl border border-neutral-800">
              <CheckCircle2 className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="font-bold text-white text-sm">No hay solicitudes KYC registradas</p>
              <p className="mt-1">Las nuevas verificaciones enviadas por usuarios aparecerán aquí para tu revisión.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {kycList.map(item => {
                const isPending = item.status === 'pending';
                const isApproved = item.status === 'approved';
                const isRejected = item.status === 'rejected';
                const isExpanded = expandedKycId === item.id;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl overflow-hidden transition-all duration-300"
                    style={{ 
                      background: '#111715', 
                      border: isPending ? '1px solid rgba(234,179,8,0.35)' : isApproved ? '1px solid rgba(0,255,136,0.28)' : '1px solid rgba(239,68,68,0.28)' 
                    }}
                  >
                    {/* ── RESUMEN COMPACTO (siempre visible) ── */}
                    <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Info principal */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-lg ${
                          isPending ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                          : isApproved ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : 'bg-red-500/15 border border-red-500/30 text-red-400'
                        }`}>
                          {item.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-white truncate">{item.full_name}</h4>
                            <span className="text-xs font-mono text-emerald-400 font-bold shrink-0">
                              @{item.profile?.nickname || 'usuario'}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            Cédula/RIF: <strong className="text-neutral-200">{item.document_id}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Badge + Botones de acción */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                          isPending ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          isApproved ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          'bg-red-950 text-red-400 border border-red-800'
                        }`}>
                          {isPending ? '● Pendiente' : isApproved ? '✓ Aprobado' : '✕ Rechazado'}
                        </span>

                        {isPending && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReviewKyc(item.id, item.user_id, 'approved'); }}
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold rounded-lg transition-all"
                            >
                              ✓ Aprobar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const reason = prompt('Indica el motivo de rechazar esta solicitud KYC:');
                                if (reason) handleReviewKyc(item.id, item.user_id, 'rejected', reason);
                              }}
                              className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-[11px] font-bold rounded-lg transition-all"
                            >
                              ✕ Rechazar
                            </button>
                          </>
                        )}

                        {/* Botón de expansión */}
                        <button
                          onClick={() => setExpandedKycId(isExpanded ? null : item.id)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
                            isExpanded
                              ? 'bg-neutral-700 text-white border-neutral-600'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {isExpanded ? 'Cerrar Expediente' : 'Ver Expediente / Documentos'}
                          <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                        </button>
                      </div>
                    </div>

                    {/* ── DETALLES EXPANDIDOS (acordeón) ── */}
                    {isExpanded && (
                      <div className="border-t border-neutral-800 p-4 space-y-4 animate-fade-in">
                        {/* Dirección y Wallet BEP20 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase mb-1">Dirección de Vivienda:</span>
                            <strong className="text-neutral-200 text-[11px]">{item.address_street ? `${item.address_street}, ` : ''}{item.address_city}, Estado {item.address_state}, {item.address_country}</strong>
                          </div>
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase mb-1">Wallet BEP20 para Ganancias:</span>
                            <strong className="text-emerald-400 break-all text-[11px]">{item.bep20_wallet}</strong>
                          </div>
                          {item.birth_date && (
                            <div>
                              <span className="text-neutral-400 block text-[10px] uppercase mb-1">Fecha de Nacimiento:</span>
                              <strong className="text-neutral-200">{item.birth_date}</strong>
                            </div>
                          )}
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase mb-1">Fecha de Solicitud:</span>
                            <strong className="text-neutral-200">{item.created_at ? new Date(item.created_at).toLocaleString('es-VE') : 'N/A'}</strong>
                          </div>
                        </div>

                        {/* Galería de Documentos y Selfie */}
                        <div>
                          <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-2 font-bold">
                            Documentos Cargados y Foto Selfie en Vivo:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Cédula */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-neutral-400 font-mono">1. Foto de Cédula</span>
                              <div 
                                onClick={() => setSelectedKycPhoto(item.id_document_url)}
                                className="h-36 rounded-xl overflow-hidden border border-neutral-700 bg-black cursor-pointer group relative"
                              >
                                <img src={item.id_document_url} alt="Cédula" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity">
                                  Ampliar Foto
                                </div>
                              </div>
                            </div>

                            {/* RIF */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-neutral-400 font-mono">2. Foto de RIF</span>
                              <div 
                                onClick={() => setSelectedKycPhoto(item.rif_document_url)}
                                className="h-36 rounded-xl overflow-hidden border border-neutral-700 bg-black cursor-pointer group relative"
                              >
                                <img src={item.rif_document_url} alt="RIF" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity">
                                  Ampliar Foto
                                </div>
                              </div>
                            </div>

                            {/* Selfie Cámara */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-400 font-mono font-bold">3. Selfie en Vivo (Cámara)</span>
                              <div 
                                onClick={() => setSelectedKycPhoto(item.selfie_url)}
                                className="h-36 rounded-xl overflow-hidden border border-emerald-500/50 bg-black cursor-pointer group relative"
                              >
                                <img src={item.selfie_url} alt="Selfie" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity">
                                  Ampliar Foto
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Lightbox para fotos KYC */}
          {selectedKycPhoto && (
            <div 
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedKycPhoto(null)}
            >
              <div className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden border border-white/20">
                <button
                  onClick={() => setSelectedKycPhoto(null)}
                  className="absolute top-3 right-3 p-2 bg-neutral-900/80 text-white rounded-full font-bold"
                >✕</button>
                <img src={selectedKycPhoto} alt="Documento KYC" className="w-full h-full object-contain max-h-[85vh]" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL VISOR DE CERTIFICADO JURÍDICO DESDE PANEL DE ADMIN ── */}
      {selectedAdminContractShare && (() => {
        const item = selectedAdminContractShare;
        const asset = item.asset || {};
        const profile = item.profile || {};
        const purchasedDate = item.purchased_at ? new Date(item.purchased_at).toLocaleString('es-VE') : new Date().toLocaleString('es-VE');
        const txHash = item.signed_contract_hash || '0x7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a';
        const numAmount = Number(item.amount_invested_usdt || 0);
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
                    <h3 className="text-base font-extrabold text-white tracking-wide uppercase">CERTIFICADO JURÍDICO OFICIAL RWA (ADMIN VIEW)</h3>
                    <p className="text-[11px] text-emerald-400 font-mono font-semibold">HOLD3R PROTOCOL VENEZUELA • AUDITORÍA DE CONTRATO ON-CHAIN</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAdminContractShare(null)}
                  className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Documento Estilizado Certificado */}
              <div className="bg-neutral-900/90 p-6 sm:p-8 rounded-xl border border-emerald-500/30 space-y-6 text-xs text-neutral-300 leading-relaxed font-sans relative overflow-hidden shadow-inner">
                
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
                      AUDITORÍA ADMIN DE CONTRATO
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
                    <div><span className="text-neutral-400 block">Nombre Completo del Inversor:</span> <strong className="text-white">{profile.full_name || 'Inversionista Autenticado'}</strong></div>
                    <div><span className="text-neutral-400 block">Documento de Identidad / RIF:</span> <strong className="text-white">{profile.document_id || 'V-00000000'}</strong></div>
                    <div><span className="text-neutral-400 block">ID de Usuario:</span> <strong className="text-emerald-400 font-bold truncate block">@{profile.nickname || 'inversor'}</strong></div>
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
                    <div><span className="text-neutral-400 block">Porcentaje de Participación:</span> <strong className="text-cyan-300 text-sm">{Number(item.shares_percentage || 0).toFixed(4)}%</strong></div>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-neutral-400 block mb-1">Hash de Transacción Real (BSC):</span>
                      <strong className="text-emerald-300 text-[10px] break-all font-mono block bg-neutral-950 p-2 rounded-lg border border-emerald-500/30">{txHash}</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Botones de Acción Admin */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-[11px] text-neutral-400 font-mono">Vista administrativa para auditoría de certificados RWA.</p>
                <div className="flex items-center gap-3">
                  <a
                    href={bscScanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs flex items-center gap-1.5 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20 py-2 px-4"
                  >
                    <ExternalLink className="w-4 h-4" /> BscScan
                  </a>
                  <button
                    onClick={() => generateCorporateContractPDF({ share: item, userProfile: profile, asset, purchasedDate, txHash, numAmount })}
                    className="btn-primary text-xs flex items-center gap-2 bg-emerald-500 text-neutral-950 font-bold py-2 px-4"
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

