import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Clock,
  Layers,
  FileText,
  User,
  Zap,
} from 'lucide-react';
import { Order } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency } from '../../lib/currency';

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  if (!order) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(order.link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.orderId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const createdDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const createdTime = new Date(order.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const updatedDate = new Date(order.updatedAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl z-10 my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-base">
                #{order.orderId}
              </span>
              <button
                onClick={handleCopyId}
                className="text-slate-400 hover:text-white p-1 rounded transition"
                title="Copy Order ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto pr-1 mt-4 space-y-4 flex-1 text-xs">
            {/* Service & Category Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                  {order.categoryName} → {order.subcategoryName}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5 leading-snug">
                  {order.serviceName}
                </h4>
              </div>

              {/* URL */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-400 block text-[11px] mb-1">Target Link:</span>
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-mono text-slate-200 truncate select-all">
                    {order.link}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleCopyLink}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Copy Link"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={order.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Open Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Quantity</span>
                <span className="font-mono font-bold text-white text-sm">
                  {order.quantity.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Start Count</span>
                <span className="font-mono font-bold text-slate-300 text-sm">
                  {order.startCount}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Current</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {order.currentCount}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Remains</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {order.remains}
                </span>
              </div>
            </div>

            {/* Financial Details */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Service Price:</span>
                <span className="font-mono text-slate-200">
                  {formatCurrency(order.servicePrice, order.currency)} / 1000
                </span>
              </div>
              <div className="flex items-center justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
                <span>Total Amount Charged:</span>
                <span className="font-mono text-emerald-400 text-base">
                  {formatCurrency(order.totalAmount, order.currency)}
                </span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-slate-400 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Created Date:
                </span>
                <span className="font-mono text-slate-200">{createdDate} at {createdTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Last Updated:
                </span>
                <span className="font-mono text-slate-200">{updatedDate}</span>
              </div>
            </div>

            {/* Notes Section */}
            {(order.customerNote || order.adminNote) && (
              <div className="space-y-2">
                {order.customerNote && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-slate-300 block mb-0.5 text-[11px]">
                      Customer Note:
                    </span>
                    <p className="text-slate-400">{order.customerNote}</p>
                  </div>
                )}
                {order.adminNote && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                    <span className="font-semibold text-emerald-300 block mb-0.5 text-[11px]">
                      Admin Note:
                    </span>
                    <p className="text-emerald-200">{order.adminNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
