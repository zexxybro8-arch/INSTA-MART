import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DepositAmountConfig } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import {
  QrCode,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  RefreshCw,
  Eye,
  Settings,
  Sparkles,
} from 'lucide-react';

export const AdminDepositSettingsTab: React.FC = () => {
  const { success, error } = useToast();
  const { settings, updateSettings } = useSettings();

  const [amounts, setAmounts] = useState<DepositAmountConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global settings state
  const [upiIdInput, setUpiIdInput] = useState(settings.upiId || 'instamart@upi');
  const [isUpdatingUpi, setIsUpdatingUpi] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAmount, setEditingAmount] = useState<DepositAmountConfig | null>(null);

  // Form inputs for Add / Edit
  const [inputAmount, setInputAmount] = useState<number | ''>('');
  const [inputQrUrl, setInputQrUrl] = useState('');
  const [inputIsActive, setInputIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // QR Upload Modal
  const [qrModalItem, setQrModalItem] = useState<DepositAmountConfig | null>(null);
  const [qrModalUrl, setQrModalUrl] = useState('');
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  // QR Preview Popup
  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);

  // Delete Confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Listen to depositAmounts collection
  useEffect(() => {
    const q = query(collection(db, 'depositAmounts'), orderBy('amount', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as DepositAmountConfig)
        );
        list.sort((a, b) => a.amount - b.amount);
        setAmounts(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('depositAmounts subscription error:', err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Update global UPI ID
  const handleSaveUpiId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiIdInput.trim()) {
      error('Please enter a valid Merchant UPI ID.');
      return;
    }
    setIsUpdatingUpi(true);
    try {
      await updateSettings({ upiId: upiIdInput.trim() });
      success('Merchant UPI ID updated successfully!');
    } catch (err: any) {
      error(err?.message || 'Failed to update UPI ID.');
    } finally {
      setIsUpdatingUpi(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingAmount(null);
    setInputAmount('');
    setInputQrUrl('');
    setInputIsActive(true);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: DepositAmountConfig) => {
    setEditingAmount(item);
    setInputAmount(item.amount);
    setInputQrUrl(item.qrUrl || '');
    setInputIsActive(item.isActive !== false);
    setIsAddModalOpen(true);
  };

  // Auto-generate QR code for given amount using current UPI ID
  const generateDefaultQr = (amt: number): string => {
    const currentUpi = upiIdInput.trim() || settings.upiId || 'instamart@upi';
    const upiString = `upi://pay?pa=${encodeURIComponent(currentUpi)}&pn=INSTAMART&am=${amt}&cu=INR&tn=${encodeURIComponent('Deposit ₹' + amt)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;
  };

  // Handle image file upload to convert to Data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'form' | 'modal') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      error('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'form') {
        setInputQrUrl(result);
      } else {
        setQrModalUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Fixed Amount (Create / Update)
  const handleSaveAmount = async (e: React.FormEvent) => {
    e.preventDefault();

    const num = typeof inputAmount === 'number' ? inputAmount : parseInt(String(inputAmount), 10);
    if (!num || isNaN(num) || num <= 0) {
      error('Amount must be a whole positive integer in INR.');
      return;
    }

    if (!Number.isInteger(num)) {
      error('Amount must be a whole integer without decimals.');
      return;
    }

    if (num > 1000) {
      error('Maximum allowed deposit amount is ₹1000.');
      return;
    }

    // Check duplicate if creating new or changing amount
    if (!editingAmount || editingAmount.amount !== num) {
      const exists = amounts.some((a) => a.amount === num);
      if (exists) {
        error(`Deposit amount ₹${num} already exists in the system.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const amountId = editingAmount ? editingAmount.id : `amt_${num}`;
      const finalQr = inputQrUrl.trim() || generateDefaultQr(num);

      const docRef = doc(db, 'depositAmounts', amountId);
      const dataDoc: DepositAmountConfig = {
        id: amountId,
        amount: num,
        qrUrl: finalQr,
        isActive: inputIsActive,
        sortOrder: editingAmount ? editingAmount.sortOrder : amounts.length + 1,
        createdAt: editingAmount ? editingAmount.createdAt : Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(docRef, dataDoc, { merge: true });

      success(`Deposit amount ₹${num} ${editingAmount ? 'updated' : 'added'} successfully!`);
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Save amount error:', err);
      error(err?.message || 'Failed to save deposit amount.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Active State
  const handleToggleActive = async (item: DepositAmountConfig) => {
    try {
      const docRef = doc(db, 'depositAmounts', item.id);
      await updateDoc(docRef, {
        isActive: !item.isActive,
        updatedAt: Date.now(),
      });
      success(`₹${item.amount} ${!item.isActive ? 'activated' : 'disabled'}.`);
    } catch (err: any) {
      error('Failed to toggle status.');
    }
  };

  // Save Custom QR Code from Modal
  const handleSaveCustomQr = async () => {
    if (!qrModalItem) return;
    if (!qrModalUrl.trim()) {
      error('Please upload an image or provide a valid QR image URL.');
      return;
    }

    setIsUploadingQr(true);
    try {
      const docRef = doc(db, 'depositAmounts', qrModalItem.id);
      await updateDoc(docRef, {
        qrUrl: qrModalUrl.trim(),
        updatedAt: Date.now(),
      });
      success(`QR Code updated for ₹${qrModalItem.amount}!`);
      setQrModalItem(null);
      setQrModalUrl('');
    } catch (err: any) {
      error('Failed to update QR Code.');
    } finally {
      setIsUploadingQr(false);
    }
  };

  // Delete Fixed Amount
  const handleDeleteAmount = async (id: string, amt: number) => {
    try {
      await deleteDoc(doc(db, 'depositAmounts', id));
      success(`Amount ₹${amt} deleted successfully.`);
      setDeletingId(null);
    } catch (err: any) {
      error('Failed to delete amount.');
    }
  };

  // Reset to default 17 amounts if needed
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset deposit settings to default 17 amounts (₹100 to ₹1000)?')) return;
    try {
      const defaultAmts = [
        100, 120, 150, 170, 200, 250, 300, 450, 500, 650, 700, 750, 800, 850, 900, 950, 1000
      ];
      const batch = writeBatch(db);
      defaultAmts.forEach((num, idx) => {
        const id = `amt_${num}`;
        const ref = doc(db, 'depositAmounts', id);
        batch.set(ref, {
          id,
          amount: num,
          qrUrl: generateDefaultQr(num),
          isActive: true,
          sortOrder: idx + 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
      await batch.commit();
      success('Reset to default 17 deposit amounts!');
    } catch (err: any) {
      error('Failed to reset defaults.');
    }
  };

  const activeCount = amounts.filter((a) => a.isActive !== false).length;
  const qrSetCount = amounts.filter((a) => !!a.qrUrl).length;

  return (
    <div className="space-y-4">
      {/* Tab Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>Deposit Settings &amp; QR Control</span>
              </h2>
              <p className="text-xs text-purple-300/80">
                Manage fixed deposit options (₹100 - ₹1000) and configure unique QR codes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5"
              title="Reset to default 17 amounts"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              id="btn-admin-add-deposit-amount"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-lg shadow-purple-900/40 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Amount</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2.5 pt-3.5 border-t border-slate-800">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Amounts</div>
            <div className="font-mono font-black text-base text-white mt-0.5">{amounts.length}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="text-[10px] font-bold uppercase text-slate-400">Active Options</div>
            <div className="font-mono font-black text-base text-emerald-400 mt-0.5">{activeCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="text-[10px] font-bold uppercase text-slate-400">QRs Configured</div>
            <div className="font-mono font-black text-base text-purple-300 mt-0.5">{qrSetCount}</div>
          </div>
        </div>
      </div>

      {/* Global Merchant UPI Config Form */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
        <form onSubmit={handleSaveUpiId} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <label className="block font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span>Global Merchant UPI ID</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Used as default UPI handle when auto-generating QR codes and UPI payment intents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={upiIdInput}
              onChange={(e) => setUpiIdInput(e.target.value)}
              placeholder="e.g. instamart@upi"
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-500 text-white font-mono text-xs w-48 transition"
            />
            <button
              type="submit"
              disabled={isUpdatingUpi || !upiIdInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 shrink-0"
            >
              {isUpdatingUpi ? 'Saving...' : 'Save UPI'}
            </button>
          </div>
        </form>
      </div>

      {/* Fixed Amounts Table / List */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 px-1">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-purple-300 flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            <span>Configured Deposit Amounts ({amounts.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Sorted ascending (₹100 - ₹1000)
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            Loading deposit settings...
          </div>
        ) : amounts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
            <p className="text-sm font-bold">No Deposit Amounts Configured</p>
            <p className="text-xs text-slate-500">
              Click &quot;+ Add Amount&quot; above or &quot;Reset Defaults&quot; to restore options.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {amounts.map((item) => {
              const hasQr = !!item.qrUrl;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.isActive !== false
                      ? 'bg-slate-950/80 border-slate-800 hover:border-purple-500/40'
                      : 'bg-slate-950/30 border-slate-900 opacity-60'
                  }`}
                >
                  {/* Left: Amount & QR status */}
                  <div className="flex items-center gap-3">
                    {/* Amount Pill */}
                    <div className="px-3.5 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono font-black text-lg min-w-[90px] text-center shadow-inner">
                      ₹{item.amount}
                    </div>

                    {/* Status badges */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.isActive !== false
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {item.isActive !== false ? 'Active' : 'Disabled'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                            hasQr
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <QrCode className="w-3 h-3" />
                          <span>{hasQr ? 'QR Configured' : 'QR Not Set'}</span>
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {hasQr ? 'Ready for user payment scan' : 'Warning: Users cannot pay without QR'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* Preview QR */}
                    {hasQr && (
                      <button
                        onClick={() => setPreviewQrUrl(item.qrUrl)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 text-xs font-semibold transition flex items-center gap-1"
                        title="Preview QR Code"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    )}

                    {/* Set/Replace QR */}
                    <button
                      onClick={() => {
                        setQrModalItem(item);
                        setQrModalUrl(item.qrUrl || generateDefaultQr(item.amount));
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-semibold transition flex items-center gap-1"
                      title="Upload or Change QR Code"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{hasQr ? 'Edit QR' : '+ Upload QR'}</span>
                    </button>

                    {/* Toggle Active */}
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                        item.isActive !== false
                          ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {item.isActive !== false ? 'Disable' : 'Enable'}
                    </button>

                    {/* Edit Amount */}
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                      title="Edit Amount"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Amount */}
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition"
                      title="Delete Amount"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT FIXED AMOUNT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>{editingAmount ? `Edit Amount ₹${editingAmount.amount}` : 'Add New Fixed Deposit Amount'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAmount} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Deposit Amount (INR) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={1000}
                    step={1}
                    value={inputAmount}
                    onChange={(e) =>
                      setInputAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    placeholder="e.g. 500"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-purple-500 text-white font-mono text-sm transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Whole INR integer (e.g. 100, 250, 500). Maximum allowed is ₹1000.
                </p>
              </div>

              {/* QR Image Option */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  QR Image URL / Data URL (Optional)
                </label>
                <input
                  type="text"
                  value={inputQrUrl}
                  onChange={(e) => setInputQrUrl(e.target.value)}
                  placeholder="https://... or data:image/png;base64,..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-purple-500 text-white font-mono text-xs transition mb-1.5"
                />

                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 font-semibold border border-slate-800 text-center transition flex items-center justify-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'form')}
                      className="hidden"
                    />
                  </label>

                  {typeof inputAmount === 'number' && inputAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setInputQrUrl(generateDefaultQr(inputAmount))}
                      className="py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-center font-semibold transition"
                    >
                      Auto-Gen QR
                    </button>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="font-semibold text-white">Active Status</div>
                  <div className="text-[10px] text-slate-400">Allow users to select this amount</div>
                </div>
                <input
                  type="checkbox"
                  checked={inputIsActive}
                  onChange={(e) => setInputIsActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !inputAmount}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-900/40 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Amount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD / REPLACE QR CODE SPECIFIC TO AMOUNT */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                <span>Configure QR Code for ₹{qrModalItem.amount}</span>
              </h3>
              <button
                onClick={() => setQrModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Image Preview */}
              {qrModalUrl ? (
                <div className="p-4 rounded-2xl bg-white/95 border border-slate-800 flex flex-col items-center justify-center shadow-inner">
                  <img
                    src={qrModalUrl}
                    alt={`QR Code for ₹${qrModalItem.amount}`}
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                  <p className="text-[10px] text-slate-600 font-mono font-semibold mt-2">
                    QR Image for Deposit ₹{qrModalItem.amount}
                  </p>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-center text-slate-500 space-y-1">
                  <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-400">No QR Image Loaded</p>
                  <p className="text-[10px]">Upload a file or provide a URL below</p>
                </div>
              )}

              {/* Upload Input */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Upload Image File from Device
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'modal')}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/30 cursor-pointer"
                />
              </div>

              {/* Direct URL Input */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Or Paste Direct Image URL
                </label>
                <input
                  type="text"
                  value={qrModalUrl}
                  onChange={(e) => setQrModalUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-purple-500 text-white font-mono text-xs transition"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setQrModalUrl(generateDefaultQr(qrModalItem.amount))}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 text-xs font-semibold border border-slate-800 transition"
                >
                  Auto-Gen UPI QR
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQrModalItem(null)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomQr}
                    disabled={isUploadingQr || !qrModalUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-900/40 disabled:opacity-50"
                  >
                    {isUploadingQr ? 'Saving...' : 'Save QR'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PREVIEW QR CODE POPUP */}
      {previewQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full">
            <button
              onClick={() => setPreviewQrUrl(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              QR Code Preview
            </h4>

            <div className="p-4 rounded-2xl bg-white border border-slate-800 shadow-xl">
              <img
                src={previewQrUrl}
                alt="QR Code Preview"
                className="w-56 h-56 object-contain rounded-lg"
              />
            </div>

            <button
              onClick={() => setPreviewQrUrl(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 max-w-xs w-full space-y-3 text-center">
            <Trash2 className="w-8 h-8 text-rose-400 mx-auto" />
            <h4 className="font-extrabold text-white text-sm">Delete Fixed Amount?</h4>
            <p className="text-xs text-slate-400">
              Users will no longer see or select this deposit option.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const item = amounts.find((a) => a.id === deletingId);
                  if (item) handleDeleteAmount(item.id, item.amount);
                }}
                className="py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition shadow-lg shadow-rose-900/40"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
