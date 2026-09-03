import React, { useState } from 'react';
import { Layers, Info, ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface MassOrderViewProps {
  onBack: () => void;
  onOpenDeposit: () => void;
}

export const MassOrderView: React.FC<MassOrderViewProps> = ({ onBack, onOpenDeposit }) => {
  const { profile } = useAuth();
  const { error, info } = useToast();
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      error('Please enter at least one order line.');
      return;
    }
    info('Mass order parsing: Please place high-volume requests through our instant service catalog or contact admin support.');
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
          <h1 className="text-lg font-extrabold text-white">Mass Order</h1>
          <p className="text-[11px] text-slate-400">Place multiple orders at once</p>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Info className="w-4 h-4 shrink-0" />
            <span>Format Guidelines</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Enter one order per line using the following standard delimiter syntax:
          </p>
          <div className="p-2.5 rounded-xl bg-slate-900 font-mono text-[11px] text-emerald-300 border border-slate-800">
            service_id | link | quantity
          </div>
          <p className="text-slate-500 text-[10px]">
            Example:<br />
            102 | https://instagram.com/p/xyz | 1000<br />
            105 | https://instagram.com/reel/abc | 5000
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows={7}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="102 | https://instagram.com/p/xyz | 1000"
            className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs font-mono placeholder:text-slate-600 transition resize-none"
          />

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Process Bulk Orders</span>
          </button>
        </form>
      </div>
    </div>
  );
};
