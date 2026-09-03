import React from 'react';
import { ArrowLeft, Percent, TrendingUp, Gift, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface ExtraFeaturesViewProps {
  type: 'discount' | 'top-10' | 'bonus';
  onBack: () => void;
  onNavigate: (view: string) => void;
}

export const ExtraFeaturesView: React.FC<ExtraFeaturesViewProps> = ({ type, onBack, onNavigate }) => {
  const { settings } = useSettings();

  if (type === 'discount') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-4 pb-28 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-white">Tiered Discounts</h1>
            <p className="text-[11px] text-slate-400">Volume savings for active resellers</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { tier: 'Starter', minDeposit: '₹500', discount: '2% OFF', color: 'text-slate-300' },
            { tier: 'Reseller Bronze', minDeposit: '₹2,000', discount: '5% OFF', color: 'text-amber-400' },
            { tier: 'Reseller Silver', minDeposit: '₹5,000', discount: '8% OFF', color: 'text-slate-200' },
            { tier: 'VIP Gold', minDeposit: '₹10,000', discount: '12% OFF', color: 'text-yellow-400' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
            >
              <div>
                <h4 className={`text-sm font-bold ${item.color}`}>{item.tier}</h4>
                <p className="text-xs text-slate-400 mt-0.5">Min Deposit: {item.minDeposit}</p>
              </div>
              <span className="font-mono font-extrabold text-sm px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {item.discount}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'top-10') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-4 pb-28 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-white">TOP 10 Best Sellers</h1>
            <p className="text-[11px] text-slate-400">Most requested services on {settings.siteName}</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {[
            { rank: '#1', name: 'Instagram Reel Views - High Retention', speed: '500K/Day', price: '₹0.41' },
            { rank: '#2', name: 'Instagram Indian Real Likes', speed: '50K/Day', price: '₹14.20' },
            { rank: '#3', name: 'Instagram Active Followers [Non Drop]', speed: '20K/Day', price: '₹48.00' },
            { rank: '#4', name: 'YouTube Watch Time Hours - 4000h', speed: '500h/Day', price: '₹320.00' },
            { rank: '#5', name: 'YouTube High Quality Views', speed: '100K/Day', price: '₹72.00' },
            { rank: '#6', name: 'Telegram Channel Members [Global]', speed: '50K/Day', price: '₹22.50' },
            { rank: '#7', name: 'Facebook Page Likes & Followers', speed: '10K/Day', price: '₹85.00' },
            { rank: '#8', name: 'Spotify Track Plays [Algorithm Safe]', speed: '30K/Day', price: '₹18.00' },
            { rank: '#9', name: 'Twitter / X Retweets & Likes', speed: '15K/Day', price: '₹35.00' },
            { rank: '#10', name: 'Instagram Custom Comments', speed: '5K/Day', price: '₹120.00' },
          ].map((srv) => (
            <div
              key={srv.rank}
              onClick={() => onNavigate('create')}
              className="p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-emerald-400">
                  {srv.rank}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white leading-snug">{srv.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">Speed: {srv.speed}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-xs text-emerald-400">{srv.price}</span>
                <span className="block text-[9px] text-slate-500">/ 1000</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Bonus view
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-28 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-white">Deposit Bonus</h1>
          <p className="text-[11px] text-slate-400">Instant wallet credit bonus offers</p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
          <Gift className="w-7 h-7" />
        </div>
        <h3 className="text-base font-extrabold text-white">Get Up To 10% Extra on UPI Payments</h3>
        <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
          Add funds using direct UPI or Bank Transfer to enjoy bonus wallet balance on every deposit.
        </p>

        <div className="pt-2">
          <button
            onClick={() => onNavigate('wallet')}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/25"
          >
            Add Funds Now
          </button>
        </div>
      </div>
    </div>
  );
};
