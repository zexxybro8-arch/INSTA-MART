import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { CurrencyCode } from '../../types';
import { formatCurrency } from '../../lib/currency';
import {
  User,
  Mail,
  Phone,
  Wallet,
  ShoppingBag,
  TrendingDown,
  Globe,
  Check,
  Save,
  Shield,
  Calendar,
} from 'lucide-react';

interface ProfileViewProps {
  onOpenDeposit: () => void;
  onNavigate: (view: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenDeposit, onNavigate }) => {
  const { profile, updateUserCurrency, updateProfileDetails, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { success, error } = useToast();

  const [name, setName] = useState(profile?.name || '');
  const [mobile, setMobile] = useState(profile?.mobile || '');
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.currency || 'INR');
  const [isSaving, setIsSaving] = useState(false);

  if (!profile) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-400 text-sm">Please sign in to view your profile.</p>
        <button
          onClick={() => onNavigate('login')}
          className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currency !== profile.currency) {
        await updateUserCurrency(currency);
      }
      await updateProfileDetails({
        name: name.trim(),
        mobile: mobile.trim(),
      });
      success('Profile and preferences updated successfully.');
    } catch (err: any) {
      error(err?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const regDate = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-28 space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-white">Account Profile</h1>
        <p className="text-xs text-slate-400">Manage your profile details and display currency</p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/25 shrink-0">
          {profile.name?.charAt(0).toUpperCase() || profile.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white truncate">{profile.name || profile.username}</h3>
            {isAdmin && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ADMIN
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono truncate">@{profile.username}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>Member since {regDate}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
            Wallet
          </span>
          <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400 block">
            {formatCurrency(profile.balance, profile.currency, settings.exchangeRates)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
            Orders
          </span>
          <span className="font-mono font-bold text-xs sm:text-sm text-white block">
            {profile.totalOrders || 0}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
            Spent
          </span>
          <span className="font-mono font-bold text-xs sm:text-sm text-slate-300 block">
            {formatCurrency(profile.totalSpent || 0, profile.currency, settings.exchangeRates)}
          </span>
        </div>
      </div>

      {/* Editable Form */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-3.5">
          Profile Settings
        </h3>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Email (Read only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Email Address (Permanent)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="text"
                disabled
                value={profile.email}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs font-mono cursor-not-allowed"
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs transition"
              />
            </div>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs font-mono transition"
              />
            </div>
          </div>

          {/* Currency Selector (INR default) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Display Currency
              </label>
              <span className="text-[10px] text-emerald-400 font-semibold">
                Default: ₹ INR
              </span>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs transition"
            >
              <option value="INR">₹ INR (Indian Rupee) - Default</option>
              <option value="USD">$ USD (US Dollar)</option>
              <option value="EUR">€ EUR (Euro)</option>
              <option value="GBP">£ GBP (British Pound)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
