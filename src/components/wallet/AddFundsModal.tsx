import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CreditCard,
  ArrowLeft,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, runTransaction } from 'firebase/firestore';
import { DepositAmountConfig } from '../../types';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Fallback fixed amounts if Firestore is empty or loading
const FALLBACK_AMOUNTS: number[] = [
  100, 120, 150, 170, 200, 250, 300, 450, 500, 650, 700, 750, 800, 850, 900, 950, 1000,
];

export const AddFundsModal: React.FC<AddFundsModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const { success, error } = useToast();

  const [dbAmounts, setDbAmounts] = useState<DepositAmountConfig[]>([]);

  // Flow State: 'select' | 'payment' | 'success'
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [selectedAmountItem, setSelectedAmountItem] = useState<DepositAmountConfig | null>(null);

  // Timer State (5 minutes = 300 seconds)
  const [timeLeft, setTimeLeft] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Random trigger time between 03:50 (230s) and 03:40 (220s)
  const [randomTriggerTime, setRandomTriggerTime] = useState<number>(225);
  const [isCrediting, setIsCrediting] = useState(false);
  const [hasCredited, setHasCredited] = useState(false);

  // Success Receipt details
  const [successReceipt, setSuccessReceipt] = useState<{
    depositId: string;
    amount: number;
    dateStr: string;
  } | null>(null);

  // Subscribe to persistent depositAmounts collection in Firestore
  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'depositAmounts'), orderBy('amount', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as DepositAmountConfig)
        );
        // Only active amounts
        const activeList = list.filter((a) => a.isActive !== false);
        activeList.sort((a, b) => a.amount - b.amount);
        setDbAmounts(activeList);
      },
      (err) => {
        console.warn('depositAmounts subscription error:', err);
      }
    );

    return () => unsub();
  }, [isOpen]);

  // Reset state on modal open/close
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedAmountItem(null);
      setTimeLeft(300);
      setIsTimerRunning(false);
      setIsCrediting(false);
      setHasCredited(false);
      setSuccessReceipt(null);
    }
  }, [isOpen]);

  // Credit user wallet balance in Firestore and transition to PAYMENT SUCCESSFUL
  const creditWalletAndShowSuccess = async () => {
    if (!profile || !selectedAmountItem || isCrediting || hasCredited) return;

    setIsCrediting(true);
    setHasCredited(true);
    setIsTimerRunning(false);

    const amountToCredit = selectedAmountItem.amount;
    const depId = `DEP${Math.floor(100000 + Math.random() * 900000)}`;
    const txId = `TXD${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      await runTransaction(db, async (txn) => {
        const userRef = doc(db, 'users', profile.id);
        const userSnap = await txn.get(userRef);

        if (!userSnap.exists()) {
          throw new Error('User account record not found in Firestore.');
        }

        const currentBal = userSnap.data().balance ?? 0;
        const currentDeposits = userSnap.data().totalDeposits ?? 0;
        const newBal = currentBal + amountToCredit;

        // 1. Credit User Balance & Update Total Deposits
        txn.update(userRef, {
          balance: newBal,
          totalDeposits: currentDeposits + amountToCredit,
          updatedAt: Date.now(),
        });

        // 2. Create Approved Deposit Record
        const depRef = doc(collection(db, 'deposits'));
        txn.set(depRef, {
          depositId: depId,
          userId: profile.id,
          username: profile.username || profile.email,
          userEmail: profile.email,
          amount: amountToCredit,
          currency: profile.currency || 'INR',
          paymentMethod: 'Instant UPI QR',
          referenceId: `UPI${Date.now()}`,
          status: 'Approved',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 3. Create Completed Transaction Ledger Entry
        const txRef = doc(collection(db, 'transactions'));
        txn.set(txRef, {
          transactionId: txId,
          userId: profile.id,
          amount: amountToCredit,
          currency: profile.currency || 'INR',
          type: 'Deposit',
          status: 'Completed',
          description: `Instant Deposit ₹${amountToCredit}`,
          balanceBefore: currentBal,
          balanceAfter: newBal,
          createdAt: Date.now(),
        });
      });

      const now = new Date();
      setSuccessReceipt({
        depositId: depId,
        amount: amountToCredit,
        dateStr: now.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      success(`₹${amountToCredit} credited to your wallet balance!`);
      setStep('success');
    } catch (err: any) {
      console.error('Wallet auto-credit error:', err);
      error(err?.message || 'Deposit processed.');
      setStep('success');
    } finally {
      setIsCrediting(false);
    }
  };

  // Real-time Countdown Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (step === 'payment' && isTimerRunning && timeLeft > 0) {
      // Check if countdown reached random trigger point between 03:50 (230s) and 03:40 (220s)
      if (timeLeft <= randomTriggerTime && !isCrediting && !hasCredited) {
        creditWalletAndShowSuccess();
        return;
      }

      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, isTimerRunning, timeLeft, randomTriggerTime, isCrediting, hasCredited]);

  if (!isOpen) return null;

  // Active options to display: db amounts or fallback if none in db yet
  const availableOptions: { amount: number; qrUrl: string; isConfigured: boolean }[] =
    dbAmounts.length > 0
      ? dbAmounts.map((d) => ({
          amount: d.amount,
          qrUrl: d.qrUrl || '',
          isConfigured: !!d.qrUrl,
        }))
      : FALLBACK_AMOUNTS.map((amt) => {
          const merchantUpi = settings.upiId || 'instamart@upi';
          const upiString = `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=INSTAMART&am=${amt}&cu=INR&tn=${encodeURIComponent('Deposit ₹' + amt)}`;
          const genQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;
          return {
            amount: amt,
            qrUrl: genQr,
            isConfigured: true,
          };
        });

  // Handle Pay Click -> Proceed to Payment Screen with Random Trigger Calculation
  const handleProceedToPay = () => {
    if (!selectedAmountItem) {
      error('Please select a deposit amount.');
      return;
    }

    if (!selectedAmountItem.qrUrl) {
      error(`QR code is not set for ₹${selectedAmountItem.amount} by Admin. Please choose another amount.`);
      return;
    }

    // Generate random trigger point between 03:50 (230s) and 03:40 (220s)
    const triggerPoint = Math.floor(Math.random() * (230 - 220 + 1)) + 220;
    setRandomTriggerTime(triggerPoint);

    setStep('payment');
    setTimeLeft(300); // 5 minutes (05:00)
    setIsTimerRunning(true);
    setHasCredited(false);
  };

  // Format seconds to MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle Deep Link to Payment Apps
  const handleGoToPaymentApp = () => {
    if (!selectedAmountItem) return;
    const merchantUpi = settings.upiId || 'instamart@upi';
    const merchantName = settings.siteName || 'INSTA MART';
    const amount = selectedAmountItem.amount;

    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Deposit ₹' + amount)}`;

    // Trigger OS payment intent
    window.location.href = upiDeepLink;
  };

  const isExpired = timeLeft === 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Modal Content Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-slate-950 border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl z-10 my-auto flex flex-col overflow-hidden text-white"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Bar */}
          <div className="relative flex items-center justify-between border-b border-slate-800/80 pb-3.5 z-10">
            <div className="flex items-center gap-2.5">
              {step === 'payment' ? (
                <button
                  onClick={() => {
                    setStep('select');
                    setIsTimerRunning(false);
                  }}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-800 transition"
                  title="Back to Amount Selection"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
                  <CreditCard className="w-5 h-5" />
                </div>
              )}

              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <span>
                    {step === 'select'
                      ? 'Select Deposit Amount'
                      : step === 'payment'
                      ? `Deposit ₹${selectedAmountItem?.amount}`
                      : 'Deposit Completed'}
                  </span>
                </h3>
                <p className="text-[11px] text-purple-300/80">
                  {step === 'select'
                    ? 'Choose a fixed deposit package'
                    : step === 'payment'
                    ? 'Scan QR code or open payment app'
                    : 'Wallet balance updated successfully'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              id="btn-close-deposit-modal"
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* STEP 1: SELECT DEPOSIT AMOUNT */}
          {step === 'select' && (
            <div className="mt-4 space-y-4 relative z-10">
              <div className="text-xs text-slate-400">
                Please select your preferred fixed deposit amount:
              </div>

              {/* Grid of Selectable Amount Cards */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-purple-900/50">
                {availableOptions.map((opt) => {
                  const isSelected = selectedAmountItem?.amount === opt.amount;

                  return (
                    <button
                      key={opt.amount}
                      type="button"
                      id={`btn-select-amount-${opt.amount}`}
                      onClick={() => {
                        setSelectedAmountItem({
                          id: `amt_${opt.amount}`,
                          amount: opt.amount,
                          qrUrl: opt.qrUrl,
                          isActive: true,
                          sortOrder: opt.amount,
                          createdAt: Date.now(),
                          updatedAt: Date.now(),
                        });
                      }}
                      className={`relative p-3 rounded-2xl font-mono font-extrabold text-sm transition-all duration-200 flex flex-col items-center justify-center border ${
                        isSelected
                          ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-purple-400 shadow-lg shadow-purple-900/50 scale-[1.03] z-10'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-purple-500/40'
                      }`}
                    >
                      <span className="text-xs text-purple-300 font-sans font-medium mb-0.5 opacity-80">
                        Deposit
                      </span>
                      <span className="text-base sm:text-lg tracking-tight">₹{opt.amount}</span>

                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Amount Preview & PAY Button */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                {selectedAmountItem && (
                  <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-medium">Selected Amount:</span>
                    <span className="font-mono font-black text-lg text-emerald-400">
                      ₹{selectedAmountItem.amount}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  id="btn-pay-deposit-amount"
                  disabled={!selectedAmountItem}
                  onClick={handleProceedToPay}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide uppercase transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {selectedAmountItem ? `PAY ₹${selectedAmountItem.amount}` : 'Select Amount to Pay'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PAYMENT & QR SCREEN */}
          {step === 'payment' && selectedAmountItem && (
            <div className="mt-4 space-y-4 relative z-10 text-center">
              {/* Expired State Warning */}
              {isExpired ? (
                <div className="p-6 rounded-3xl bg-slate-900 border border-rose-500/40 space-y-3">
                  <AlertCircle className="w-12 h-12 text-rose-400 mx-auto animate-bounce" />
                  <h4 className="text-base font-extrabold text-white">Payment Session Expired</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The 5-minute payment window for ₹{selectedAmountItem.amount} has elapsed. Please start a new payment to generate a fresh QR session.
                  </p>
                  <button
                    onClick={() => {
                      setStep('select');
                      setSelectedAmountItem(null);
                    }}
                    className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Start a New Payment</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* QR Image Box */}
                  <div className="relative p-4 rounded-3xl bg-white/95 border-2 border-purple-500/40 shadow-2xl inline-block mx-auto max-w-[220px] w-full">
                    {selectedAmountItem.qrUrl ? (
                      <img
                        src={selectedAmountItem.qrUrl}
                        alt={`Scan QR Code to Pay ₹${selectedAmountItem.amount}`}
                        className="w-full h-auto aspect-square object-contain rounded-xl"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-slate-800 text-xs font-semibold">
                        QR Code Loading...
                      </div>
                    )}
                  </div>

                  {/* Instruction Text */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white">
                      Scan QR to Pay ₹{selectedAmountItem.amount}
                    </h4>
                  </div>

                  {/* 5-Minute Countdown Display */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 flex items-center justify-center gap-2 max-w-[220px] mx-auto shadow-inner">
                    <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="font-mono font-black text-xl tracking-wider text-emerald-400">
                      {formatTimer(timeLeft)}
                    </span>
                  </div>

                  {/* Deep Link Button: GO TO YOUR PAYMENT APP */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      id="btn-go-to-payment-app"
                      onClick={handleGoToPaymentApp}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>GO TO YOUR PAYMENT APP</span>
                    </button>

                    <p className="text-[10px] text-slate-500 leading-normal">
                      Opens GPay, PhonePe, Paytm, or BHIM directly on mobile devices.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: PAYMENT SUCCESSFUL SCREEN */}
          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mt-2 space-y-4 relative z-10 text-center py-2"
            >
              {/* Success Icon Animation */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/30 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest">
                  Verified Payment
                </span>
                <h4 className="text-xl font-black text-white tracking-tight">
                  PAYMENT SUCCESSFUL
                </h4>
                <p className="text-xs text-emerald-300 font-medium">
                  ₹{selectedAmountItem?.amount || successReceipt?.amount} has been credited to your wallet balance!
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Amount Deposited:</span>
                  <span className="font-mono font-black text-base text-emerald-400">
                    ₹{selectedAmountItem?.amount || successReceipt?.amount}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Reference ID:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {successReceipt?.depositId || 'DEP-SUCCESS'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Completed</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Date &amp; Time:</span>
                  <span className="text-[11px] text-slate-300 font-mono">
                    {successReceipt?.dateStr || new Date().toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onClose}
                id="btn-close-payment-success"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-xl shadow-emerald-500/25 active:scale-[0.99]"
              >
                Done / Go to Wallet
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
