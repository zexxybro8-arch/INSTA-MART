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
import { UserProfile } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/currency';
import {
  Search,
  User,
  Shield,
  ShieldAlert,
  Wallet,
  PlusCircle,
  MinusCircle,
  X,
  Check,
  Lock,
  Unlock,
} from 'lucide-react';

export const AdminUsersTab: React.FC = () => {
  const { success, error } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Balance Adjustment Modal
  const [adjustUser, setAdjustUser] = useState<UserProfile | null>(null);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
        setUsers(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Admin users query note:', err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleToggleBlock = async (user: UserProfile) => {
    const newBlocked = !user.isBlocked;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        isBlocked: newBlocked,
        updatedAt: Date.now(),
      });
      success(`User @${user.username} has been ${newBlocked ? 'suspended' : 'reactivated'}.`);
    } catch (err: any) {
      error(err?.message || 'Failed to update user status.');
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role: newRole,
        updatedAt: Date.now(),
      });
      success(`User @${user.username} role changed to ${newRole}.`);
    } catch (err: any) {
      error(err?.message || 'Failed to update role.');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUser) return;
    const numAmount = typeof adjustAmount === 'number' ? adjustAmount : 0;
    if (numAmount <= 0) {
      error('Please enter a positive amount.');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      await runTransaction(db, async (txn) => {
        const userRef = doc(db, 'users', adjustUser.id);
        const userSnap = await txn.get(userRef);
        if (!userSnap.exists()) throw new Error('User record not found.');

        const currentBal = userSnap.data().balance ?? 0;
        let newBal = currentBal;

        if (adjustType === 'credit') {
          newBal = currentBal + numAmount;
        } else {
          newBal = Math.max(0, currentBal - numAmount);
        }

        txn.update(userRef, {
          balance: newBal,
          updatedAt: Date.now(),
        });

        // Add Transaction record
        const txDocRef = doc(collection(db, 'transactions'));
        txn.set(txDocRef, {
          transactionId: `TXA${Math.floor(100000 + Math.random() * 900000)}`,
          userId: adjustUser.id,
          amount: numAmount,
          currency: adjustUser.currency || 'INR',
          type: adjustType === 'credit' ? 'Admin Credit' : 'Admin Debit',
          status: 'Completed',
          description: adjustReason.trim() || `Manual adjustment by admin (${adjustType})`,
          balanceBefore: currentBal,
          balanceAfter: newBal,
          createdAt: Date.now(),
        });
      });

      success(`Adjusted balance for @${adjustUser.username}: ₹${numAmount} (${adjustType})`);
      setAdjustUser(null);
      setAdjustAmount('');
      setAdjustReason('');
    } catch (err: any) {
      error(err?.message || 'Failed to adjust balance.');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username, email, or full name..."
          className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:border-purple-500 focus:outline-none transition"
        />
      </div>

      {/* Users Count Summary */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span>Registered Users: <strong>{filteredUsers.length}</strong></span>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
          No users found.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredUsers.map((u) => {
            const dateStr = new Date(u.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={u.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-300">
                      {u.name?.charAt(0).toUpperCase() || u.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{u.name || u.username}</span>
                        <span className="text-xs text-slate-400 font-mono">@{u.username}</span>
                        {u.role === 'admin' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            ADMIN
                          </span>
                        )}
                        {u.isBlocked && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {u.email} {u.mobile ? `· ${u.mobile}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Joined: {dateStr}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-emerald-400 block">
                      {formatCurrency(u.balance, u.currency || 'INR')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Orders: {u.totalOrders || 0}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => {
                      setAdjustUser(u);
                      setAdjustType('credit');
                      setAdjustAmount('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition font-semibold"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Adjust Balance</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleRole(u)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px]"
                      title="Toggle Admin/User Role"
                    >
                      {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                    </button>

                    <button
                      onClick={() => handleToggleBlock(u)}
                      className={`px-2.5 py-1.5 rounded-xl transition text-[11px] flex items-center gap-1 ${
                        u.isBlocked
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      }`}
                    >
                      {u.isBlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{u.isBlocked ? 'Unblock' : 'Block'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADJUST BALANCE MODAL */}
      {adjustUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-white text-sm">Adjust User Balance</h4>
                <span className="text-[11px] text-slate-400">@{adjustUser.username}</span>
              </div>
              <button onClick={() => setAdjustUser(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAdjustBalance} className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('credit')}
                  className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    adjustType === 'credit'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Credit (+ Add)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('debit')}
                  className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    adjustType === 'debit'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>Debit (- Deduct)</span>
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Amount (INR)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={1}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reason / Description
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. UPI Verification / Refund"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust || !adjustAmount}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50"
                >
                  {isSubmittingAdjust ? 'Processing...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
