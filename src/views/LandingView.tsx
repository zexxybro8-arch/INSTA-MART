import React from 'react';
import { AuthHeader } from '../components/layout/AuthHeader';
import { useSettings } from '../context/SettingsContext';
import { ArrowRight, LogIn, Sparkles, Zap, ShieldCheck, TrendingUp } from 'lucide-react';

interface LandingViewProps {
  onNavigate: (route: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header with INSTA MART logo on left, Menu on right */}
      <AuthHeader onNavigate={onNavigate} currentRoute="/" />

      {/* Main Hero Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto w-full text-center">
        {/* Decorative Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Social Marketing Platform</span>
        </div>

        {/* Large Heading */}
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
          Amplify your audience
          <span className="block text-emerald-400 font-extrabold mt-1">
            Across all networks
          </span>
        </h1>

        {/* Description */}
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mt-4 max-w-sm mx-auto">
          Premium social media marketing platform—scale your profile or brand with targeted campaigns
        </p>

        {/* Action Buttons: Register or Sign Up & Sign In */}
        <div className="w-full flex flex-col gap-3.5 mt-9">
          {/* Register or Sign Up Button */}
          <button
            type="button"
            id="btn-landing-register"
            onClick={() => onNavigate('/register')}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-base transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>Register or Sign Up</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Sign In Button */}
          <button
            type="button"
            id="btn-landing-login"
            onClick={() => onNavigate('/login')}
            className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 text-white font-bold text-base transition flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>Sign In</span>
            <LogIn className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Subtle Highlights Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mt-10 pt-6 border-t border-slate-900">
          <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-850">
            <Zap className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
            <div className="text-[11px] font-bold text-white">Instant</div>
            <div className="text-[10px] text-slate-500">Fast delivery</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-850">
            <TrendingUp className="w-4 h-4 text-teal-400 mx-auto mb-1.5" />
            <div className="text-[11px] font-bold text-white">Real Reach</div>
            <div className="text-[10px] text-slate-500">High engagement</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-850">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
            <div className="text-[11px] font-bold text-white">Secure</div>
            <div className="text-[10px] text-slate-500">Safe payments</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} {settings.siteName || 'INSTA MART'}. All rights reserved.
      </footer>
    </div>
  );
};
