import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency } from '../../lib/currency';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface WalletViewProps {
  onOpenDeposit: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ onOpenDeposit }) => {
  const { profile, currentUser } = useAuth();
  const { settings } = useSettings();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const balance = profile?.balance ?? 0;
  const currency = profile?.currency ?? 'INR';
  const totalSpent = profile?.totalSpent ?? 0;
  const totalDeposited = profile?.totalDeposits ?? 0;

  // Real-time listener for user transactions
  useEffect(() => {
    if (!currentUser) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTransactions(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Transactions query notice:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-28">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">My Wallet</h1>
          <p className="text-xs text-slate-400">Balance, deposit requests &amp; transaction ledger</p>
        </div>
        <button
          onClick={onOpenDeposit}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/25"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Add Funds</span>
        </button>
      </div>

      {/* Main Balance Card */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 shadow-2xl mb-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Available Balance
            </span>
            <div className="font-mono font-black text-3xl sm:text-4xl text-emerald-400 mt-1 tracking-tight">
              {formatCurrency(balance, currency, settings.exchangeRates)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Deposited</span>
            </div>
            <div className="font-mono font-bold text-sm text-slate-200">
              {formatCurrency(totalDeposited, currency, settings.exchangeRates)}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Total Spent</span>
            </div>
            <div className="font-mono font-bold text-sm text-slate-200">
              {formatCurrency(totalSpent, currency, settings.exchangeRates)}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
            Transaction History
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {transactions.length} records
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Transactions Found</p>
            <p className="text-xs text-slate-500 mt-1">
              Your deposits and order payments will show up here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((tx) => {
              const isCredit =
                tx.type === 'Deposit' ||
                tx.type === 'Refund' ||
                tx.type === 'Admin Credit';

              const dateStr = new Date(tx.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              });
              const timeStr = new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {tx.type}
                        </span>
                        {tx.orderId && (
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            #{tx.orderId}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {tx.description}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {dateStr} at {timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold text-sm ${
                        isCredit ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Bal: {formatCurrency(tx.balanceAfter, tx.currency)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
