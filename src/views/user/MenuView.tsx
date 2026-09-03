import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { WalletBadge } from '../../components/common/WalletBadge';
import { IconRenderer } from '../../components/common/IconRenderer';
import { isAdminSessionActive } from '../../lib/adminAuth';
import {
  Percent,
  Layers,
  Code,
  TrendingUp,
  Headphones,
  Gift,
  User,
  FileText,
  Shield,
  LogOut,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface MenuViewProps {
  onOpenDeposit: () => void;
  onNavigate: (view: string) => void;
}

export const MenuView: React.FC<MenuViewProps> = ({ onOpenDeposit, onNavigate }) => {
  const { profile, currentUser, logout } = useAuth();
  const { settings, menuItems } = useSettings();
  const isAdminActive = isAdminSessionActive();

  const handleItemClick = (page: string) => {
    onNavigate(page);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-28">
      {/* Top Section: Logo + Wallet Balance */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl mb-5">
        <div className="flex items-center gap-3">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.siteName}
              className="w-10 h-10 object-contain rounded-xl"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black font-mono text-lg shadow-lg shadow-emerald-500/25">
              IM
            </div>
          )}
          <div>
            <h2 className="text-base font-extrabold text-white leading-tight">
              {settings.siteName || 'INSTA MART'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {currentUser ? `@${profile?.username || 'user'}` : 'Guest User'}
            </p>
          </div>
        </div>

        <WalletBadge onOpenDeposit={onOpenDeposit} />
      </div>

      {/* Admin Panel Quick Access Banner if Admin */}
      {isAdminActive && (
        <div
          id="btn-menu-admin-panel"
          onClick={() => onNavigate('/admin/dashboard')}
          className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 to-slate-900 border border-purple-500/40 flex items-center justify-between cursor-pointer hover:border-purple-500 transition shadow-lg group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                Admin Control Center
              </h3>
              <p className="text-xs text-purple-300/80">Manage orders, users, catalog &amp; deposits</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-purple-400 group-hover:translate-x-0.5 transition" />
        </div>
      )}

      {/* Primary Configurable Menu Items */}
      <div className="space-y-2 mb-5">
        <div className="px-1 mb-1">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
            Features &amp; Tools
          </h3>
        </div>

        {menuItems
          .filter((item) => item.isEnabled)
          .map((item) => (
            <div
              key={item.id}
              id={`menu-item-${item.id}`}
              onClick={() => handleItemClick(item.page)}
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-850 border border-slate-800/90 hover:border-emerald-500/40 cursor-pointer transition shadow-md active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-emerald-500/15 border border-slate-700/60 group-hover:border-emerald-500/30 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 transition">
                  <IconRenderer name={item.icon} className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">{item.description}</p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
            </div>
          ))}
      </div>

      {/* Policies & Legal Section */}
      <div className="space-y-2 mb-5">
        <div className="px-1 mb-1">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
            Information &amp; Policies
          </h3>
        </div>

        <div
          id="menu-btn-terms"
          onClick={() => onNavigate('terms')}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-850 border border-slate-800/90 cursor-pointer transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-200">Terms of Service</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>

        <div
          id="menu-btn-privacy"
          onClick={() => onNavigate('privacy')}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-850 border border-slate-800/90 cursor-pointer transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-200">Privacy Policy</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
      </div>

      {/* Account / Session Action */}
      {currentUser ? (
        <button
          id="menu-btn-logout"
          onClick={async () => {
            await logout();
            onNavigate('/login');
          }}
          className="w-full p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      ) : (
        <button
          id="menu-btn-login"
          onClick={() => onNavigate('/login')}
          className="w-full p-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Sign In / Create Account</span>
        </button>
      )}
    </div>
  );
};
