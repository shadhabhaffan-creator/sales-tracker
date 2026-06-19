'use client';

import { motion } from 'framer-motion';
import { Package, AlertTriangle } from 'lucide-react';

export default function LowStockAlerts({ products }: { products: any[] }) {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Inventory Alerts</h3>
        <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-[10px] font-bold rounded-lg border border-rose-500/20">
          {products?.length || 0} ITEMS
        </span>
      </div>

      <div className="space-y-3">
        {products?.length > 0 ? products.map((product, i) => (
          <motion.div 
            key={product._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <Package size={18} />
              </div>
              <div>
                <p className="text-sm font-bold truncate max-w-[120px]">{product.name}</p>
                <p className="text-[10px] text-gray-500 font-medium">SKU: {product.sku || 'N/A'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-rose-400">{product.stock}</p>
              <p className="text-[10px] text-gray-500 uppercase font-black">Stock</p>
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-6 text-gray-500 italic text-sm">All products in stock</div>
        )}
      </div>
    </div>
  );
}
