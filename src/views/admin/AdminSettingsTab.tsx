import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { SiteSettings, MenuItemConfig } from '../../types';
import {
  Save,
  Palette,
  CreditCard,
  DollarSign,
  Layers,
  FileText,
  Sparkles,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AdminSettingsTab: React.FC = () => {
  const { settings, menuItems, updateSettings, updateMenuItems } = useSettings();
  const { success, error } = useToast();

  const [formData, setFormData] = useState<SiteSettings>({ ...settings });
  const [localMenuItems, setLocalMenuItems] = useState<MenuItemConfig[]>([...menuItems]);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  // Sync formData if settings update from context
  React.useEffect(() => {
    setFormData({ ...settings });
    setLogoPreviewError(false);
  }, [settings]);

  const handleFieldChange = (key: keyof SiteSettings, value: any) => {
    if (key === 'logoUrl') setLogoPreviewError(false);
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      error('Logo image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      handleFieldChange('logoUrl', result);
      setLogoPreviewError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRateChange = (curr: 'USD' | 'EUR' | 'GBP', rate: number) => {
    setFormData((prev) => ({
      ...prev,
      exchangeRates: {
        ...prev.exchangeRates,
        [curr]: rate,
      },
    }));
  };

  const handleToggleMenu = (id: string) => {
    setLocalMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isEnabled: !item.isEnabled } : item))
    );
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(formData);
      await updateMenuItems(localMenuItems);
      success('Platform settings & navigation updated successfully.');
    } catch (err: any) {
      error(err?.message || 'Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-5 text-xs">
      {/* BRANDING & IDENTITY */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Palette className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-white">Branding &amp; Identity</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Site / Brand Name</label>
            <input
              type="text"
              value={formData.siteName}
              onChange={(e) => handleFieldChange('siteName', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Brand Logo URL</label>
            <input
              type="text"
              id="input-brand-logo-url"
              value={formData.logoUrl || ''}
              onChange={(e) => handleFieldChange('logoUrl', e.target.value)}
              placeholder="https://.../logo.png or data:image/..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs"
            />
            <div className="flex items-center gap-2 mt-1.5">
              <label className="cursor-pointer py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-[11px] border border-slate-700 transition inline-flex items-center gap-1">
                <span>Upload Logo File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />
              </label>

              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={() => handleFieldChange('logoUrl', '')}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-[11px] border border-slate-700 transition"
                >
                  Clear Logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Brand Logo Preview Box */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-0.5 overflow-hidden">
              {formData.logoUrl && !logoPreviewError ? (
                <img
                  src={formData.logoUrl}
                  alt="Brand Logo Preview"
                  onError={() => setLogoPreviewError(true)}
                  className="w-9 h-9 object-cover rounded-xl"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 font-black font-mono text-base shadow-lg shadow-emerald-500/25">
                  IM
                </div>
              )}
            </div>

            <div>
              <div className="font-bold text-white text-xs flex items-center gap-2">
                <span>Brand Header Logo Preview</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    formData.logoUrl && !logoPreviewError
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {formData.logoUrl && !logoPreviewError ? 'Custom Logo Active' : 'Default Fallback (IM)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Exact size and style as shown in the site header. Click &quot;Save All Settings&quot; to apply.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Global Announcement Banner
          </label>
          <input
            type="text"
            value={formData.announcement || ''}
            onChange={(e) => handleFieldChange('announcement', e.target.value)}
            placeholder="⚡ Flash Sale: Get 10% Extra Balance on UPI Deposits today!"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
          />
        </div>
      </div>

      {/* LOGIN PAGE CUSTOMIZATION */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-white">Login Page Customization</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Main Heading</label>
            <input
              type="text"
              value={formData.mainHeading || ''}
              onChange={(e) => handleFieldChange('mainHeading', e.target.value)}
              placeholder="Welcome to INSTA MART"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Button Text</label>
            <input
              type="text"
              value={formData.buttonText || ''}
              onChange={(e) => handleFieldChange('buttonText', e.target.value)}
              placeholder="Sign In"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Description / Subtitle</label>
          <input
            type="text"
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Sign in to access your dashboard..."
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
          />
        </div>
      </div>

      {/* PAYMENT & DEPOSIT SETTINGS */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <CreditCard className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-white">Manual Payment Details (UPI &amp; Bank)</h3>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">UPI ID for Customer Payments</label>
          <input
            type="text"
            value={formData.upiId || ''}
            onChange={(e) => handleFieldChange('upiId', e.target.value)}
            placeholder="instamart@okhdfcbank"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Bank Account Instructions</label>
          <textarea
            rows={3}
            value={formData.bankDetails || ''}
            onChange={(e) => handleFieldChange('bankDetails', e.target.value)}
            placeholder="Bank Name: HDFC Bank&#10;Account: 50100...&#10;IFSC: HDFC0000123&#10;Name: INSTA MART TECH"
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white resize-none font-mono text-[11px]"
          />
        </div>
      </div>

      {/* CURRENCY EXCHANGE RATES */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <DollarSign className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-white">Currency Conversion Rates (Base: ₹1 INR)</h3>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">1 INR in USD</span>
            <input
              type="number"
              step="any"
              value={formData.exchangeRates.USD}
              onChange={(e) => handleRateChange('USD', parseFloat(e.target.value) || 0.012)}
              className="w-full text-center px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">1 INR in EUR</span>
            <input
              type="number"
              step="any"
              value={formData.exchangeRates.EUR}
              onChange={(e) => handleRateChange('EUR', parseFloat(e.target.value) || 0.011)}
              className="w-full text-center px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">1 INR in GBP</span>
            <input
              type="number"
              step="any"
              value={formData.exchangeRates.GBP}
              onChange={(e) => handleRateChange('GBP', parseFloat(e.target.value) || 0.0095)}
              className="w-full text-center px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* MENU ITEMS CONFIGURATION */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Layers className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-white">Menu Navigation Items</h3>
        </div>

        <div className="space-y-2">
          {localMenuItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800"
            >
              <div>
                <span className="font-bold text-white block">{item.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">Page: {item.page}</span>
              </div>

              <button
                type="button"
                onClick={() => handleToggleMenu(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                  item.isEnabled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {item.isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{item.isEnabled ? 'Visible' : 'Hidden'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* TERMS & PRIVACY */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <FileText className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-white">Legal Documents</h3>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Terms of Service</label>
          <textarea
            rows={4}
            value={formData.termsOfService || ''}
            onChange={(e) => handleFieldChange('termsOfService', e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white resize-none"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Privacy Policy</label>
          <textarea
            rows={4}
            value={formData.privacyPolicy || ''}
            onChange={(e) => handleFieldChange('privacyPolicy', e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white resize-none"
          />
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="sticky bottom-20 z-10 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm transition shadow-2xl shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save All Settings</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
