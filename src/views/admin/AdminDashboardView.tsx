import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/currency';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminCatalogTab } from './AdminCatalogTab';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminDepositsTab } from './AdminDepositsTab';
import { AdminDepositSettingsTab } from './AdminDepositSettingsTab';
import { AdminTicketsTab } from './AdminTicketsTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import {
  Shield,
  ShoppingBag,
  Users,
  CreditCard,
  QrCode,
  Layers,
  Headphones,
  Settings,
  Clock,
  ArrowLeft,
  DollarSign,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  FolderTree,
  Grid,
  Zap,
  ChevronRight,
  Database,
} from 'lucide-react';
import { logoutAdminSession, FIXED_ADMIN_ID } from '../../lib/adminAuth';

interface AdminDashboardViewProps {
  onBackToUserPanel: () => void;
  onLogout?: () => void;
}

type AdminTab = 'overview' | 'orders' | 'catalog' | 'users' | 'deposits' | 'deposit_settings' | 'tickets' | 'settings';
type CatalogSection = 'categories' | 'subcategories' | 'services';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onBackToUserPanel,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [catalogSection, setCatalogSection] = useState<CatalogSection>('categories');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleAdminLogout = () => {
    logoutAdminSession();
    if (onLogout) {
      onLogout();
    } else {
      onBackToUserPanel();
    }
  };

  // Real-time metric counts
  const [userCount, setUserCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [activeServices, setActiveServices] = useState(0);
  const [totalSpentAllUsers, setTotalSpentAllUsers] = useState(0);

  useEffect(() => {
    // Listen to users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUserCount(snap.size);
      let spent = 0;
      snap.docs.forEach((d) => {
        spent += d.data().totalSpent || 0;
      });
      setTotalSpentAllUsers(spent);
    });

    // Listen to orders
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrderCount(snap.size);
      setPendingOrders(snap.docs.filter((d) => d.data().status === 'Pending').length);
    });

    // Listen to deposits
    const unsubDeposits = onSnapshot(collection(db, 'deposits'), (snap) => {
      setPendingDeposits(snap.docs.filter((d) => d.data().status === 'Pending').length);
    });

    // Listen to tickets
    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snap) => {
      setOpenTickets(snap.docs.filter((d) => d.data().status === 'Open').length);
    });

    // Listen to services
    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      setActiveServices(snap.docs.filter((d) => d.data().isActive !== false).length);
    });

    return () => {
      unsubUsers();
      unsubOrders();
      unsubDeposits();
      unsubTickets();
      unsubServices();
    };
  }, []);

  const navMenuItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      onClick: () => {
        setActiveTab('overview');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'overview',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      badge: pendingOrders > 0 ? pendingOrders : undefined,
      badgeColor: 'bg-amber-500',
      onClick: () => {
        setActiveTab('orders');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'orders',
    },
    {
      id: 'catalog',
      label: 'Catalog',
      icon: Database,
      onClick: () => {
        setActiveTab('catalog');
        setCatalogSection('categories');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'catalog' && catalogSection === 'categories',
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: FolderTree,
      onClick: () => {
        setActiveTab('catalog');
        setCatalogSection('categories');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'catalog' && catalogSection === 'categories',
    },
    {
      id: 'subcategories',
      label: 'Subcategories',
      icon: Grid,
      onClick: () => {
        setActiveTab('catalog');
        setCatalogSection('subcategories');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'catalog' && catalogSection === 'subcategories',
    },
    {
      id: 'services',
      label: 'Services',
      icon: Zap,
      badge: activeServices > 0 ? activeServices : undefined,
      badgeColor: 'bg-teal-500',
      onClick: () => {
        setActiveTab('catalog');
        setCatalogSection('services');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'catalog' && catalogSection === 'services',
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      badge: userCount > 0 ? userCount : undefined,
      badgeColor: 'bg-blue-500',
      onClick: () => {
        setActiveTab('users');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'users',
    },
    {
      id: 'deposits',
      label: 'Deposits',
      icon: CreditCard,
      badge: pendingDeposits > 0 ? pendingDeposits : undefined,
      badgeColor: 'bg-emerald-500',
      onClick: () => {
        setActiveTab('deposits');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'deposits',
    },
    {
      id: 'deposit_settings',
      label: 'Deposit QR & Amounts',
      icon: QrCode,
      onClick: () => {
        setActiveTab('deposit_settings');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'deposit_settings',
    },
    {
      id: 'tickets',
      label: 'Support Tickets',
      icon: Headphones,
      badge: openTickets > 0 ? openTickets : undefined,
      badgeColor: 'bg-rose-500',
      onClick: () => {
        setActiveTab('tickets');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'tickets',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      onClick: () => {
        setActiveTab('settings');
        setIsSidebarOpen(false);
      },
      isActive: activeTab === 'settings',
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-28 space-y-4">
      {/* Top Header with Hamburger Button */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Hamburger Menu Button */}
          <button
            id="btn-admin-hamburger"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition flex items-center justify-center shadow-md active:scale-95 group"
            title="Open Admin Menu"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-5 h-5 text-purple-300 group-hover:text-white transition" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>INSTA MART Admin</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {activeTab.toUpperCase()}
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-purple-300/80">Operations &amp; Manual Fulfillment</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-admin-user-view"
            onClick={onBackToUserPanel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
            title="Open customer front-end view"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">User Site</span>
          </button>

          <button
            id="btn-admin-logout"
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition"
            title="Sign out of Admin Dashboard"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Hamburger Left Side Drawer Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop Blur */}
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Left Drawer Container */}
          <div className="relative w-72 sm:w-80 max-w-[85vw] h-full bg-slate-950 border-r border-slate-800/90 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800/90 bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white tracking-wider uppercase">
                    ADMIN MENU
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">Control &amp; Operations</p>
                </div>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                title="Close Admin Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vertical Menu Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              {navMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                      item.isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-500'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/90 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                          item.isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-900 text-purple-400 border border-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-white shadow-sm ${
                            item.badgeColor || 'bg-purple-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 ${
                          item.isActive ? 'text-purple-200' : 'text-slate-600'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer info */}
            <div className="p-4 border-t border-slate-800/90 bg-slate-900/60 space-y-3">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Authenticated</div>
                  <div className="text-xs font-mono font-bold text-purple-300">{FIXED_ADMIN_ID}</div>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Active
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    onBackToUserPanel();
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>User Site</span>
                </button>

                <button
                  onClick={handleAdminLogout}
                  className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Metric 1: Pending Orders */}
            <div
              onClick={() => setActiveTab('orders')}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition shadow-md"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Pending Orders</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-mono font-black text-2xl text-amber-400">
                {pendingOrders}
              </div>
              <span className="text-[10px] text-slate-500">of {orderCount} total orders</span>
            </div>

            {/* Metric 2: Pending Deposits */}
            <div
              onClick={() => setActiveTab('deposits')}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition shadow-md"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Pending Deposits</span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-mono font-black text-2xl text-emerald-400">
                {pendingDeposits}
              </div>
              <span className="text-[10px] text-slate-500">Needs verification</span>
            </div>

            {/* Metric 3: Total Revenue Spent */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Total Spent</span>
                <DollarSign className="w-4 h-4 text-purple-400" />
              </div>
              <div className="font-mono font-black text-2xl text-white">
                {formatCurrency(totalSpentAllUsers, 'INR')}
              </div>
              <span className="text-[10px] text-slate-500">Across all customer orders</span>
            </div>

            {/* Metric 4: Registered Users */}
            <div
              onClick={() => setActiveTab('users')}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition shadow-md"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Users</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="font-mono font-black text-2xl text-white">
                {userCount}
              </div>
              <span className="text-[10px] text-slate-500">Registered accounts</span>
            </div>

            {/* Metric 5: Active Services */}
            <div
              onClick={() => {
                setActiveTab('catalog');
                setCatalogSection('services');
              }}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition shadow-md"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Services</span>
                <Zap className="w-4 h-4 text-teal-400" />
              </div>
              <div className="font-mono font-black text-2xl text-white">
                {activeServices}
              </div>
              <span className="text-[10px] text-slate-500">Catalog offerings</span>
            </div>

            {/* Metric 6: Open Tickets */}
            <div
              onClick={() => setActiveTab('tickets')}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition shadow-md"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Open Tickets</span>
                <Headphones className="w-4 h-4 text-rose-400" />
              </div>
              <div className="font-mono font-black text-2xl text-rose-400">
                {openTickets}
              </div>
              <span className="text-[10px] text-slate-500">Customer requests</span>
            </div>
          </div>

          {/* Quick Fulfillment Directives */}
          <div className="p-5 rounded-3xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200 space-y-2">
            <h4 className="font-bold text-sm text-purple-300 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Manual Fulfillment Operational Workflow</span>
            </h4>
            <p className="text-purple-200/90 leading-relaxed text-[11px]">
              INSTA MART operates on strict manual order processing. When orders are placed, they start with status <strong className="text-white font-semibold">Pending</strong>. You can click the hamburger menu (☰) on the top left or select the <button onClick={() => setActiveTab('orders')} className="underline font-bold text-white">Orders section</button> to update progress, adjust start/current counts, and mark orders as Completed or Partial.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && <AdminOrdersTab />}

      {/* TAB CONTENT: CATALOG */}
      {activeTab === 'catalog' && (
        <AdminCatalogTab
          currentSection={catalogSection}
          onSectionChange={setCatalogSection}
        />
      )}

      {/* TAB CONTENT: USERS */}
      {activeTab === 'users' && <AdminUsersTab />}

      {/* TAB CONTENT: DEPOSITS */}
      {activeTab === 'deposits' && <AdminDepositsTab />}

      {/* TAB CONTENT: DEPOSIT SETTINGS & QR CONFIG */}
      {activeTab === 'deposit_settings' && <AdminDepositSettingsTab />}

      {/* TAB CONTENT: TICKETS */}
      {activeTab === 'tickets' && <AdminTicketsTab />}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === 'settings' && <AdminSettingsTab />}
    </div>
  );
};
