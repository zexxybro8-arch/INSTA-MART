import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order, OrderStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency } from '../../lib/currency';
import { useToast } from '../../context/ToastContext';
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Edit2,
  X,
  RotateCcw,
  Save,
  Copy,
  Check,
  User,
} from 'lucide-react';

const STATUS_OPTIONS: OrderStatus[] = [
  'Pending',
  'Processing',
  'In Progress',
  'Completed',
  'Partial',
  'Cancelled',
  'Refunded',
];

export const AdminOrdersTab: React.FC = () => {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Edit Order Modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>('Pending');
  const [editStartCount, setEditStartCount] = useState<number>(0);
  const [editCurrentCount, setEditCurrentCount] = useState<number>(0);
  const [editRemains, setEditRemains] = useState<number>(0);
  const [editAdminNote, setEditAdminNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        setOrders(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Admin orders error:', err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleCopyLink = (link: string, orderId: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(orderId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'ALL') {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          o.username.toLowerCase().includes(q) ||
          o.link.toLowerCase().includes(q) ||
          o.serviceName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, statusFilter, searchQuery]);

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditStatus(order.status);
    setEditStartCount(order.startCount);
    setEditCurrentCount(order.currentCount);
    setEditRemains(order.remains);
    setEditAdminNote(order.adminNote || '');
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setIsSaving(true);
    try {
      // If admin changed status to Refunded or Cancelled with refund
      if (
        (editStatus === 'Refunded' || editStatus === 'Cancelled') &&
        editingOrder.status !== 'Refunded' &&
        editingOrder.status !== 'Cancelled'
      ) {
        // Atomic refund transaction
        await runTransaction(db, async (txn) => {
          const userRef = doc(db, 'users', editingOrder.userId);
          const userSnap = await txn.get(userRef);

          if (userSnap.exists()) {
            const currentBal = userSnap.data().balance ?? 0;
            const newBal = currentBal + editingOrder.totalAmount;

            txn.update(userRef, {
              balance: newBal,
              totalSpent: Math.max(0, (userSnap.data().totalSpent ?? 0) - editingOrder.totalAmount),
              updatedAt: Date.now(),
            });

            // Create refund transaction
            const txDocRef = doc(collection(db, 'transactions'));
            txn.set(txDocRef, {
              transactionId: `TXR${Math.floor(100000 + Math.random() * 900000)}`,
              userId: editingOrder.userId,
              orderId: editingOrder.orderId,
              amount: editingOrder.totalAmount,
              currency: editingOrder.currency,
              type: 'Refund',
              status: 'Completed',
              description: `Refund for Order #${editingOrder.orderId} (${editStatus})`,
              balanceBefore: currentBal,
              balanceAfter: newBal,
              createdAt: Date.now(),
            });
          }

          const orderRef = doc(db, 'orders', editingOrder.id);
          txn.update(orderRef, {
            status: editStatus,
            startCount: editStartCount,
            currentCount: editCurrentCount,
            remains: editRemains,
            adminNote: editAdminNote.trim() || undefined,
            updatedAt: Date.now(),
          });
        });

        success(`Order #${editingOrder.orderId} updated & funds refunded to customer!`);
      } else {
        // Standard status and progress update
        await updateDoc(doc(db, 'orders', editingOrder.id), {
          status: editStatus,
          startCount: editStartCount,
          currentCount: editCurrentCount,
          remains: editRemains,
          adminNote: editAdminNote.trim() || undefined,
          updatedAt: Date.now(),
        });
        success(`Order #${editingOrder.orderId} updated successfully.`);
      }

      setEditingOrder(null);
    } catch (err: any) {
      console.error('Order update error:', err);
      error(err?.message || 'Failed to update order.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, username, link..."
            className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:border-purple-500 focus:outline-none transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-purple-500 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table/List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
          No orders found matching filters.
        </div>
      ) : (
        <div className="space-y-2.5">
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
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-purple-400">
                      #{order.orderId}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      @{order.username}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {dateStr} {timeStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <button
                      onClick={() => openEditModal(order)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Update Order"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs">
                  <div className="font-bold text-white leading-snug">
                    {order.serviceName}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <span className="truncate flex-1 select-all">{order.link}</span>
                    <button
                      onClick={() => handleCopyLink(order.link, order.id)}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                      title="Copy link"
                    >
                      {copiedLink === order.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={order.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-purple-300 transition shrink-0"
                      title="Open link in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span>Qty: <strong className="text-white">{order.quantity}</strong></span>
                    <span>Prog: <strong className="text-emerald-400">{order.currentCount}/{order.quantity}</strong></span>
                    <span>Rem: <strong className="text-amber-400">{order.remains}</strong></span>
                  </div>

                  <span className="font-bold text-emerald-400">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT ORDER MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs text-purple-400 font-bold block">
                  Update Order #{editingOrder.orderId}
                </span>
                <span className="text-[11px] text-slate-400">User: @{editingOrder.username}</span>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-3 text-xs">
              {/* Status Selector */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Order Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st} {st === 'Refunded' ? '(Auto-refund to user wallet)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Start Count</label>
                  <input
                    type="number"
                    value={editStartCount}
                    onChange={(e) => setEditStartCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Current Count</label>
                  <input
                    type="number"
                    value={editCurrentCount}
                    onChange={(e) => setEditCurrentCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Remains</label>
                  <input
                    type="number"
                    value={editRemains}
                    onChange={(e) => setEditRemains(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              {/* Admin Note */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Admin Internal/Fulfillment Note
                </label>
                <textarea
                  rows={2}
                  value={editAdminNote}
                  onChange={(e) => setEditAdminNote(e.target.value)}
                  placeholder="e.g. Delivered 8000 views, verified link"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Update Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
