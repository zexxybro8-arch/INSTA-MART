import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { FileText, Shield, ArrowLeft } from 'lucide-react';

interface LegalViewProps {
  type: 'terms' | 'privacy';
  onBack: () => void;
}

export const LegalView: React.FC<LegalViewProps> = ({ type, onBack }) => {
  const { settings } = useSettings();

  const isTerms = type === 'terms';
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
  const content = isTerms ? settings.termsOfService : settings.privacyPolicy;

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
          <h1 className="text-lg font-extrabold text-white">{title}</h1>
          <p className="text-[11px] text-slate-400">Official policies of {settings.siteName}</p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          {isTerms ? (
            <FileText className="w-5 h-5 text-emerald-400" />
          ) : (
            <Shield className="w-5 h-5 text-emerald-400" />
          )}
          <span className="font-bold text-sm text-white">{settings.siteName} Guidelines</span>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line space-y-3 font-sans">
          {content || 'Policy details will be posted soon.'}
        </div>
      </div>
    </div>
  );
};
