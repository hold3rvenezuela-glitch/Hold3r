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
  seedDemoAssetsIfEmpty,
  depositFunds,
  fetchUserShares,
  signOutUser 
} from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('investor');
  const [userProfile, setUserProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [assets, setAssets] = useState([]);
  const [userShares, setUserShares] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedInvestAsset, setSelectedInvestAsset] = useState(null);

  // Cargar datos iniciales
  const initApp = async () => {
    setLoading(true);
    try {
      // 1. Cargar catálogo completo de activos
      const loadedAssets = await seedDemoAssetsIfEmpty();
      setAssets(loadedAssets);

      // 2. Cargar sesión de Supabase Auth
      const session = await getCurrentSession();
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        const userWallet = await getUserWallet(session.user.id);
        const shares = await fetchUserShares(session.user.id);
        
        setUserProfile(profile || {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          document_id: session.user.user_metadata?.document_id || 'V-20894512',
          role: session.user.user_metadata?.role || 'investor'
        });
        setWallet(userWallet);
        setUserShares(shares);
      }
    } catch (err) {
      console.error('Error al inicializar la aplicación:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  const handleAuthSuccess = async (profileData) => {
    setUserProfile(profileData);
    if (profileData?.id) {
      const userWallet = await getUserWallet(profileData.id);
      const shares = await fetchUserShares(profileData.id);
      setWallet(userWallet);
      setUserShares(shares);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (e) {
      console.warn('Cierre de sesión local:', e.message);
    }
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
      alert('Error al recargar USDT: ' + err.message);
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
      console.error('Error al refrescar activos:', err);
    }
  };

  const handleInvestmentSuccess = (newShare) => {
    // Refrescar inmediatamente portafolio local
    if (newShare) {
      setUserShares(prev => [newShare, ...prev]);
    }
    handleRefreshAssets();
    setCurrentTab('my-investments');
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans">
      
      {/* Navbar top */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userProfile={userProfile}
        wallet={wallet}
        onOpenAuth={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
        onDepositUsdt={handleDepositUsdt}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="glass-panel p-16 text-center text-neutral-400 font-mono text-xs space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Conectando con Supabase y cargando catálogo de activos RWA...</p>
          </div>
        ) : (
          <>
            {currentTab === 'investor' && (
              <InvestorDashboard
                assets={assets}
                userWallet={wallet}
                onSelectInvestAsset={(asset) => setSelectedInvestAsset(asset)}
                onOpenAuth={() => setShowAuthModal(true)}
                isLoggedIn={!!userProfile}
              />
            )}

            {currentTab === 'my-investments' && (
              <MyInvestmentsView 
                userProfile={userProfile} 
                initialShares={userShares}
                onRefresh={handleRefreshAssets}
              />
            )}

            {currentTab === 'governance' && (
              <GovernanceView userProfile={userProfile} assets={assets} />
            )}

            {currentTab === 'admin' && (
              <AdminPanel
                assets={assets}
                userProfile={userProfile}
                onAssetCreated={(newAsset) => {
                  if (newAsset) {
                    setAssets(prev => [newAsset, ...prev]);
                  }
                  handleRefreshAssets();
                }}
                onRefresh={() => handleRefreshAssets()}
                onViewCatalog={() => setCurrentTab('investor')}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 bg-neutral-950/80 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 HOLD3R Technologies. Plataforma Web3 de Tokenización RWA con Respaldo Legal en Venezuela.</p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-neutral-400">
            <span className="text-emerald-400">● Supabase Active</span>
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
