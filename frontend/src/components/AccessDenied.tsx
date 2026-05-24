'use client';

import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AccessDenied() {
  return (
    <div className="h-[60vh] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel w-full max-w-lg p-10 rounded-[3rem] text-center border border-rose-500/10 shadow-2xl relative overflow-hidden"
      >
        {/* Glow Effects */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-rose-500/10 blur-[50px] rounded-full" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 blur-[50px] rounded-full" />

        <div className="relative z-10">
          <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 4,
                ease: "easeInOut"
              }}
              className="w-20 h-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center border border-rose-500/20 text-rose-500 shadow-lg shadow-rose-500/25"
            >
              <ShieldAlert size={40} />
            </motion.div>
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-0 right-0 bg-slate-900 border border-white/10 rounded-full p-2 text-gray-400 shadow-md"
            >
              <Lock size={16} />
            </motion.div>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white mb-4 uppercase">
            Access Denied
          </h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
            You do not have the required permissions to access this page. Please contact your system administrator for authorization.
          </p>

          <Link href="/dashboard" passHref>
            <button className="px-6 py-4 bg-white/5 hover:bg-white/10 text-xs font-black uppercase text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2 mx-auto cursor-pointer active:scale-95">
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
