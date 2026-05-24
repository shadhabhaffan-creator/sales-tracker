'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface TopProduct {
  _id: string;
  name: string;
  salesCount?: number;
}

export default function TopProducts({ products }: { products: TopProduct[] }) {

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Top Products</h3>
        <TrendingUp size={18} className="text-emerald-400" />
      </div>

      <div className="space-y-4">
        {products?.length > 0 ? products.map((product, i) => (
          <div key={product._id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-gray-600 w-4">{i + 1}</span>
                <p className="text-sm font-bold text-gray-200">{product.name}</p>
              </div>
              <p className="text-xs font-bold text-cyan-400">{product.salesCount || 0} sold</p>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((product.salesCount || 0) * 10, 100)}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
              />
            </div>
          </div>
        )) : (
          <div className="text-center py-6 text-gray-500 italic text-sm">No sales data yet</div>
        )}
      </div>
    </div>
  );
}
