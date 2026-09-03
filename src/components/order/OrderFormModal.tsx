import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowLeft,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  ShieldCheck,
  Wallet,
  ExternalLink,
} from 'lucide-react';
import { Service, Category, Subcategory, Order, Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { calculateOrderAmount, formatCurrency } from '../../lib/currency';
import { IconRenderer } from '../common/IconRenderer';
import { db } from '../../lib/firebase';
import {
  runTransaction,
  doc,
  collection,
} from 'firebase/firestore';

interface OrderFormModalProps {
  isOpen: boolean;
  service: Service | null;
  category: Category | null;
  subcategory: Subcategory | null;
  onClose: () => void;
  onOpenDeposit: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  service,
  category,
  subcategory,
  onClose,
  onOpenDeposit,
  onOrderSuccess,
}) => {
  const { currentUser, profile, isBlocked } = useAuth();
  const { toast, error: toastError } = useToast() as any;
  const { settings } = useSettings();

  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [customerNote, setCustomerNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !service) return null;

  const currentBalance = profile?.balance ?? 0;
  const userCurrency = profile?.currency ?? 'INR';
  const qtyNumber = typeof quantity === 'number' ? quantity : 0;
  const totalAmount = calculateOrderAmount(qtyNumber, service.pricePer1000);
  const isInsufficientBalance = qtyNumber > 0 && currentBalance < totalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!currentUser || !profile) {
      setValidationError('Please sign in to place an order.');
      return;
    }

    if (isBlocked) {
      setValidationError('Your account is suspended. Please contact support.');
      return;
    }

    const trimmedLink = link.trim();
    if (!trimmedLink) {
      setValidationError('Please enter a valid target link or username.');
      return;
    }

    if (!qtyNumber || isNaN(qtyNumber)) {
      setValidationError('Please enter a valid quantity.');
      return;
    }

    if (qtyNumber < service.minimumQuantity) {
      setValidationError(
        `Quantity is below minimum allowed (${service.minimumQuantity.toLocaleString('en-IN')}).`
      );
      return;
    }

    if (qtyNumber > service.maximumQuantity) {
      setValidationError(
        `Quantity exceeds maximum allowed (${service.maximumQuantity.toLocaleString('en-IN')}).`
      );
      return;
    }

    if (isInsufficientBalance) {
      setValidationError('Insufficient wallet balance to place this order.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Human-readable Order ID e.g. IM102458
      const uniqueSuffix = Math.floor(100000 + Math.random() * 900000).toString();
      const customOrderId = `IM${uniqueSuffix}`;

      // Document references
      const newOrderRef = doc(collection(db, 'orders'));
      const newTxRef = doc(collection(db, 'transactions'));
      const userRef = doc(db, 'users', profile.id);

      let createdOrder: Order | null = null;

      // Atomic transaction: verify balance, deduct wallet, create order & transaction records
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('User profile record not found.');
        }

        const userData = userDoc.data();
        const liveBalance = userData.balance ?? 0;

        if (liveBalance < totalAmount) {
          throw new Error('Insufficient wallet balance. Please add funds.');
        }

        const newBalance = Math.round((liveBalance - totalAmount + Number.EPSILON) * 100) / 100;
        const totalOrders = (userData.totalOrders ?? 0) + 1;
        const totalSpent = Math.round(((userData.totalSpent ?? 0) + totalAmount + Number.EPSILON) * 100) / 100;

        // 1. Deduct balance and update user stats
        transaction.update(userRef, {
          balance: newBalance,
          totalOrders: totalOrders,
          totalSpent: totalSpent,
          updatedAt: Date.now(),
        });

        // 2. Prepare Order document
        const orderData: Order = {
          id: newOrderRef.id,
          orderId: customOrderId,
          userId: profile.id,
          username: profile.username,
          userEmail: profile.email,
          categoryId: category?.id ?? service.categoryId,
          categoryName: category?.name ?? 'General',
          subcategoryId: subcategory?.id ?? service.subcategoryId,
          subcategoryName: subcategory?.name ?? 'Services',
          serviceId: service.id,
          serviceName: service.name,
          servicePrice: service.pricePer1000,
          currency: userCurrency,
          link: trimmedLink,
          quantity: qtyNumber,
          startCount: 0,
          currentCount: 0,
          remains: qtyNumber,
          totalAmount: totalAmount,
          status: 'Pending', // Initial status MUST be Pending
          createdAt: Date.now(),
          updatedAt: Date.now(),
          customerNote: customerNote.trim() || undefined,
        };

        transaction.set(newOrderRef, orderData);

        // 3. Prepare Transaction document
        const txData: Transaction = {
          id: newTxRef.id,
          userId: profile.id,
          username: profile.username,
          orderId: customOrderId,
          type: 'Order Payment',
          amount: totalAmount,
          currency: userCurrency,
          balanceBefore: liveBalance,
          balanceAfter: newBalance,
          status: 'Completed',
          description: `Payment for Order #${customOrderId} (${service.name})`,
          createdAt: Date.now(),
        };

        transaction.set(newTxRef, txData);
        createdOrder = orderData;
      });

      if (createdOrder) {
        onClose();
        onOrderSuccess(createdOrder);
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      setValidationError(err?.message || 'Failed to place order. Please try again.');
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

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl z-10 my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              New Order
            </span>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto pr-1 mt-4 space-y-4 flex-1">
            {/* Service Summary Card */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <IconRenderer name={service.icon || 'Zap'} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white leading-snug">
                    {service.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-emerald-400 font-mono font-bold text-xs">
                      {formatCurrency(service.pricePer1000, userCurrency)} / 1000
                    </span>
                    {service.isPopular && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        🔥 Most Popular
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Specifications Pills */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 text-[11px]">
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 flex items-center gap-1 mb-0.5">
                    <Clock className="w-3 h-3 text-sky-400" /> Start
                  </div>
                  <div className="font-semibold text-white truncate">{service.startTime || 'Instant'}</div>
                </div>

                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 flex items-center gap-1 mb-0.5">
                    <Zap className="w-3 h-3 text-emerald-400" /> Speed
                  </div>
                  <div className="font-semibold text-white truncate">{service.speed || 'Super Fast'}</div>
                </div>

                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 flex items-center gap-1 mb-0.5">
                    <RotateCcw className="w-3 h-3 text-amber-400" /> Refill
                  </div>
                  <div className="font-semibold text-white truncate">{service.refill || 'Non-Drop'}</div>
                </div>

                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 flex items-center gap-1 mb-0.5">
                    <ShieldCheck className="w-3 h-3 text-teal-400" /> Guarantee
                  </div>
                  <div className="font-semibold text-white truncate">{service.guarantee || '30 Days'}</div>
                </div>
              </div>

              {service.notes && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-300">Note:</span> {service.notes}
                </div>
              )}
            </div>

            {/* Form Fields */}
            <form id="order-placement-form" onSubmit={handleSubmit} className="space-y-3.5">
              {/* Target Link Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Link / URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-sm placeholder:text-slate-600 font-mono transition"
                />
              </div>

              {/* Quantity Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Quantity <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Min: {service.minimumQuantity.toLocaleString('en-IN')} — Max:{' '}
                    {service.maximumQuantity.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min={service.minimumQuantity}
                  max={service.maximumQuantity}
                  value={quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuantity(val === '' ? '' : parseInt(val, 10));
                  }}
                  placeholder={`Min ${service.minimumQuantity}`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-sm placeholder:text-slate-600 font-mono transition"
                />
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Order Note (Optional)
                </label>
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Any custom instructions..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs placeholder:text-slate-600 transition"
                />
              </div>

              {/* Pricing & Balance Calculation Breakdown */}
              <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Price per 1000:</span>
                  <span className="font-mono text-slate-200">
                    {formatCurrency(service.pricePer1000, userCurrency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Quantity:</span>
                  <span className="font-mono text-slate-200">
                    {qtyNumber > 0 ? qtyNumber.toLocaleString('en-IN') : '0'}
                  </span>
                </div>

                <div className="border-t border-slate-800 pt-2 flex items-center justify-between font-bold text-sm">
                  <span className="text-white">Total Amount:</span>
                  <span className="font-mono text-emerald-400 text-base">
                    {formatCurrency(totalAmount, userCurrency)}
                  </span>
                </div>

                <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    Current Wallet Balance:
                  </span>
                  <span className="font-mono font-semibold text-white">
                    {formatCurrency(currentBalance, userCurrency)}
                  </span>
                </div>
              </div>

              {/* Insufficient Balance Notice */}
              {isInsufficientBalance && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Insufficient Wallet Balance</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      Required:{' '}
                      <span className="font-mono font-bold text-rose-300">
                        {formatCurrency(totalAmount, userCurrency)}
                      </span>
                    </div>
                    <div>
                      Available:{' '}
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCurrency(currentBalance, userCurrency)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenDeposit}
                    className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center justify-center gap-1.5 mt-1"
                  >
                    <span>Add Funds Now</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-submit-place-order"
                  disabled={isSubmitting || isInsufficientBalance || !qtyNumber}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <span>Place Order</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
