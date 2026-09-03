import React, { useState } from 'react';
import { Code, ArrowLeft, Copy, Check, ShieldAlert } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface ApiDocViewProps {
  onBack: () => void;
}

export const ApiDocView: React.FC<ApiDocViewProps> = ({ onBack }) => {
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);

  const sampleEndpoint = 'https://instamart.app/api/v2';

  const copyEndpoint = () => {
    navigator.clipboard.writeText(sampleEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <h1 className="text-lg font-extrabold text-white">API Documentation</h1>
          <p className="text-[11px] text-slate-400">Integration documentation for developers</p>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 text-xs">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <ShieldAlert className="w-4 h-4" />
            <span>Manual Admin Fulfillment</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            All orders submitted to {settings.siteName} are reviewed and manually fulfilled by our operations team.
          </p>
        </div>

        <div>
          <span className="font-semibold text-slate-300 block mb-1">HTTP Method &amp; Endpoint</span>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 font-mono text-emerald-400 border border-slate-800">
            <span>POST {sampleEndpoint}</span>
            <button onClick={copyEndpoint} className="text-slate-400 hover:text-white">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div>
          <span className="font-semibold text-slate-300 block mb-1">Parameters (application/json)</span>
          <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800 space-y-1">
            <div><span className="text-purple-400">"key"</span>: "YOUR_API_KEY",</div>
            <div><span className="text-purple-400">"action"</span>: "add",</div>
            <div><span className="text-purple-400">"service"</span>: "101",</div>
            <div><span className="text-purple-400">"link"</span>: "https://instagram.com/p/xxx",</div>
            <div><span className="text-purple-400">"quantity"</span>: 1000</div>
          </div>
        </div>
      </div>
    </div>
  );
};
