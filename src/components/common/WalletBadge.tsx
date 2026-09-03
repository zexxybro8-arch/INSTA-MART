import React from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency } from '../../lib/currency';

interface WalletBadgeProps {
  onOpenDeposit: () => void;
  className?: string;
}

export const WalletBadge: React.FC<WalletBadgeProps> = ({ onOpenDeposit, className = '' }) => {
  const { profile } = useAuth();
  const { settings } = useSettings();

  const balance = profile?.balance ?? 0;
  const currency = profile?.currency ?? 'INR';
  const formatted = formatCurrency(balance, currency, settings.exchangeRates);

  return (
    <div
      id="wallet-header-badge"
      className={`inline-flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 rounded-full py-1.5 pl-3 pr-1.5 transition shadow-lg shadow-emerald-950/20 backdrop-blur-md ${className}`}
    >
      <span className="text-emerald-400 font-mono font-bold text-sm sm:text-base tracking-tight select-none">
        {formatted}
      </span>
      <button
        id="btn-add-funds-header"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDeposit();
        }}
        title="Add Funds"
        aria-label="Add Funds"
        className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-95 shadow-md shadow-emerald-500/30"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};
