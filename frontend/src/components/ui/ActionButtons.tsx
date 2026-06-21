'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, Eye, Copy, Printer } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

export type ActionType = 'edit' | 'delete' | 'view' | 'duplicate' | 'print';

interface ActionButtonsProps {
  actions: {
    type: ActionType;
    onClick: (e: React.MouseEvent) => void;
    disabled?: boolean;
    title?: string;
  }[];
}

export function ActionButtons({ actions }: ActionButtonsProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<((e: React.MouseEvent) => void) | null>(null);

  const handleDeleteClick = (onClick: (e: React.MouseEvent) => void) => {
    setPendingDelete(() => onClick);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDelete) {
      const dummyEvent = {
        stopPropagation: () => {},
        preventDefault: () => {},
      } as unknown as React.MouseEvent;
      pendingDelete(dummyEvent);
    }
    setIsConfirmOpen(false);
    setPendingDelete(null);
  };

  return (
    <div className="flex items-center justify-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
      {actions.map((action, idx) => {
        const Icon = getIcon(action.type);
        const btnClass = getBtnClass(action.type);
        const labelText = action.type === 'edit' ? 'Edit' : action.type === 'delete' ? 'Delete' : '';
        
        return (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              if (action.type === 'delete') {
                handleDeleteClick(action.onClick);
              } else {
                action.onClick(e);
              }
            }}
            disabled={action.disabled}
            className={`${btnClass} h-11 min-w-[44px] px-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border outline-none focus:ring-2 focus:ring-cyan-500/50`}
            title={action.title || action.type.charAt(0).toUpperCase() + action.type.slice(1)}
          >
            <Icon size={20} className="shrink-0" />
            {labelText && (
              <span className="hidden lg:inline text-xs font-bold shrink-0">{labelText}</span>
            )}
          </button>
        );
      })}

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this record? This action is permanent and cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
      />
    </div>
  );
}

function getIcon(type: ActionType) {
  switch (type) {
    case 'edit': return Edit2;
    case 'delete': return Trash2;
    case 'view': return Eye;
    case 'duplicate': return Copy;
    case 'print': return Printer;
    default: return Edit2;
  }
}

function getBtnClass(type: ActionType) {
  switch (type) {
    case 'edit': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)]';
    case 'delete': return 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 hover:shadow-[0_0_12px_rgba(244,63,94,0.3)]';
    case 'view': return 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]';
    case 'duplicate': return 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]';
    case 'print': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]';
    default: return 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]';
  }
}
