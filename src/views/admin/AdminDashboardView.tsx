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
import { AdminTicketsTab } from './AdminTicketsTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import {
  Shield,
  ShoppingBag,
  Users,
  CreditCard,
  Layers,
  Headphones,
  Settings,
  TrendingUp,
  Clock,
  ArrowLeft,
  DollarSign,
} from 'lucide-react';

interface AdminDashboardViewProps {
  onBackToUserPanel: () => void;
}

type AdminTab = 'overview' | 'orders' | 'catalog' | 'users' | 'deposits' | 'tickets' | 'settings';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onBackToUserPanel }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

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

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 pb-28 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white">INSTA MART Admin</h1>
            <p className="text-[11px] text-purple-300/80">Operations &amp; Manual Fulfillment</p>
          </div>
        </div>

        <button
          onClick={onBackToUserPanel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>User View</span>
        </button>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 text-xs">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: pendingOrders },
          { id: 'catalog', label: 'Catalog', icon: Layers },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'deposits', label: 'Deposits', icon: CreditCard, badge: pendingDeposits },
          { id: 'tickets', label: 'Support', icon: Headphones, badge: openTickets },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl font-bold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-mono flex items-center justify-center ml-0.5">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

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
              onClick={() => setActiveTab('catalog')}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition shadow-md"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Services</span>
                <Layers className="w-4 h-4 text-teal-400" />
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
              INSTA MART operates on strict manual order processing. When orders are placed, they start with status <strong className="text-white font-semibold">Pending</strong>. You can navigate to the <button onClick={() => setActiveTab('orders')} className="underline font-bold text-white">Orders tab</button> to update progress, adjust start/current counts, and mark orders as Completed or Partial.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && <AdminOrdersTab />}

      {/* TAB CONTENT: CATALOG */}
      {activeTab === 'catalog' && <AdminCatalogTab />}

      {/* TAB CONTENT: USERS */}
      {activeTab === 'users' && <AdminUsersTab />}

      {/* TAB CONTENT: DEPOSITS */}
      {activeTab === 'deposits' && <AdminDepositsTab />}

      {/* TAB CONTENT: TICKETS */}
      {activeTab === 'tickets' && <AdminTicketsTab />}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === 'settings' && <AdminSettingsTab />}
    </div>
  );
};
