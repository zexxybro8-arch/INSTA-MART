import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { WalletBadge } from '../common/WalletBadge';
import { Shield, Sparkles, User, LogOut } from 'lucide-react';
import { isAdminSessionActive } from '../../lib/adminAuth';

interface HeaderProps {
  onOpenDeposit: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDeposit, onNavigate, currentView }) => {
  const { currentUser, profile, logout } = useAuth();
  const { settings } = useSettings();
  const isAdminActive = isAdminSessionActive();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Left: INSTA MART Logo & Brand */}
        <div
          id="brand-header"
          onClick={() => onNavigate(currentUser ? 'create' : '/')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.siteName}
              className="w-8 h-8 object-contain rounded-lg"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 font-black font-mono text-lg shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition">
              IM
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-white font-extrabold font-mono tracking-tight text-lg leading-tight group-hover:text-emerald-400 transition">
              {settings.siteName || 'INSTA MART'}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest leading-none">
              SMM PANEL
            </span>
          </div>
        </div>

        {/* Right Section: Wallet Balance & User Profile / Admin Link */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {currentUser && (
            <>
              {/* Admin Panel Quick Switcher if active admin session */}
              {isAdminActive && (
                <button
                  id="btn-switch-admin"
                  onClick={() => onNavigate('/admin/dashboard')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30"
                >
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>Admin Panel</span>
                </button>
              )}

              {/* Wallet Balance Badge */}
              <WalletBadge onOpenDeposit={onOpenDeposit} />

              {/* User Avatar / Profile Icon */}
              <button
                id="btn-header-profile"
                onClick={() => onNavigate('profile')}
                title={profile?.name || profile?.username || 'User Profile'}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 transition"
              >
                <User className="w-4 h-4 text-emerald-400" />
              </button>
            </>
          )}

          {!currentUser && (
            <button
              id="btn-header-login"
              onClick={() => onNavigate('login')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
