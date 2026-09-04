import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { AddFundsModal } from './components/wallet/AddFundsModal';
import { LandingView } from './views/LandingView';
import { LoginView } from './views/auth/LoginView';
import { SignupView } from './views/auth/SignupView';
import { ForgotPasswordView } from './views/auth/ForgotPasswordView';
import { CreateOrderView } from './views/user/CreateOrderView';
import { OrdersView } from './views/user/OrdersView';
import { WalletView } from './views/user/WalletView';
import { MenuView } from './views/user/MenuView';
import { ProfileView } from './views/user/ProfileView';
import { SupportView } from './views/user/SupportView';
import { LegalView } from './views/user/LegalView';
import { MassOrderView } from './views/user/MassOrderView';
import { ApiDocView } from './views/user/ApiDocView';
import { ExtraFeaturesView } from './views/user/ExtraFeaturesView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { isAdminSessionActive, logoutAdminSession } from './lib/adminAuth';
import { seedInitialCatalogIfEmpty } from './lib/initialData';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';

type AppRoute = 'landing' | 'login' | 'register' | 'forgot-password' | 'admin' | 'dashboard';
type DashboardSubview =
  | 'create'
  | 'orders'
  | 'wallet'
  | 'menu'
  | 'profile'
  | 'support'
  | 'terms'
  | 'privacy'
  | 'mass-order'
  | 'api'
  | 'discount'
  | 'top-10'
  | 'bonus';

function parseLocationToRouteAndSubview(pathname: string, search: string): { route: AppRoute; subview: DashboardSubview } {
  const cleanPath = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search);
  const viewParam = (params.get('view') as DashboardSubview) || null;

  if (cleanPath === '/login') {
    return { route: 'login', subview: 'create' };
  }
  if (cleanPath === '/register' || cleanPath === '/signup') {
    return { route: 'register', subview: 'create' };
  }
  if (cleanPath === '/forgot-password' || cleanPath === '/forgot') {
    return { route: 'forgot-password', subview: 'create' };
  }
  if (cleanPath === '/admin' || cleanPath.startsWith('/admin')) {
    return { route: 'admin', subview: 'create' };
  }
  if (cleanPath === '/dashboard') {
    return { route: 'dashboard', subview: viewParam || 'create' };
  }
  if (cleanPath === '/orders') {
    return { route: 'dashboard', subview: 'orders' };
  }
  if (cleanPath === '/wallet') {
    return { route: 'dashboard', subview: 'wallet' };
  }
  if (cleanPath === '/menu') {
    return { route: 'dashboard', subview: 'menu' };
  }
  if (cleanPath === '/profile') {
    return { route: 'dashboard', subview: 'profile' };
  }
  if (cleanPath === '/support') {
    return { route: 'dashboard', subview: 'support' };
  }

  // Default root '/'
  return { route: 'landing', subview: 'create' };
}

function MainLayout() {
  const { currentUser, isLoading } = useAuth();

  // Initialize route from current browser window URL
  const [routeState, setRouteState] = useState(() =>
    parseLocationToRouteAndSubview(window.location.pathname, window.location.search)
  );
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => isAdminSessionActive());
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [orderCount, setOrderCount] = useState<number>(0);

  // Sync admin auth session across windows/storage events
  useEffect(() => {
    const checkAdminStatus = () => {
      setIsAdminLoggedIn(isAdminSessionActive());
    };

    window.addEventListener('admin_auth_state_changed', checkAdminStatus);
    window.addEventListener('storage', checkAdminStatus);
    return () => {
      window.removeEventListener('admin_auth_state_changed', checkAdminStatus);
      window.removeEventListener('storage', checkAdminStatus);
    };
  }, []);

  // Synchronize on browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setRouteState(parseLocationToRouteAndSubview(window.location.pathname, window.location.search));
      setIsAdminLoggedIn(isAdminSessionActive());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Central navigation dispatcher supporting routes, subviews, and legacy keys
  const navigateTo = useCallback(
    (target: string, options?: { replace?: boolean }) => {
      let targetPath = '/';
      let targetRoute: AppRoute = 'landing';
      let targetSubview: DashboardSubview = 'create';

      // 1. Direct path routing
      if (target === '/' || target === 'home') {
        targetPath = '/';
        targetRoute = 'landing';
        targetSubview = 'create';
      } else if (target === '/login' || target === 'login') {
        targetPath = '/login';
        targetRoute = 'login';
      } else if (target === '/register' || target === 'register' || target === 'signup') {
        targetPath = '/register';
        targetRoute = 'register';
      } else if (target === '/forgot-password' || target === 'forgot-password') {
        targetPath = '/forgot-password';
        targetRoute = 'forgot-password';
      } else if (target === '/admin' || target === '/admin/login' || target === '/admin/dashboard' || target === 'admin' || target === 'admin-dashboard') {
        targetPath = target.startsWith('/admin') ? target : '/admin/dashboard';
        targetRoute = 'admin';
      } else if (target.startsWith('/dashboard')) {
        targetPath = target;
        targetRoute = 'dashboard';
        const parsed = parseLocationToRouteAndSubview(target.split('?')[0], target.includes('?') ? '?' + target.split('?')[1] : '');
        targetSubview = parsed.subview;
      } else {
        // Dashboard subview triggers (e.g. 'create', 'orders', 'wallet', 'menu', 'profile', 'support', etc.)
        targetRoute = 'dashboard';
        targetSubview = target as DashboardSubview;
        if (target === 'create') {
          targetPath = '/dashboard';
        } else {
          targetPath = `/dashboard?view=${target}`;
        }
      }

      // Update browser history URL
      if (options?.replace) {
        window.history.replaceState({}, '', targetPath);
      } else if (window.location.pathname + window.location.search !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }

      setRouteState({ route: targetRoute, subview: targetSubview });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  // Authentication Route Guards for User Dashboard & Admin
  useEffect(() => {
    if (isLoading) return;

    // 1. Protected Admin Route Guard: If user visits /admin or /admin/dashboard
    if (routeState.route === 'admin') {
      if (!isAdminLoggedIn) {
        if (currentUser) {
          // Normal customer tries /admin/dashboard -> redirect to /dashboard (NEVER allow admin access)
          navigateTo('/dashboard', { replace: true });
        } else {
          // Logged-out user tries /admin/dashboard -> redirect to /login
          navigateTo('/login', { replace: true });
        }
      }
      return;
    }

    // 2. Protected User Dashboard Route Guard: If user visits /dashboard or subviews
    if (routeState.route === 'dashboard') {
      if (isAdminLoggedIn) {
        // If an admin manually opens /dashboard -> keep admin in /admin/dashboard
        navigateTo('/admin/dashboard', { replace: true });
      } else if (!currentUser) {
        // If a logged-out user manually opens /dashboard -> redirect to /login
        navigateTo('/login', { replace: true });
      }
      return;
    }

    // 3. Start Page (/) automatic routing based on authentication state
    if (routeState.route === 'landing') {
      if (isAdminLoggedIn) {
        navigateTo('/admin/dashboard', { replace: true });
      } else if (currentUser) {
        navigateTo('/dashboard', { replace: true });
      } else {
        navigateTo('/login', { replace: true });
      }
      return;
    }

    // 4. Auth Routes (/login, /register, /forgot-password) when already authenticated
    if (routeState.route === 'login' || routeState.route === 'register' || routeState.route === 'forgot-password') {
      if (isAdminLoggedIn) {
        navigateTo('/admin/dashboard', { replace: true });
      } else if (currentUser) {
        navigateTo('/dashboard', { replace: true });
      }
      return;
    }
  }, [isLoading, currentUser, isAdminLoggedIn, routeState.route, navigateTo]);

  // Dynamic Browser Tab Title
  useEffect(() => {
    const titles: Record<AppRoute, string> = {
      landing: 'INSTA MART - Social Marketing Platform',
      login: 'Sign In - INSTA MART',
      register: 'Register - INSTA MART',
      'forgot-password': 'Reset Password - INSTA MART',
      admin: 'Admin Dashboard - INSTA MART',
      dashboard: 'Dashboard - INSTA MART',
    };
    document.title = titles[routeState.route] || 'INSTA MART';
  }, [routeState.route]);

  // Initial catalog seeding if database is empty
  useEffect(() => {
    seedInitialCatalogIfEmpty().catch((err) => {
      console.warn('Initial seeding notice:', err);
    });
  }, []);

  // Listen to active user orders for bottom nav badge
  useEffect(() => {
    if (!currentUser) {
      setOrderCount(0);
      return;
    }

    const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrderCount(snap.size);
      },
      (err) => console.warn('Order count subscription notice:', err)
    );

    return () => unsub();
  }, [currentUser]);

  // Show clean loading state while Firebase Auth initializes on app load
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-xs font-mono tracking-wider text-slate-500 uppercase">Loading INSTA MART...</div>
      </div>
    );
  }

  // Distinct Route Rendering: No form mixing, no tabs, fully separate pages
  if (routeState.route === 'landing') {
    return <LandingView onNavigate={navigateTo} />;
  }

  if (routeState.route === 'login') {
    return <LoginView onNavigate={navigateTo} />;
  }

  if (routeState.route === 'register') {
    return <SignupView onNavigate={navigateTo} />;
  }

  if (routeState.route === 'forgot-password') {
    return <ForgotPasswordView onNavigate={navigateTo} />;
  }

  // Admin Route: Protected by admin session, renders Admin Dashboard
  if (routeState.route === 'admin') {
    if (!isAdminLoggedIn) {
      return <LoginView onNavigate={navigateTo} />;
    }

    return (
      <AdminDashboardView
        onBackToUserPanel={() => {
          logoutAdminSession();
          setIsAdminLoggedIn(false);
          navigateTo('/login', { replace: true });
        }}
        onLogout={() => {
          logoutAdminSession();
          setIsAdminLoggedIn(false);
          navigateTo('/login', { replace: true });
        }}
      />
    );
  }

  // User Dashboard layout (Authenticated user area)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 pb-20">
      {/* Top Header Navigation */}
      <Header
        onOpenDeposit={() => setIsDepositModalOpen(true)}
        onNavigate={navigateTo}
        currentView={routeState.subview}
      />

      {/* Main Subview Content */}
      <main className="flex-1 flex flex-col">
        {routeState.subview === 'create' && (
          <CreateOrderView
            onOpenDeposit={() => setIsDepositModalOpen(true)}
            onNavigate={navigateTo}
          />
        )}

        {routeState.subview === 'orders' && <OrdersView onNavigate={navigateTo} />}

        {routeState.subview === 'wallet' && (
          <WalletView onOpenDeposit={() => setIsDepositModalOpen(true)} />
        )}

        {routeState.subview === 'menu' && (
          <MenuView
            onOpenDeposit={() => setIsDepositModalOpen(true)}
            onNavigate={navigateTo}
          />
        )}

        {routeState.subview === 'profile' && (
          <ProfileView
            onOpenDeposit={() => setIsDepositModalOpen(true)}
            onNavigate={navigateTo}
          />
        )}

        {routeState.subview === 'support' && <SupportView />}

        {routeState.subview === 'terms' && (
          <LegalView type="terms" onBack={() => navigateTo('menu')} />
        )}

        {routeState.subview === 'privacy' && (
          <LegalView type="privacy" onBack={() => navigateTo('menu')} />
        )}

        {routeState.subview === 'mass-order' && (
          <MassOrderView
            onBack={() => navigateTo('menu')}
            onOpenDeposit={() => setIsDepositModalOpen(true)}
          />
        )}

        {routeState.subview === 'api' && (
          <ApiDocView onBack={() => navigateTo('menu')} />
        )}

        {routeState.subview === 'discount' && (
          <ExtraFeaturesView
            type="discount"
            onBack={() => navigateTo('menu')}
            onNavigate={navigateTo}
          />
        )}

        {routeState.subview === 'top-10' && (
          <ExtraFeaturesView
            type="top-10"
            onBack={() => navigateTo('menu')}
            onNavigate={navigateTo}
          />
        )}

        {routeState.subview === 'bonus' && (
          <ExtraFeaturesView
            type="bonus"
            onBack={() => navigateTo('menu')}
            onNavigate={navigateTo}
          />
        )}
      </main>

      {/* Persistent Bottom Mobile Navigation Bar */}
      <BottomNav
        currentView={routeState.subview}
        onNavigate={navigateTo}
        orderCount={orderCount}
      />

      {/* Global Add Funds / Deposit Modal */}
      <AddFundsModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SettingsProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}
