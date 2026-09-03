import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, PlusCircle, ExternalLink } from 'lucide-react';
import { Order } from '../../types';
import { formatCurrency } from '../../lib/currency';
import confetti from 'canvas-confetti';

interface OrderSuccessModalProps {
  order: Order | null;
  onClose: () => void;
  onViewOrder: (orderId: string) => void;
  onCreateNew: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onViewOrder,
  onCreateNew,
}) => {
  useEffect(() => {
    if (order) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#059669', '#6ee7b7'],
        });
      } catch (err) {
        // silent fail if confetti unavailable
      }
    }
  }, [order]);

  if (!order) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Success Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 text-center overflow-hidden"
        >
          {/* Subtle green ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Success Checkmark Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 mb-4">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Order Placed Successfully!
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Your order has been safely created in the system.
          </p>

          {/* Order Details Card */}
          <div className="mt-5 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-xs text-slate-400">Order ID:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                #{order.orderId}
              </span>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                Service
              </span>
              <p className="text-xs text-slate-200 font-medium line-clamp-2 leading-relaxed">
                {order.serviceName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Quantity
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  {order.quantity.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Amount
                </span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {formatCurrency(order.totalAmount, order.currency)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">Status:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {order.status}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              id="btn-success-view-order"
              onClick={() => onViewOrder(order.id)}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
              <span>View Order</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="btn-success-create-new"
              onClick={onCreateNew}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Order</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
