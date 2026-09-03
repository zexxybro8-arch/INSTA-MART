import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order, OrderStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { IconRenderer } from '../../components/common/IconRenderer';
import { formatCurrency } from '../../lib/currency';
import { OrderDetailModal } from './OrderDetailModal';
import {
  Search,
  ChevronRight,
  ShoppingBag,
  ExternalLink,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface OrdersViewProps {
  onNavigate: (view: string) => void;
}

const FILTER_TABS: Array<{ label: string; value: string }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'Pending' },
  { label: 'In Progress', value: 'Processing' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Partial', value: 'Partial' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Refunded', value: 'Refunded' },
];

export const OrdersView: React.FC<OrdersViewProps> = ({ onNavigate }) => {
  const { currentUser, profile } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to user's orders in real time
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrders(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Orders query notice:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeTab !== 'ALL') {
      result = result.filter((o) => o.status === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          o.link.toLowerCase().includes(q) ||
          o.serviceName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, activeTab, searchQuery]);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-28">
      {/* Top Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">Order History</h1>
          <p className="text-xs text-slate-400">Track and view your order fulfillment status</p>
        </div>
        <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          {orders.length} Total
        </span>
      </div>

      {/* Search Input: URL or order id */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          id="search-input-orders"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by URL or order ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs placeholder:text-slate-500 transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Tabs Scrollable */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-4 -mx-1 px-1">
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              id={`filter-tab-${tab.value}`}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Order Cards List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-14 px-4 rounded-3xl bg-slate-900/40 border border-slate-800/80">
          <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Orders Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {searchQuery || activeTab !== 'ALL'
              ? 'No orders match your filter criteria.'
              : 'You have not placed any orders yet.'}
          </p>
          <button
            onClick={() => onNavigate('create')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
          >
            Create Your First Order
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            });
            const timeStr = new Date(order.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                id={`order-item-${order.orderId}`}
                onClick={() => setSelectedOrder(order)}
                className="group p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800/90 hover:border-emerald-500/40 cursor-pointer transition shadow-md active:scale-[0.99] space-y-2.5"
              >
                {/* Header Row: ID, Date, Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-400">
                      #{order.orderId}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {dateStr} {timeStr}
                    </span>
                  </div>

                  <StatusBadge status={order.status} />
                </div>

                {/* Service Name & Icon */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <IconRenderer name={order.categoryName || 'Zap'} className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition line-clamp-1 leading-snug">
                      {order.serviceName}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      {order.link}
                    </p>
                  </div>
                </div>

                {/* Progress & Amount Footer */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                    <span className="text-slate-500">Progress:</span>
                    <span className="text-white font-semibold">
                      {order.currentCount || 0} of {order.quantity.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
};
