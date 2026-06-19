'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, TrendingUp, Users, ShoppingCart, Calendar, ArrowUpRight, ShieldCheck, DollarSign, Loader2, Truck, Warehouse } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyContext';
import { format } from 'date-fns';
import { fetchWithAuth } from '@/services/api';

export default function ProductDetailModal({ product, onClose }: { product: any, onClose: () => void }) {
  const { formatPrice } = useCurrency();
  const [history, setHistory] = useState<any[]>([]);
  const [supplier, setSupplier] = useState<any>(null);
  const [warehouse, setWarehouse] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [parentProduct, setParentProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [historyData, suppliersData, warehousesData] = await Promise.all([
          fetchWithAuth(`/products/${product._id}/history`),
          fetchWithAuth('/suppliers').catch(() => []),
          fetchWithAuth('/warehouses').catch(() => [])
        ]);
        setHistory(historyData);
        setWarehouses(warehousesData);
        if (product.supplierId) {
          const foundSup = suppliersData.find((s: any) => s._id === (product.supplierId._id || product.supplierId));
          if (foundSup) setSupplier(foundSup);
        }
        if (product.warehouseId) {
          const foundWh = warehousesData.find((w: any) => w._id === (product.warehouseId._id || product.warehouseId));
          if (foundWh) setWarehouse(foundWh);
        }
        if (product.type === 'CHILD' && product.parent_id) {
          const productsData = await fetchWithAuth('/products').catch(() => []);
          const parent = productsData.find((p: any) => p._id === product.parent_id || p.id === product.parent_id);
          if (parent) setParentProduct(parent);
        }
      } catch (error) {
        console.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };
    if (product?._id) loadData();
  }, [product]);

  if (!product) return null;

  const profit = product.sellingPrice - product.costPrice;
  const margin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;

  // Calculate real stats from history
  const totalUnitsSold = history.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = history.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const stats = [
    { label: 'Units Sold', value: `${totalUnitsSold} ${product.unit || 'UNIT'}`, icon: ShoppingCart, color: 'text-cyan-400' },
    { label: 'Revenue', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Profit Margin', value: `${margin.toFixed(1)}%`, icon: DollarSign, color: 'text-indigo-400' },
    { label: 'In Stock', value: `${product.stock} ${product.unit || 'UNIT'}`, icon: Package, color: product.stock < 10 ? 'text-rose-400' : 'text-emerald-400' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
        className="glass-panel w-full max-w-5xl max-h-[90vh] rounded-[3rem] relative z-10 shadow-2xl border border-white/10 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-8 flex items-center justify-between border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center border border-white/10 shadow-xl">
              <Package size={32} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-black tracking-tight text-white">{product.name}</h2>
                <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] font-black text-gray-500 uppercase tracking-widest">{product.sku || 'NO-SKU'}</span>
                {product.type === 'PARENT' && (
                  <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-400 uppercase tracking-widest rounded-lg">
                    Raw Material
                  </span>
                )}
                {product.type === 'CHILD' && (
                  <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-400 uppercase tracking-widest rounded-lg">
                    Child Product
                  </span>
                )}
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{product.category || 'Uncategorized'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500/20 rounded-2xl transition-all text-gray-400 hover:text-rose-400 border border-white/5 cursor-pointer">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white/5 p-6 rounded-[2rem] border border-white/5 group hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
                  <stat.icon className={`${stat.color} opacity-50 group-hover:opacity-100 transition-opacity`} size={18} />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter">{stat.value}</h3>
              </div>
            ))}
          </div>

          {/* Variants and Packaging Options Section */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-3 text-cyan-400 font-bold uppercase tracking-widest text-[10px]">
                <Package size={14} />
                <span>Product Variants & Packaging Options</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {product.variants.map((v: any, index: number) => {
                  const vProfit = v.sellingPrice - v.costPrice;
                  const vMargin = v.sellingPrice > 0 ? (vProfit / v.sellingPrice) * 100 : 0;
                  
                  // Find warehouses for this variant
                  const variantWarehouses = warehouses.filter((wh: any) => 
                    (wh.products || []).some((wp: any) => 
                      (wp.productId?._id === product._id || wp.productId === product._id) && 
                      wp.variantId === v._id
                    )
                  );

                  return (
                    <div key={v._id || index} className="bg-white/2 p-6 rounded-[2rem] border border-white/5 space-y-4 hover:border-cyan-500/20 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <h4 className="text-base font-black text-white">{v.name}</h4>
                            <span className="text-[9px] text-gray-500 font-mono font-bold tracking-wider">{v.sku || 'NO SKU'}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                            v.stock === 0 ? 'bg-rose-500/10 text-rose-400' : v.stock < 10 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {v.stock} {v.unit || 'PIECE'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] bg-white/2 p-3.5 rounded-2xl border border-white/5">
                          <div>
                            <span className="text-gray-500 uppercase font-black tracking-wider block mb-0.5">Cost</span>
                            <span className="text-white font-bold">{formatPrice(v.costPrice)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 uppercase font-black tracking-wider block mb-0.5">Retail</span>
                            <span className="text-cyan-400 font-bold">{formatPrice(v.sellingPrice)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 uppercase font-black tracking-wider block mb-0.5">Margin</span>
                            <span className="text-emerald-400 font-black">+{vMargin.toFixed(1)}%</span>
                          </div>
                        </div>

                        <div className="space-y-2 mt-4 text-[10px] text-gray-400">
                          <div className="flex items-center gap-2">
                            <Truck size={12} className="text-cyan-400 shrink-0" />
                            <span>Supplier: <strong className="text-white font-bold">{v.supplierId?.name || supplier?.name || 'Linked Source'}</strong></span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Warehouse size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-gray-500 uppercase font-black tracking-widest block mb-1">Storage Allocation</span>
                              {variantWarehouses.length === 0 ? (
                                <span className="italic text-gray-600 block">Not allocated to warehouses</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                  {variantWarehouses.map((wh: any) => {
                                    const allocStock = wh.products.find((wp: any) => 
                                      (wp.productId?._id === product._id || wp.productId === product._id) && 
                                      wp.variantId === v._id
                                    )?.stock || 0;
                                    return (
                                      <span key={wh._id} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] text-gray-300 font-medium">
                                        {wh.name}: {allocStock} units
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Sales History */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3 text-cyan-400 font-bold uppercase tracking-widest text-[10px]">
                <Users size={14} />
                <span>Customer Purchase History</span>
              </div>
              
              <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 min-h-[300px] flex flex-col">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="p-4">Customer</th>
                      <th className="p-4 text-center">Qty</th>
                      <th className="p-4 text-right">Price</th>
                      <th className="p-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="p-20 text-center">
                          <Loader2 className="animate-spin mx-auto text-cyan-500" size={32} />
                        </td>
                      </tr>
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-20 text-center text-gray-500 italic font-medium">No sales history found for this product</td>
                      </tr>
                    ) : history.map((item, i) => (
                      <tr key={i} className="text-sm hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center font-bold text-[10px] text-indigo-400">
                              {item.customerName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold">{item.customerName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-medium">{item.quantity} <span className="text-[10px] text-gray-500 uppercase">{product.unit || 'UNIT'}</span></td>
                        <td className="p-4 text-right font-black text-cyan-400">{formatPrice(item.price)}</td>
                        <td className="p-4 text-right text-gray-500 font-medium">{format(new Date(item.date), 'MMM dd, yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Logistics & Pricing columns */}
            <div className="space-y-6">
              {/* Pricing Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-400 font-bold uppercase tracking-widest text-[10px]">
                  <ShieldCheck size={14} />
                  <span>Pricing Breakdown</span>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-gray-400 text-xs font-medium">Cost Price</span>
                    <span className="text-sm font-bold">{formatPrice(product.costPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-gray-400 text-xs font-medium">Selling Price</span>
                    <span className="text-sm font-black text-cyan-400">{formatPrice(product.sellingPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs font-medium">Profit margin</span>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400">+{formatPrice(profit)}</p>
                      <p className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-tighter">{margin.toFixed(1)}% MARGIN</p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Stock Status</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${product.stock < 10 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {product.stock < 10 ? 'LOW STOCK' : 'OPTIMAL'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${product.stock < 10 ? 'bg-rose-500' : 'bg-cyan-500'}`} style={{ width: `${Math.min(product.stock * 2, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Supply & Storage Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-cyan-400 font-bold uppercase tracking-widest text-[10px]">
                  <Truck size={14} />
                  <span>Logistics & Storage</span>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4 text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    <Truck size={16} className="text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Supplier Partner</p>
                      <p className="text-white font-bold">{supplier ? supplier.name : 'No supplier linked'}</p>
                      {supplier?.companyName && <p className="text-[9px] text-gray-500 font-sans">{supplier.companyName}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                    <Warehouse size={16} className="text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Storage Facility</p>
                      <p className="text-white font-bold">{warehouse ? warehouse.name : 'Central Inventory Catalog'}</p>
                      {warehouse?.location && <p className="text-[9px] text-gray-500 font-sans">{warehouse.location}</p>}
                    </div>
                  </div>
                  {product.type === 'CHILD' && (
                    <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                      <Package size={16} className="text-purple-400 shrink-0" />
                      <div>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Parent Product Link</p>
                        <p className="text-white font-bold">{parentProduct ? parentProduct.name : 'Bulk Parent'}</p>
                        <p className="text-[9px] text-purple-400 font-bold">Consumes {product.conversion_quantity} {parentProduct?.unit || 'Liters'} per Unit</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
