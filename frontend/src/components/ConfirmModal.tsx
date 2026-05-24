'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  isLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.9, opacity: 0, y: 20 }} 
          className="glass-panel w-full max-w-md p-8 rounded-[2.5rem] relative z-10 border border-white/10 shadow-2xl text-center"
        >
          <div className={`w-20 h-20 rounded-[2rem] ${isDanger ? 'bg-rose-500/20 text-rose-500' : 'bg-cyan-500/20 text-cyan-500'} flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-xl`}>
            <AlertTriangle size={40} />
          </div>

          <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">{message}</p>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onClose}
              className="py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-2xl transition-all border border-white/5"
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              disabled={isLoading}
              className={`py-4 ${isDanger ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/20'} text-white font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
