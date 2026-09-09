import React, { useState, useRef } from 'react';
import { ShieldCheck, Camera, Upload, CheckCircle, AlertTriangle, X, Wallet, User, Calendar, MapPin, FileText, ArrowRight } from 'lucide-react';
import { submitKycVerification, uploadAssetImage } from '../services/api';

export default function KycVerificationModal({ isOpen, onClose, userProfile, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form States
  const [fullName, setFullName]         = useState(userProfile?.full_name || '');
  const [birthDate, setBirthDate]       = useState('');
  const [documentId, setDocumentId]     = useState(userProfile?.document_id || '');
  const [addressCountry, setAddressCountry] = useState('Venezuela');
  const [addressState, setAddressState]     = useState('');
  const [addressCity, setAddressCity]       = useState('');
  const [bep20Wallet, setBep20Wallet]       = useState(userProfile?.bep20_wallet || '');

  // File & Camera States
  const [idDocFile, setIdDocFile]         = useState(null);
  const [idDocPreview, setIdDocPreview]   = useState('');
  const [rifDocFile, setRifDocFile]       = useState(null);
  const [rifDocPreview, setRifDocPreview] = useState('');
  
  // Live Camera Selfie State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selfiePreview, setSelfiePreview]   = useState('');
  const [selfieFile, setSelfieFile]         = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  if (!isOpen) return null;

  // 📸 Activar Cámara Web / Celular para Selfie en Vivo
  const startCamera = async () => {
    setErrorMsg('');
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setIsCameraActive(false);
      setErrorMsg('No se pudo activar la cámara. Por favor permite el permiso en tu navegador o selecciona una imagen.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setSelfiePreview(dataUrl);
    setSelfieFile(dataUrl); // Se enviará como Data URL o archivo subido
    stopCamera();
  };

  // Manejadores de Archivos Cédula y RIF
  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setPreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!userProfile?.id) {
      setErrorMsg('Debes iniciar sesión para realizar la verificación KYC.');
      return;
    }

    if (!fullName || !birthDate || !documentId || !addressState || !addressCity || !bep20Wallet) {
      setErrorMsg('Por favor completa todos los campos requeridos en el formulario.');
      return;
    }

    if (!idDocPreview) {
      setErrorMsg('Por favor adjunta la foto de tu Cédula de Identidad.');
      return;
    }

    if (!rifDocPreview) {
      setErrorMsg('Por favor adjunta la foto de tu RIF.');
      return;
    }

    if (!selfiePreview) {
      setErrorMsg('Por favor captura tu Foto Selfie en Vivo activa con la cámara.');
      return;
    }

    setLoading(true);

    try {
      // 1. Subir fotos a Supabase Storage / Data URL
      let idUrl = idDocPreview;
      if (idDocFile) {
        idUrl = await uploadAssetImage(idDocFile);
      }

      let rifUrl = rifDocPreview;
      if (rifDocFile) {
        rifUrl = await uploadAssetImage(rifDocFile);
      }

      let selfieUrl = selfiePreview;

      // 2. Guardar registro KYC
      await submitKycVerification({
        userId: userProfile.id,
        fullName,
        birthDate,
        documentId,
        addressCountry,
        addressState,
        addressCity,
        bep20Wallet,
        idDocumentUrl: idUrl,
        rifDocumentUrl: rifUrl,
        selfieUrl: selfieUrl
      });

      setSuccessMsg('¡Solicitud KYC enviada con éxito! El administrador revisará tu información pronto.');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Error al enviar KYC:', err);
      setErrorMsg(err.message || 'Ocurrió un error al procesar tu solicitud KYC.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget && !loading) { stopCamera(); onClose(); } }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl p-6 sm:p-8 shadow-2xl my-10 mx-4 animate-fade-in"
        style={{ background: '#111715', border: '1px solid rgba(0,255,136,0.20)' }}
      >
        {/* Close Button */}
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="absolute top-4 right-4 text-xl font-bold transition-colors text-neutral-400 hover:text-white"
        >✕</button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Verificación de Identidad KYC
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-mono uppercase">
                Requisito de Compra
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Cumplimiento legal y normativo para habilitar la adquisición de activos RWA en Venezuela.
            </p>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 text-xs font-medium mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bloque 1: Datos Personales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Nombre y Apellido *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ej. Eduardo José Rodríguez"
                  className="w-full py-2.5 pl-10 pr-3 text-xs rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Fecha de Nacimiento *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full py-2.5 pl-10 pr-3 text-xs rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Número de Cédula / RIF *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={documentId}
                  onChange={e => setDocumentId(e.target.value)}
                  placeholder="V-20894512"
                  className="w-full py-2.5 pl-10 pr-3 text-xs font-mono rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Dirección Wallet BEP20 (Recepción Ganancias) *
              </label>
              <div className="relative">
                <Wallet className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
                <input
                  type="text"
                  required
                  value={bep20Wallet}
                  onChange={e => setBep20Wallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full py-2.5 pl-10 pr-3 text-xs font-mono rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Dirección de Vivienda */}
          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Dirección de Vivienda
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-neutral-400 mb-1">País</label>
                <input
                  type="text"
                  readOnly
                  value={addressCountry}
                  className="w-full py-2 px-3 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 mb-1">Estado *</label>
                <input
                  type="text"
                  required
                  value={addressState}
                  onChange={e => setAddressState(e.target.value)}
                  placeholder="Ej. Miranda / Zulia"
                  className="w-full py-2 px-3 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 mb-1">Ciudad *</label>
                <input
                  type="text"
                  required
                  value={addressCity}
                  onChange={e => setAddressCity(e.target.value)}
                  placeholder="Ej. Caracas / Maracaibo"
                  className="w-full py-2 px-3 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Documentos (Cédula y RIF desde galería) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Foto Cédula */}
            <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-2">
              <label className="block text-xs font-bold text-white flex items-center justify-between">
                <span>Foto de Cédula (Galería) *</span>
                {idDocPreview && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              </label>
              
              {idDocPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-neutral-700 h-28 bg-black">
                  <img src={idDocPreview} alt="Cédula" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setIdDocFile(null); setIdDocPreview(''); }}
                    className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white"
                  ><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed border-neutral-700 hover:border-emerald-500 cursor-pointer bg-neutral-900 transition-all text-center p-2">
                  <Upload className="w-6 h-6 text-neutral-400 mb-1" />
                  <span className="text-[11px] text-neutral-300 font-semibold">Cargar Cédula</span>
                  <span className="text-[9px] text-neutral-500">JPG, PNG desde Galería</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileChange(e, setIdDocFile, setIdDocPreview)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Foto RIF */}
            <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-2">
              <label className="block text-xs font-bold text-white flex items-center justify-between">
                <span>Foto de RIF (Galería) *</span>
                {rifDocPreview && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              </label>
              
              {rifDocPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-neutral-700 h-28 bg-black">
                  <img src={rifDocPreview} alt="RIF" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setRifDocFile(null); setRifDocPreview(''); }}
                    className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white"
                  ><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed border-neutral-700 hover:border-emerald-500 cursor-pointer bg-neutral-900 transition-all text-center p-2">
                  <Upload className="w-6 h-6 text-neutral-400 mb-1" />
                  <span className="text-[11px] text-neutral-300 font-semibold">Cargar RIF</span>
                  <span className="text-[9px] text-neutral-500">JPG, PNG desde Galería</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileChange(e, setRifDocFile, setRifDocPreview)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Bloque 4: Foto Selfie en Vivo (Cámara del Celular / Web) */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Foto Selfie en Vivo (Cámara Activa) *
                </h4>
                <p className="text-[10px] text-neutral-400">Captura una foto de tu rostro mirando a la cámara.</p>
              </div>

              {selfiePreview && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Selfie Capturada
                </span>
              )}
            </div>

            {isCameraActive ? (
              <div className="relative rounded-xl overflow-hidden bg-black border border-emerald-500 flex flex-col items-center">
                <video ref={videoRef} autoPlay playsInline className="w-full max-h-64 object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                <div className="p-3 bg-neutral-950/90 w-full flex items-center justify-between">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-xs text-neutral-400 hover:text-white"
                  >Cancelar</button>

                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="px-4 py-2 bg-emerald-500 text-black font-extrabold text-xs rounded-lg flex items-center gap-2 hover:bg-emerald-400"
                  >
                    <Camera className="w-4 h-4" />
                    Capturar Foto Ahora
                  </button>
                </div>
              </div>
            ) : selfiePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-neutral-700 h-40 max-w-xs mx-auto bg-black">
                <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setSelfiePreview(''); setSelfieFile(null); startCamera(); }}
                  className="absolute bottom-2 right-2 px-3 py-1 bg-neutral-900/90 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" /> Recapturar
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs text-neutral-300">
                  Haz clic para encender la cámara frontal y tomar tu selfie de seguridad.
                </span>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Activar Cámara Celular / Web
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando Verificación a Administración...</span>
              </>
            ) : (
              <>
                <span>Enviar Verificación KYC para Aprobación</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
