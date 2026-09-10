import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import InvestorDashboard from './components/InvestorDashboard';
import InvestmentModal from './components/InvestmentModal';
import MyInvestmentsView from './components/MyInvestmentsView';
import GovernanceView from './components/GovernanceView';
import AdminPanel from './components/AdminPanel';
import PublicExplorerView from './components/PublicExplorerView';
import KycVerificationModal from './components/KycVerificationModal';
import VirtualOfficeView from './components/VirtualOfficeView';
import DepositModal from './components/DepositModal';
import { 
  getCurrentSession, 
  getUserProfile, 
  getUserWallet, 
  fetchAssets, 
  depositFunds,
  fetchUserShares,
  signOutUser 
} from './services/api';
import { supabase } from '../lib/supabase';

export default function App() {
  const [currentTab, setCurrentTab]               = useState('investor');
  const [userProfile, setUserProfile]             = useState(null);
  const [wallet, setWallet]                       = useState(null);
  const [assets, setAssets]                       = useState([]);
  const [userShares, setUserShares]               = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showAuthModal, setShowAuthModal]         = useState(false);
  const [showKycModal, setShowKycModal]           = useState(false);
  const [showDepositModal, setShowDepositModal]   = useState(false);
  const [selectedInvestAsset, setSelectedInvestAsset] = useState(null);

  const LOADING_MESSAGES = [
    "Sincronizando activos del mundo real (RWA)...",
    "Verificando contratos inteligentes en la red...",
    "Preparando catálogo de inversión fraccionada...",
    "HOLD3R Protocol: Tokenización segura y auditada..."
  ];

  // Rotación de mensajes institucionales durante la carga
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  // ── Inicialización ──────────────────────────────────────────────────────────
  const initApp = async () => {
    setLoading(true);
    // Timeout de seguridad de 4s para evitar pantallas de carga congeladas en redes móviles lentas
    const timer = setTimeout(() => {
      setLoading(false);
    }, 4000);

    try {
      // 1. Cargar catálogo de activos reales desde Supabase
      const loadedAssets = await fetchAssets();
      if (loadedAssets && loadedAssets.length > 0) {
        setAssets(loadedAssets);

        // Verificar si la URL trae un activo específico (ej. ?asset=UUID o /asset/UUID)
        const searchParams = new URLSearchParams(window.location.search);
        const urlAssetId = searchParams.get('asset') || window.location.pathname.split('/asset/')[1];
        if (urlAssetId) {
          const matched = loadedAssets.find(a => a.id === urlAssetId);
          if (matched) {
            setSelectedInvestAsset(matched);
          }
        }
      }

      // 2. Verificar sesión activa en Supabase Auth
      const session = await getCurrentSession();
      if (session?.user) {
        await loadUserData(session.user.id);
      }
    } catch (err) {
      console.error('Error al inicializar la aplicación:', err);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  // Carga perfil y wallet desde public.profiles y public.wallets
  const loadUserData = async (userId) => {
    try {
      // Consulta real a public.profiles para leer role
      const profile = await getUserProfile(userId);
      const userWallet = await getUserWallet(userId);
      const shares = await fetchUserShares(userId);

      setUserProfile(profile);
      setWallet(userWallet);
      setUserShares(shares);

      // Redirigir a Panel Admin si el role es 'admin'
      if (profile?.role === 'admin') {
        setCurrentTab('admin');
      }
    } catch (err) {
      console.error('Error al cargar datos del usuario:', err);
    }
  };

  useEffect(() => {
    initApp();

    // Escuchar cambios de sesión en tiempo real (login / logout / refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setWallet(null);
        setUserShares([]);
        setCurrentTab('investor');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Suscripción Realtime a Supabase para actualizar kyc_status del usuario al instante cuando el admin aprueba
  useEffect(() => {
    if (!userProfile?.id) return;

    const channel = supabase
      .channel(`profile_changes_${userProfile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userProfile.id}` },
        async (payload) => {
          if (payload.new) {
            setUserProfile(prev => ({ ...prev, ...payload.new }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kyc_verifications', filter: `user_id=eq.${userProfile.id}` },
        async (payload) => {
          if (payload.new && payload.new.status) {
            setUserProfile(prev => ({ ...prev, kyc_status: payload.new.status }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Llamado desde AuthModal tras signIn/signUp exitoso
  const handleAuthSuccess = async (profileData) => {
    setUserProfile(profileData);

    // Cargar wallet y shares si tenemos id real
    if (profileData?.id) {
      const userWallet = await getUserWallet(profileData.id);
      const shares = await fetchUserShares(profileData.id);
      setWallet(userWallet);
      setUserShares(shares);
    }

    // Redirigir automáticamente a Oficina Admin si el rol es admin
    if (profileData?.role === 'admin') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('investor');
    }

    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    try { await signOutUser(); } catch (e) { /* silencioso */ }
    setUserProfile(null);
    setWallet(null);
    setUserShares([]);
    setCurrentTab('investor');
  };

  const handleDepositUsdt = async (amountUsdt) => {
    if (!wallet) return;
    try {
      const updatedWallet = await depositFunds(wallet.id, wallet.balance, amountUsdt);
      setWallet(prev => ({
        ...prev,
        ...updatedWallet,
        balance: Number(wallet.balance) + Number(amountUsdt)
      }));
    } catch (err) {
      console.error('Error al acreditar depósito:', err);
    }
  };

  const handleRefreshAssets = async () => {
    try {
      const data = await fetchAssets();
      setAssets(data);
      if (userProfile?.id) {
        const userWallet = await getUserWallet(userProfile.id);
        const shares = await fetchUserShares(userProfile.id);
        setWallet(userWallet);
        setUserShares(shares);
      }
    } catch (err) {
      console.error('Error al refrescar:', err);
    }
  };

  const handleInvestmentSuccess = (newShare) => {
    if (newShare) setUserShares(prev => [newShare, ...prev]);
    handleRefreshAssets();
    setCurrentTab('my-investments');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex flex-col font-sans overflow-x-hidden" style={{ background: '#0B0F0E', color: '#fff' }}>

      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userProfile={userProfile}
        wallet={wallet}
        onOpenAuth={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
        onDepositUsdt={handleDepositUsdt}
        onOpenDeposit={() => setShowDepositModal(true)}
        onOpenKyc={() => setShowKycModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-fade-in">
            {/* Logo de HOLD3R con resplandor verde pulsatil e hilera de carga */}
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div 
                className="absolute inset-0 rounded-3xl animate-ping opacity-25"
                style={{ background: '#00FF88', filter: 'blur(8px)' }}
              />
              <div 
                className="w-18 h-18 rounded-3xl border-2 border-emerald-500/40 flex items-center justify-center shadow-2xl relative z-10"
                style={{ background: 'linear-gradient(145deg, #0d1714 0%, #080c0b 100%)', boxShadow: '0 0 25px rgba(0,255,136,0.2)' }}
              >
                <div 
                  className="w-12 h-12 rounded-2xl border-2 animate-spin"
                  style={{ borderColor: '#00FF88', borderTopColor: 'transparent' }}
                />
                <span className="absolute text-base font-black text-emerald-400 font-mono tracking-widest">H</span>
              </div>
            </div>

            {/* Mensaje dinámico rotativo */}
            <div className="h-8 flex items-center justify-center">
              <p className="text-xs sm:text-sm font-semibold font-mono text-emerald-400/90 tracking-wide animate-fade-in">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </p>
            </div>

            <div className="w-48 h-1 bg-neutral-900 rounded-full mt-4 overflow-hidden border border-white/5">
              <div 
                className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${((loadingMessageIndex + 1) / LOADING_MESSAGES.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Vista: Catálogo de Activos */}
            {currentTab === 'investor' && (
              <InvestorDashboard
                assets={assets}
                userWallet={wallet}
                onSelectInvestAsset={asset => setSelectedInvestAsset(asset)}
                onOpenAuth={() => setShowAuthModal(true)}
                isLoggedIn={!!userProfile}
              />
            )}

            {/* Vista: Buscador Público y Transparente */}
            {currentTab === 'explorer' && (
              <PublicExplorerView />
            )}

            {/* Vista: Mis Inversiones */}
            {currentTab === 'my-investments' && userProfile && (
              <MyInvestmentsView 
                userProfile={userProfile} 
                initialShares={userShares}
                onRefresh={handleRefreshAssets}
              />
            )}

            {/* Vista: Gobernanza */}
            {currentTab === 'governance' && (
              <GovernanceView userProfile={userProfile} assets={assets} />
            )}

            {/* Vista: Oficina Virtual Admin (sólo role === 'admin') */}
            {currentTab === 'admin' && userProfile?.role === 'admin' && (
              <AdminPanel
                assets={assets}
                userProfile={userProfile}
                onAssetCreated={newAsset => {
                  if (newAsset) setAssets(prev => [newAsset, ...prev]);
                  handleRefreshAssets();
                }}
                onRefresh={handleRefreshAssets}
                onViewCatalog={() => setCurrentTab('investor')}
              />
            )}

            {/* Vista: Oficina Virtual del Inversor */}
            {currentTab === 'virtual-office' && userProfile && (
              <VirtualOfficeView
                userProfile={userProfile}
                initialShares={userShares}
                wallet={wallet}
                assets={assets}
                onProfileUpdated={updated => setUserProfile(prev => ({ ...prev, ...updated }))}
                onOpenDeposit={() => setShowDepositModal(true)}
                onOpenKyc={() => setShowKycModal(true)}
              />
            )}

            {/* Protección: si intenta acceder a admin sin serlo */}
            {currentTab === 'admin' && userProfile?.role !== 'admin' && (
              <div
                className="p-12 text-center rounded-2xl"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}
              >
                <p className="text-sm font-bold text-white">Acceso Restringido</p>
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  Esta sección es exclusiva del administrador.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className="border-t py-6 pb-20 md:pb-6 text-center text-xs"
        style={{ borderColor: 'rgba(255,255,255,0.07)', color: '#6b7280', background: 'rgba(0,0,0,0.2)' }}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 HOLD3R Technologies · Tokenización RWA con Respaldo Legal en Venezuela</p>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span style={{ color: '#00FF88' }}>● Supabase Active</span>
            <span>RLS Protected</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* KYC Verification Modal */}
      <KycVerificationModal
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        userProfile={userProfile}
        onSuccess={handleRefreshAssets}
      />

      {/* Investment Modal */}
      {selectedInvestAsset && userProfile && (
        <InvestmentModal
          asset={selectedInvestAsset}
          userProfile={userProfile}
          wallet={wallet}
          onClose={() => setSelectedInvestAsset(null)}
          onSuccess={handleInvestmentSuccess}
          onOpenKycModal={() => { setSelectedInvestAsset(null); setShowKycModal(true); }}
        />
      )}

      {/* Deposit Modal Pasarela USDT Multi-Red */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDepositUsdt={handleDepositUsdt}
      />
    </div>
  );
}
