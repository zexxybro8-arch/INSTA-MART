import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, QrCode, CreditCard, Send, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/currency';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFundsModal: React.FC<AddFundsModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const { success, error } = useToast();

  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Crypto' | 'QR Code'>('UPI');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen) return null;

  const upiId = settings.upiId || 'instamart@upi';

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      error('Please sign in to submit a deposit request.');
      return;
    }

    const numAmount = typeof amount === 'number' ? amount : 0;
    if (numAmount < 10) {
      error('Minimum deposit amount is ₹10.');
      return;
    }

    if (!referenceId.trim()) {
      error('Please enter the transaction reference / UTR ID.');
      return;
    }

    setIsSubmitting(true);

    try {
      const depositId = `DEP${Math.floor(100000 + Math.random() * 900000)}`;

      const depositData: Record<string, any> = {
        depositId: depositId,
        userId: profile.id,
        username: profile.username,
        userEmail: profile.email,
        amount: numAmount,
        currency: profile.currency || 'INR',
        paymentMethod: paymentMethod,
        referenceId: referenceId.trim(),
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const trimmedNotes = notes?.trim();
      if (trimmedNotes) {
        depositData.notes = trimmedNotes;
      }

      await addDoc(collection(db, 'deposits'), depositData);

      success(`Deposit request #${depositId} submitted! Admin will verify and credit your wallet.`);
      onClose();
      setAmount('');
      setReferenceId('');
      setNotes('');
    } catch (err: any) {
      console.error('Deposit submission error:', err);
      error(err?.message || 'Failed to submit deposit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl z-10 my-auto flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Add Funds / Deposit</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Payment Instructions Card */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Payment UPI ID:</span>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 font-mono font-bold border border-slate-800 transition"
              >
                <span>{upiId}</span>
                {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {settings.bankDetails && (
              <div className="pt-2 border-t border-slate-800/80 text-slate-400 leading-relaxed text-[11px]">
                {settings.bankDetails}
              </div>
            )}
            
            <p className="text-[11px] text-slate-400 leading-normal">
              1. Transfer the amount via UPI / Bank. <br />
              2. Enter the amount &amp; 12-digit UTR/Ref ID below. <br />
              3. Wallet is credited manually upon verification.
            </p>
          </div>

          {/* Deposit Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Deposit Amount (INR) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min={10}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-sm font-mono placeholder:text-slate-600 transition"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex items-center gap-2">
              {[100, 200, 500, 1000, 2000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="flex-1 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-800 transition"
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs transition"
              >
                <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                <option value="QR Code">QR Code Scan</option>
                <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
                <option value="Crypto">Cryptocurrency (USDT / TRC20)</option>
              </select>
            </div>

            {/* Transaction / UTR ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transaction ID / UTR No. <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="12-digit UPI reference or bank UTR"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs font-mono placeholder:text-slate-600 transition"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Optional Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sender name or remark..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs placeholder:text-slate-600 transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="btn-submit-deposit-request"
                disabled={isSubmitting || !amount || !referenceId.trim()}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <span>Submit Deposit Request</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
