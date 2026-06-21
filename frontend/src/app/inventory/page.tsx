'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Boxes, 
  Layers, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  TrendingUp, 
  Package, 
  ArrowUpRight, 
  Loader2, 
  RefreshCw,
  Info
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { fetchWithAuth } from '@/services/api';
import { useCurrency } from '@/components/CurrencyContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function InventoryDashboard() {
  const { formatPrice } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/inventory');
      setData(res);
    } catch (error) {
      toast.error('Failed to load bulk inventory details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  const filteredMappings = data?.mappings?.filter((m: any) => {
    const parentName = m.parent.name.toLowerCase();
    const childrenNames = m.children.map((c: any) => c.name.toLowerCase()).join(' ');
    const term = searchTerm.toLowerCase();
    return parentName.includes(term) || childrenNames.includes(term);
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase flex items-center gap-3">
              <Boxes className="text-cyan-400" size={36} />
              Bulk Inventory & Conversion
            </h1>
            <p className="text-gray-400 font-medium">Manage parent raw materials, linked sellable products, and conversion logic</p>
          </div>
          <button 
            onClick={fetchInventoryData}
            disabled={loading}
            className="self-start md:self-auto btn-secondary"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync Assets</span>
          </button>
        </div>

        {/* Stats Grid */}
        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel p-8 rounded-2xl border border-white/5 h-32 animate-pulse bg-white/2" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Parent Volume */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-purple-500/10 to-transparent hover:border-purple-500/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bulk Volume</span>
                <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                  <Boxes size={20} />
                </div>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter">
                {data?.stats?.totalParentStock?.toFixed(1) || 0}
              </h3>
              <p className="text-xs text-gray-500 mt-2 font-medium">Aggregated raw stock across storage facilities</p>
            </motion.div>

            {/* Active Raw Materials */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-500/10 to-transparent hover:border-cyan-500/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Raw Material Catalogs</span>
                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Layers size={20} />
                </div>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter">
                {data?.stats?.activeParentProducts || 0}
              </h3>
              <p className="text-xs text-gray-500 mt-2 font-medium">Active bulk source catalogs currently tracked</p>
            </motion.div>

            {/* Converted Child Products */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent hover:border-emerald-500/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked Sellables</span>
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Activity size={20} />
                </div>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter">
                {data?.stats?.totalLinkedChildren || 0}
              </h3>
              <p className="text-xs text-gray-500 mt-2 font-medium">Child products auto-linked for packaging stock</p>
            </motion.div>
          </div>
        )}

        {/* Main Grid: Mappings & Movements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Mappings Grid */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Layers className="text-cyan-400" size={18} />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Parent-Child Stock Mappings</h3>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  placeholder="Filter materials..." 
                  className="w-full glass-input pl-11 placeholder-gray-500 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="glass-panel py-20 text-center border border-white/5">
                <Loader2 className="animate-spin text-cyan-400 mx-auto w-10 h-10" />
                <p className="text-xs text-gray-500 mt-4 font-bold uppercase tracking-wider">Loading system configurations...</p>
              </div>
            ) : filteredMappings.length === 0 ? (
              <div className="glass-panel p-16 text-center border border-white/5 text-gray-500 italic text-sm font-medium">
                No inventory mappings configured. Create Raw Materials and link Converted Sellable Products first!
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMappings.map((item: any) => {
                  const parent = item.parent;
                  const children = item.children || [];
                  const isExpanded = !!expandedParents[parent.id];

                  return (
                    <motion.div 
                      key={parent.id}
                      layout
                      className="glass-panel rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors"
                    >
                      {/* Parent Row */}
                      <div 
                        onClick={() => toggleParent(parent.id)}
                        className="py-[18px] px-6 flex items-center justify-between cursor-pointer hover:bg-white/2 transition-colors select-none"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400">
                            <Boxes size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5">
                              <h4 className="text-lg font-black text-white">{parent.name}</h4>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                                Raw
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                              <span>SKU: {parent.sku || 'NO-SKU'}</span>
                              <span>•</span>
                              <span>Supplier: {parent.supplierId?.name || 'Raw Supplier'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-xl font-black text-white tracking-tighter">
                              {parent.stock} {parent.unit === 'LITER' ? 'L' : (parent.unit === 'UNIT' ? 'L' : (parent.unit || 'L'))}
                            </span>
                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">
                              Bulk Stock
                            </span>
                          </div>
                          <div className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400">
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </div>

                      {/* Children List */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden bg-white/2 border-t border-white/5 divide-y divide-white/5"
                          >
                            <div className="px-6 py-5 bg-white/5 text-[9px] font-black text-gray-400 uppercase tracking-widest grid grid-cols-12 gap-4">
                              <div className="col-span-5">Linked Child Product (Package / Retail unit)</div>
                              <div className="col-span-3 text-center">Conversion Formula</div>
                              <div className="col-span-2 text-right">Computed Stock</div>
                              <div className="col-span-2 text-right">Price</div>
                            </div>
                            
                            {children.length === 0 ? (
                              <div className="px-6 py-6 text-center text-xs text-gray-500 italic">
                                No child products linked to this parent material.
                              </div>
                            ) : (
                              children.map((child: any) => (
                                <div key={child.id} className="px-6 py-[18px] text-xs grid grid-cols-12 gap-4 items-center hover:bg-white/2 transition-colors">
                                  <div className="col-span-5 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
                                      <Package size={16} />
                                    </div>
                                    <div>
                                      <span className="font-bold text-white block">{child.name}</span>
                                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{child.sku || 'NO-SKU'}</span>
                                    </div>
                                  </div>
                                  <div className="col-span-3 text-center text-gray-400 font-medium">
                                    1 Unit = <strong className="text-cyan-400">{child.conversion_quantity}</strong> {parent.unit === 'LITER' ? 'L' : (parent.unit === 'UNIT' ? 'L' : (parent.unit || 'L'))}
                                  </div>
                                  <div className="col-span-2 text-right">
                                    <span className="font-black text-sm text-emerald-400 block">
                                      {child.stock}
                                    </span>
                                    <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider">
                                      Units Available
                                    </span>
                                  </div>
                                  <div className="col-span-2 text-right font-bold text-white">
                                    {formatPrice(child.sellingPrice)}
                                  </div>
                                </div>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Movements Ledger Log */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="text-cyan-400" size={18} />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Conversion History Ledger</h3>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {loading ? (
                <div className="py-20 text-center">
                  <Loader2 className="animate-spin text-cyan-400 mx-auto" />
                </div>
              ) : !data?.movements || data.movements.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500 italic">
                  No conversion movements recorded.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.movements.map((m: any, idx: number) => {
                    const isParent = m.productId?.type === 'PARENT';
                    return (
                      <div key={m.id || idx} className="p-4 bg-white/2 border border-white/5 rounded-2xl text-xs space-y-2 hover:bg-white/5 transition-all">
                        <div className="flex justify-between items-center text-[9px] text-gray-500 font-bold">
                          <span className={m.type === 'INCOMING' ? 'badge-success' : 'badge-danger'}>
                            {m.type}
                          </span>
                          <span>{format(new Date(m.createdAt), 'MMM dd, hh:mm a')}</span>
                        </div>

                        <div className="flex justify-between items-baseline pt-1">
                          <div className="min-w-0 pr-2">
                            <span className="text-white font-bold block truncate">{m.productId?.name || 'Bulk Item'}</span>
                            <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded mt-0.5 inline-block ${
                              isParent ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}>
                              {isParent ? 'Raw Material' : 'Child Product'}
                            </span>
                          </div>
                          <span className={`font-black text-sm shrink-0 ${m.type === 'OUTGOING' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {m.type === 'OUTGOING' ? '-' : '+'}{m.quantity} {m.productId ? (m.productId.type === 'CHILD' ? 'Units' : (m.productId.type === 'PARENT' && (m.productId.unit === 'LITER' || m.productId.unit === 'UNIT') ? 'L' : (m.productId.unit === 'LITER' ? 'L' : (m.productId.unit === 'UNIT' ? 'Units' : (m.productId.unit || 'L'))))) : 'Units'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-gray-500 pt-1 border-t border-white/5">
                          <span className="truncate pr-2">Ref: {m.reference || 'Stock Adjustment'}</span>
                          <span className="text-cyan-400 shrink-0">@{m.performedBy || 'System'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Help / Explanation Card */}
            <div className="glass-panel p-6 rounded-2xl border border-cyan-500/10 bg-cyan-500/2 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-black uppercase text-[10px] tracking-wider">
                <Info size={14} />
                <span>Conversion Mechanics</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                When child products are sold, bulk quantities are auto-deducted from parent stock (e.g. 5x 200ml deductions = 1L parent stock reduction). 
                Adding raw parent stock via purchase automatically recalculates available child units.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
