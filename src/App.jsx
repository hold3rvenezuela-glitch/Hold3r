import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import InvestorDashboard from './components/InvestorDashboard';
import InvestmentModal from './components/InvestmentModal';
import MyInvestmentsView from './components/MyInvestmentsView';
import GovernanceView from './components/GovernanceView';
import AdminPanel from './components/AdminPanel';
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
  const [showAuthModal, setShowAuthModal]         = useState(false);
  const [selectedInvestAsset, setSelectedInvestAsset] = useState(null);

  // ── Inicialización ──────────────────────────────────────────────────────────
  const initApp = async () => {
    setLoading(true);
    try {
      // 1. Cargar catálogo de activos reales desde Supabase
      const loadedAssets = await fetchAssets();
      setAssets(loadedAssets);

      // 2. Verificar sesión activa en Supabase Auth
      const session = await getCurrentSession();
      if (session?.user) {
        await loadUserData(session.user.id);
      }
    } catch (err) {
      console.error('Error al inicializar la aplicación:', err);
    } finally {
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
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {loading ? (
          <div
            className="my-auto p-8 sm:p-16 text-center rounded-2xl max-w-md mx-auto"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div
                className="w-12 h-12 rounded-full border-2 animate-spin"
                style={{ borderColor: '#00FF66', borderTopColor: 'transparent' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-emerald-400 font-mono">H</span>
              </div>
            </div>
            <p className="text-xs font-mono text-neutral-400">
              Conectando con Supabase · Cargando catálogo RWA...
            </p>
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
        className="border-t py-6 text-center text-xs"
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

      {/* Investment Modal */}
      {selectedInvestAsset && userProfile && (
        <InvestmentModal
          asset={selectedInvestAsset}
          userProfile={userProfile}
          wallet={wallet}
          onClose={() => setSelectedInvestAsset(null)}
          onSuccess={handleInvestmentSuccess}
        />
      )}
    </div>
  );
}
