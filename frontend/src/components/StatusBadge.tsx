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
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: Clock,
    },
    ACCEPTED: {
      label: 'Accepted',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: CheckCircle2,
    },
    AWAITING_APPROVAL: {
      label: 'Quote Revised',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: AlertCircle,
    },
    PRINTING: {
      label: 'Printing Job',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: Printer,
    },
    READY_FOR_PICKUP: {
      label: 'Ready for Pickup',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      icon: PackageCheck,
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: CheckCheck,
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: XCircle,
    },
  };

  const current = configMap[status] || {
    label: status,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
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
