import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Printer,
  PackageCheck,
  CheckCheck,
  XCircle
} from 'lucide-react';
import { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const configMap: Record<OrderStatus, { label: string; bg: string; text: string; border: string; icon: any }> = {
    SUBMITTED: {
      label: 'Submitted',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      icon: Clock,
    },
    ACCEPTED: {
      label: 'Accepted',
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      icon: CheckCircle2,
    },
    AWAITING_APPROVAL: {
      label: 'Quote Revised',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: AlertCircle,
    },
    PRINTING: {
      label: 'Printing Job',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      icon: Printer,
    },
    READY_FOR_PICKUP: {
      label: 'Ready for Pickup',
      bg: 'bg-[#bbf451]/15',
      text: 'text-[#bbf451]',
      border: 'border-[#bbf451]/40',
      icon: PackageCheck,
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCheck,
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: XCircle,
    },
    REJECTED: {
      label: 'Rejected',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: XCircle,
    },
    RECEIVED: {
      label: 'Received',
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      icon: Clock,
    },
    QUEUED: {
      label: 'Queued to Print',
      bg: 'bg-teal-500/15',
      text: 'text-teal-300',
      border: 'border-teal-500/30',
      icon: Printer,
    },
  };

  const current = configMap[status] || {
    label: status,
    bg: 'bg-slate-800/60',
    text: 'text-slate-300',
    border: 'border-slate-700/50',
    icon: Clock,
  };

  const Icon = current.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size];

  return (
    <span className={`inline-flex items-center rounded-full border ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {current.label}
    </span>
  );
};
