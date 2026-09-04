import React, { useState } from 'react';
import { Shield, Lock, Mail, User, FileText, ArrowRight, Check } from 'lucide-react';
import { signUpUser, signInUser, getUserProfile, getUserWallet } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [fullName, setFullName]     = useState('');
  const [documentId, setDocumentId] = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!fullName || !documentId || !email || !password) {
          throw new Error('Por favor completa todos los campos requeridos.');
        }
        const res = await signUpUser({ email, password, fullName, documentId });
        onAuthSuccess(res.profile);
      } else {
        if (!email || !password) {
          throw new Error('Por favor ingresa tu correo y contraseña.');
        }
        // 1. Autenticar con Supabase Auth
        const authData = await signInUser({ email, password });
        const userId = authData.user.id;

        // 2. Leer el rol REAL desde public.profiles (no desde user_metadata)
        const profile = await getUserProfile(userId);

        if (!profile) {
          throw new Error('No se encontró el perfil de este usuario en la plataforma.');
        }

        // 3. Notificar a App.jsx con el perfil real
        onAuthSuccess(profile);
      }
      onClose();
    } catch (err) {
      console.error('Error de autenticación:', err);
      setErrorMsg(err.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl my-20 mx-4 animate-fade-in"
        style={{ background: '#111715', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl font-bold transition-colors"
          style={{ color: '#6b7280' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
        >✕</button>

        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'rgba(0,255,136,0.10)', border: '1px solid rgba(0,255,136,0.30)' }}
          >
            <Shield className="w-6 h-6" style={{ color: '#00FF88' }} />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
            Tokenización e Inversión Fraccionada · Venezuela
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          className="flex p-1 rounded-xl mb-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={!isSignUp
              ? { background: 'rgba(255,255,255,0.07)', color: '#fff' }
              : { color: '#6b7280' }
            }
          >Iniciar Sesión</button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={isSignUp
              ? { background: 'rgba(255,255,255,0.07)', color: '#fff' }
              : { color: '#6b7280' }
            }
          >Registrarse</button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div
            className="text-xs p-3 rounded-xl mb-4 font-medium"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              {/* Nombre completo */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#a1a1a1' }}>
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3" style={{ color: '#6b7280' }} />
                  <input
                    type="text" required value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ej. Eduardo Rodríguez"
                    className="w-full py-2.5 pl-10 pr-3 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Cédula / RIF */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#a1a1a1' }}>
                  Cédula / RIF (Validez Legal Venezuela)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3.5 top-3" style={{ color: '#6b7280' }} />
                  <input
                    type="text" required value={documentId}
                    onChange={e => setDocumentId(e.target.value)}
                    placeholder="Ej. V-20894512 o J-31456980-4"
                    className="w-full py-2.5 pl-10 pr-3 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#a1a1a1' }}>
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3" style={{ color: '#6b7280' }} />
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full py-2.5 pl-10 pr-3 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#a1a1a1' }}>
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3" style={{ color: '#6b7280' }} />
              <input
                type="password" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-2.5 pl-10 pr-3 text-xs rounded-xl"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-sm font-bold mt-2"
          >
            {loading
              ? 'Verificando en Supabase...'
              : isSignUp ? 'Crear Cuenta' : 'Entrar a HOLD3R'
            }
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
