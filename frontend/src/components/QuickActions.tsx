'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ShoppingCart, UserPlus, Receipt, X } from 'lucide-react';
import Link from 'next/link';

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: ShoppingCart, label: 'New Sale', href: '/sales', color: 'bg-cyan-500' },
    { icon: UserPlus, label: 'Add Customer', href: '/customers', color: 'bg-indigo-500' },
    { icon: Receipt, label: 'New Expense', href: '/expenses', color: 'bg-rose-500' },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col gap-3 mb-2">
            {actions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={action.href}>
                  <div className="flex items-center gap-3 group">
                    <span className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
                      {action.label}
                    </span>
                    <div className={`${action.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/20 hover:scale-110 transition-transform cursor-pointer`}>
                      <action.icon size={20} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${isOpen ? 'bg-rose-500 rotate-45' : 'bg-cyan-500 shadow-cyan-500/30'}`}
      >
        <Plus size={32} />
      </button>
    </div>
  );
}
