import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DepositRequest } from '../../types';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency } from '../../lib/currency';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  FileText,
  User,
  X,
} from 'lucide-react';

export const AdminDepositsTab: React.FC = () => {
  const { success, error } = useToast();

  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [adminNoteInput, setAdminNoteInput] = useState<{ [id: string]: string }>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; dep: DepositRequest | null; reason: string }>({
    open: false,
    dep: null,
    reason: 'Transaction ID not found / Payment unverified',
  });

  useEffect(() => {
    const q = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositRequest));
        setDeposits(list);
      },
      (err) => console.warn('Deposits subscription error:', err)
    );
    return () => unsub();
  }, []);

  const filteredDeposits = deposits.filter((d) => {
    if (filter === 'ALL') return true;
    return d.status === filter;
  });

  const handleCopyRef = (refId: string) => {
    navigator.clipboard.writeText(refId);
    setCopiedId(refId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApproveDeposit = async (dep: DepositRequest) => {
    setProcessingId(dep.id);
    try {
      await runTransaction(db, async (txn) => {
        const userRef = doc(db, 'users', dep.userId);
        const userSnap = await txn.get(userRef);

        if (!userSnap.exists()) throw new Error('Customer user record not found.');

        const currentBal = userSnap.data().balance ?? 0;
        const newBal = currentBal + dep.amount;
        const currentDeposits = userSnap.data().totalDeposits ?? 0;

        // 1. Credit User Balance & Update Total Deposits
        txn.update(userRef, {
          balance: newBal,
          totalDeposits: currentDeposits + dep.amount,
          updatedAt: Date.now(),
        });

        // 2. Create Transaction Record
        const txDocRef = doc(collection(db, 'transactions'));
        txn.set(txDocRef, {
          transactionId: `TXD${Math.floor(100000 + Math.random() * 900000)}`,
          userId: dep.userId,
          amount: dep.amount,
          currency: dep.currency || 'INR',
          type: 'Deposit',
          status: 'Completed',
          description: `Deposit via ${dep.paymentMethod} (Ref: ${dep.referenceId})`,
          balanceBefore: currentBal,
          balanceAfter: newBal,
          createdAt: Date.now(),
        });

        // 3. Update Deposit Status
        const depRef = doc(db, 'deposits', dep.id);
        txn.update(depRef, {
          status: 'Approved',
          adminNote: adminNoteInput[dep.id] || 'Verified and approved by admin',
          updatedAt: Date.now(),
        });
      });

      success(`Deposit #${dep.depositId} approved and wallet credited!`);
    } catch (err: any) {
      console.error('Deposit approval error:', err);
      error(err?.message || 'Failed to approve deposit.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (dep: DepositRequest) => {
    setRejectModal({
      open: true,
      dep,
      reason: adminNoteInput[dep.id] || 'Transaction ID not found / Payment unverified',
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.dep) return;
    const dep = rejectModal.dep;
    const reason = rejectModal.reason.trim() || 'Rejected by admin';

    setProcessingId(dep.id);
    try {
      await updateDoc(doc(db, 'deposits', dep.id), {
        status: 'Rejected',
        adminNote: reason,
        updatedAt: Date.now(),
      });
      success(`Deposit #${dep.depositId} marked as Rejected.`);
      setRejectModal({ open: false, dep: null, reason: '' });
    } catch (err: any) {
      error(err?.message || 'Failed to reject deposit.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['Pending', 'Approved', 'Rejected', 'ALL'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
              filter === st
                ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            {st} ({deposits.filter((d) => (st === 'ALL' ? true : d.status === st)).length})
          </button>
        ))}
      </div>

      {filteredDeposits.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
          No deposits found in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeposits.map((dep) => {
            const dateStr = new Date(dep.createdAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isPending = dep.status === 'Pending';

            return (
              <div
                key={dep.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-purple-400">
                      #{dep.depositId}
                    </span>
                    <span className="text-xs text-white font-semibold">
                      @{dep.username}
                    </span>
                    <span className="text-[10px] text-slate-500">{dateStr}</span>
                  </div>

                  <StatusBadge status={dep.status} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Method &amp; UTR / Ref ID
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-slate-300">{dep.paymentMethod}:</span>
                      <span className="font-mono text-emerald-400 font-bold select-all">
                        {dep.referenceId}
                      </span>
                      <button
                        onClick={() => handleCopyRef(dep.referenceId)}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copy Ref"
                      >
                        {copiedId === dep.referenceId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Requested Amount
                    </span>
                    <span className="font-mono font-bold text-base text-emerald-400">
                      {formatCurrency(dep.amount, dep.currency)}
                    </span>
                  </div>
                </div>

                {dep.notes && (
                  <div className="text-[11px] text-slate-400 italic">
                    User Remark: "{dep.notes}"
                  </div>
                )}

                {dep.adminNote && (
                  <div className="text-[11px] text-purple-300 font-medium">
                    Admin Note: {dep.adminNote}
                  </div>
                )}

                {/* Actions if Pending */}
                {isPending && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenReject(dep)}
                      disabled={processingId === dep.id}
                      className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs border border-rose-500/30 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveDeposit(dep)}
                      disabled={processingId === dep.id}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                    >
                      {processingId === dep.id ? 'Crediting Wallet...' : 'Verify & Approve'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && rejectModal.dep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                Reject Deposit #{rejectModal.dep.depositId}
              </h3>
              <button
                onClick={() => setRejectModal({ open: false, dep: null, reason: '' })}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Provide a reason for rejecting this deposit request. The user will see this in their transaction history.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Rejection Reason
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) =>
                  setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                placeholder="e.g. Transaction ID not found / Payment unverified"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, dep: null, reason: '' })}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={processingId === rejectModal.dep.id}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/25 disabled:opacity-50"
              >
                {processingId === rejectModal.dep.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
