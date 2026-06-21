import React from 'react';

export type BadgeStatus = 
  | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  | 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL'
  | 'ACTIVE' | 'INACTIVE'
  | 'COMPLETED' | 'CANCELLED' | 'PROCESSING';

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string; // Optional custom label, otherwise derived from status
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  let displayLabel = label || status.replace(/_/g, ' ');
  let colorClass = '';

  switch (status) {
    case 'IN_STOCK':
    case 'PAID':
    case 'ACTIVE':
    case 'COMPLETED':
      colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      break;
    case 'LOW_STOCK':
    case 'PENDING':
    case 'PARTIAL':
    case 'PROCESSING':
      colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      break;
    case 'OUT_OF_STOCK':
    case 'OVERDUE':
    case 'CANCELLED':
    case 'INACTIVE':
      colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      break;
    default:
      colorClass = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      break;
  }

  return (
    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${colorClass} inline-flex items-center justify-center whitespace-nowrap h-6`}>
      {displayLabel}
    </div>
  );
}
