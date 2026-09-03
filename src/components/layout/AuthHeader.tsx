import React, { useState } from 'react';
import { Menu, X, Home, LogIn, UserPlus, FileText, Shield, HelpCircle, LayoutDashboard } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

interface AuthHeaderProps {
  onNavigate: (path: string) => void;
  currentRoute?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ onNavigate }) => {
  const { settings } = useSettings();
  const { currentUser, isAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="w-full max-w-md mx-auto px-5 pt-6 pb-2 flex items-center justify-between z-30">
        {/* Brand Logo */}
        <button
          type="button"
          id="btn-auth-brand-home"
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
        >
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.siteName || 'INSTA MART'}
              className="w-9 h-9 object-contain rounded-xl"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black font-mono text-base shadow-md shadow-emerald-500/20">
              IM
            </div>
          )}
          <span className="text-white font-black font-mono tracking-tight text-xl">
            {settings.siteName || 'INSTA MART'}
          </span>
        </button>

        {/* Menu Button on the right */}
        <button
          type="button"
          id="btn-auth-menu-toggle"
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Slide-out Menu Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-xs bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between z-10 shadow-2xl overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-mono font-black text-xs">
                    IM
                  </div>
                  <span className="text-white font-bold text-base font-mono">
                    {settings.siteName || 'INSTA MART'}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-auth-menu-close"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1">
                <button
                  type="button"
                  id="nav-drawer-home"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('/');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 text-sm font-medium transition cursor-pointer"
                >
                  <Home className="w-4 h-4 text-slate-400" />
                  <span>Home</span>
                </button>

                <button
                  type="button"
                  id="nav-drawer-login"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('/login');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 text-sm font-medium transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  id="nav-drawer-register"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('/register');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 text-sm font-medium transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-teal-400" />
                  <span>Create Account</span>
                </button>

                {currentUser && (
                  <button
                    type="button"
                    id="nav-drawer-dashboard"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate(isAdmin ? '/admin' : '/dashboard');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm font-semibold transition cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>{isAdmin ? 'Admin Dashboard' : 'User Dashboard'}</span>
                  </button>
                )}

                <div className="pt-3 border-t border-slate-800/80 space-y-1">
                  <button
                    type="button"
                    id="nav-drawer-terms"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('/dashboard?view=terms');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Terms & Conditions</span>
                  </button>
                  <button
                    type="button"
                    id="nav-drawer-privacy"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('/dashboard?view=privacy');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs transition cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Privacy Policy</span>
                  </button>
                  <button
                    type="button"
                    id="nav-drawer-support"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('/dashboard?view=support');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs transition cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Support</span>
                  </button>
                </div>
              </nav>
            </div>

            {currentUser && (
              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  id="nav-drawer-signout"
                  onClick={async () => {
                    setIsOpen(false);
                    await logout();
                    onNavigate('/login');
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
