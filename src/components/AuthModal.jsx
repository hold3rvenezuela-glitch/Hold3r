import React, { useState } from 'react';
import { Shield, Lock, Mail, User, FileText, ArrowRight, Zap, CheckCircle } from 'lucide-react';
import { signUpUser, signInUser } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('investor');

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

        const res = await signUpUser({
          email,
          password,
          fullName,
          documentId,
          role
        });
        onAuthSuccess(res.profile || { full_name: fullName, document_id: documentId, role });
      } else {
        if (!email || !password) {
          throw new Error('Por favor ingresa tu correo y contraseña.');
        }
        const res = await signInUser({ email, password });
        onAuthSuccess({
          id: res.user.id,
          email: res.user.email,
          full_name: res.user.user_metadata?.full_name || email.split('@')[0],
          document_id: res.user.user_metadata?.document_id || 'V-12345678',
          role: res.user.user_metadata?.role || 'investor'
        });
      }
      onClose();
    } catch (err) {
      console.error('Error de autenticación:', err);
      setErrorMsg(err.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  // Botón de Acceso Demo Instantáneo para evaluación rápida
  const handleFastDemoLogin = async (demoRole = 'investor') => {
    setLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      const demoProfile = demoRole === 'admin' 
        ? { id: '99999999-9999-4999-8999-999999999999', full_name: 'Carlos Mendoza (Admin)', document_id: 'J-31456980-4', role: 'admin' }
        : { id: '11111111-1111-4111-8111-111111111111', full_name: 'Eduardo Rodríguez (Inversionista)', document_id: 'V-20894512', role: 'investor' };
      
      onAuthSuccess(demoProfile);
      setLoading(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md pt-24 pb-12 overflow-y-auto animate-fade-in">
      <div className="glass-panel w-full max-w-lg p-6 sm:p-8 border border-white/15 shadow-2xl relative max-h-[85vh] overflow-y-auto my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white text-xl font-bold p-1 rounded-lg"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-emerald-500/40 p-0.5 mx-auto mb-3 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Crear Cuenta Inversionista' : 'Iniciar Sesión en HOLD3R'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Tokenización e Inversión Fraccionada con respaldo legal en Venezuela.
          </p>
        </div>

        {/* Fast Demo Access Banner */}
        <div className="bg-neutral-900/90 border border-emerald-500/30 p-3 rounded-2xl mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Acceso Rápido de Prueba (Demo 1-Clic)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFastDemoLogin('investor')}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center"
            >
              👤 Inversionista Demo
            </button>
            <button
              type="button"
              onClick={() => handleFastDemoLogin('admin')}
              className="bg-neutral-800 hover:bg-neutral-700 text-white border border-white/20 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center"
            >
              👑 Admin Demo
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-neutral-900 border border-white/10 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isSignUp ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isSignUp ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl mb-4 font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Eduardo Rodríguez"
                    className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white rounded-xl py-2.5 pl-10 pr-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Documento de Identidad (Cédula / RIF - Validez Legal VE)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="Ej. V-20894512 o J-31456980-4"
                    className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white font-mono rounded-xl py-2.5 pl-10 pr-3 text-xs outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white rounded-xl py-2.5 pl-10 pr-3 text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white rounded-xl py-2.5 pl-10 pr-3 text-xs outline-none"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Rol de Cuenta
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('investor')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    role === 'investor'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-neutral-900 text-neutral-400 border-white/10'
                  }`}
                >
                  📈 Inversionista
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    role === 'admin'
                      ? 'bg-neutral-800 text-white border-white/30'
                      : 'bg-neutral-900 text-neutral-400 border-white/10'
                  }`}
                >
                  👑 Administrador
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-sm font-bold mt-2"
          >
            {loading ? 'Procesando...' : isSignUp ? 'Registrar Mi Cuenta' : 'Entrar a HOLD3R'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
