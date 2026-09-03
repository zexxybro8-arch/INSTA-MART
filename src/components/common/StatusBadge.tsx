import React from 'react';
import { OrderStatus, DepositStatus, TicketStatus } from '../../types';
import { Clock, RefreshCw, CheckCircle, AlertCircle, XCircle, Undo2 } from 'lucide-react';

interface StatusBadgeProps {
  status: OrderStatus | DepositStatus | TicketStatus | string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', showIcon = true }) => {
  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  let icon = <Clock className="w-3.5 h-3.5" />;

  switch (status) {
    case 'Pending':
    case 'Open':
      bg = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      icon = <Clock className="w-3.5 h-3.5 text-amber-400" />;
      break;
    case 'Processing':
    case 'In Progress':
      bg = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      icon = <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />;
      break;
    case 'Completed':
    case 'Approved':
    case 'Answered':
      bg = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      icon = <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      break;
    case 'Partial':
      bg = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      icon = <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />;
      break;
    case 'Cancelled':
    case 'Rejected':
    case 'Closed':
      bg = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      icon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      break;
    case 'Refunded':
      bg = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      icon = <Undo2 className="w-3.5 h-3.5 text-purple-400" />;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg} ${className}`}
    >
      {showIcon && icon}
      <span>{status}</span>
    </span>
  );
};
