'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Clock, User, DollarSign } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyContext';
import { format } from 'date-fns';

export default function RecentTransactions({ transactions }: { transactions: any[] }) {
  const { formatPrice } = useCurrency();

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Recent Transactions</h3>
        <button className="text-cyan-400 text-xs font-bold hover:underline uppercase tracking-widest">View All</button>
      </div>

      <div className="space-y-4">
        {transactions?.length > 0 ? transactions.map((tx, i) => (
          <motion.div 
            key={tx._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'SETTLEMENT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                {tx.type === 'SETTLEMENT' ? <DollarSign size={18} /> : <ArrowUpRight size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold">{tx.customerId?.name || 'Guest'}</p>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                  <Clock size={10} />
                  <span>{format(new Date(tx.date), 'hh:mm a')}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span>{tx.paymentType || tx.paymentMethod}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${tx.type === 'SETTLEMENT' ? 'text-emerald-400' : 'text-white'}`}>
                {tx.type === 'SETTLEMENT' ? '+' : ''}{formatPrice(tx.totalAmount || tx.amountPaid)}
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-tighter ${tx.status === 'PAID' ? 'text-emerald-500' : tx.status === 'DUE' ? 'text-rose-500' : 'text-amber-500'}`}>
                {tx.status}
              </p>
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-10 text-gray-500 italic text-sm">No recent transactions</div>
        )}
      </div>
    </div>
  );
}
