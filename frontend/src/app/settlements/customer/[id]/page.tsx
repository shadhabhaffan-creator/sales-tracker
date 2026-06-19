'use client';

import { useState, useEffect, use } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  User, 
  ShoppingCart, 
  Banknote, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Calendar,
  Printer,
  Loader2,
  FileText,
  Trash2
} from 'lucide-react';
import { settlementService } from '@/services/settlementService';
import { fetchWithAuth } from '@/services/api';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { toast } from 'sonner';
import Link from 'next/link';
import SettlementModal from '@/components/SettlementModal';

export default function CustomerSettlementProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { formatPrice } = useCurrency();
  const { isAdmin } = useUser();
  const [customer, setCustomer] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [deleteItem, setDeleteItem] = useState<any | null>(null);

  const handleDelete = async (item: any) => {
    try {
      setLoading(true);
      const endpoint = item.type === 'SALE' ? `/sales/${item._id}` : `/settlements/${item._id}`;
      await fetchWithAuth(endpoint, { method: 'DELETE' });
      toast.success(`${item.type} deleted successfully`);
      setDeleteItem(null);
      fetchData(); // Refresh all data
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete transaction');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [customerData, timelineData] = await Promise.all([
        fetchWithAuth(`/customers`),
        settlementService.getCustomerTimeline(id)
      ]);
      const currentCustomer = customerData.find((c: any) => c._id === id);
      setCustomer(currentCustomer);
      setTimeline(timelineData);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return (
    <DashboardLayout>
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-cyan-500 w-16 h-16" />
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Loading Profile...</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/settlements">
              <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={24} />
              </button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-white tracking-tight">{customer?.name}</h1>
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">Profile</span>
              </div>
              <p className="text-gray-400 font-medium">Customer ID: #{customer?._id?.slice(-6).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
            >
              <Banknote size={20} />
              <span className="font-bold">Collect Payment</span>
            </button>
            <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
              <Printer size={20} />
            </button>
          </div>
        </header>

        {/* Customer Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-8 rounded-2xl bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center border border-rose-500/20">
                <ArrowDownRight className="text-rose-400" size={24} />
              </div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Total Dues</span>
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter mb-1">{formatPrice(customer?.totalDue || 0)}</h3>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Outstanding Balance</p>
          </div>

          <div className="glass-panel p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <ArrowUpRight className="text-emerald-400" size={24} />
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Total Paid</span>
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter mb-1">{formatPrice(customer?.totalPaid || 0)}</h3>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Recovered Payments</p>
          </div>

          <div className="glass-panel p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/20">
                <ShoppingCart className="text-blue-400" size={24} />
              </div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Sales</span>
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter mb-1">{formatPrice((customer?.totalDue || 0) + (customer?.totalPaid || 0))}</h3>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Lifetime Business</p>
          </div>
        </div>

        {/* Transaction Timeline */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Clock className="text-cyan-500" />
              Transaction Timeline
            </h2>
          </div>

          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-white/10 to-transparent" />

            <div className="space-y-8 relative">
              {timeline.length === 0 ? (
                <div className="p-12 text-center glass-panel rounded-2xl border border-dashed border-white/10">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No transactions yet</p>
                </div>
              ) : timeline.map((item, idx) => (
                <motion.div 
                   key={item._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-6 md:gap-10 items-start"
                >
                  {/* Timeline Dot */}
                  <div className={`mt-2 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border-4 border-slate-950 z-10 shrink-0 shadow-xl ${
                    item.type === 'SALE' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}>
                    {item.type === 'SALE' ? <ShoppingCart className="text-white" size={20} /> : <Banknote className="text-white" size={20} />}
                  </div>

                  {/* Content Card */}
                  <div className="flex-1 glass-panel p-6 rounded-2xl hover:bg-white/5 transition-all group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            item.type === 'SALE' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">•</span>
                          <span className="text-gray-400 text-xs font-bold">{new Date(item.date).toLocaleString()}</span>
                        </div>
                        <h4 className="text-xl font-bold text-white">
                          {item.type === 'SALE' ? `Invoice #${item._id.slice(-6).toUpperCase()}` : `Settlement #${item._id.slice(-6).toUpperCase()}`}
                        </h4>
                      </div>
                      <div className="text-left md:text-right">
                        <p className={`text-2xl font-black tracking-tighter ${
                          item.type === 'SALE' ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {item.type === 'SALE' ? `-${formatPrice(item.totalAmount)}` : `+${formatPrice(item.amountPaid)}`}
                        </p>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          {item.type === 'SALE' ? item.paymentType : item.paymentMethod}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center">
                          <button 
                            onClick={() => setDeleteItem(item)}
                            className="p-2 hover:bg-rose-500/10 rounded-xl text-gray-500 hover:text-rose-400 transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                          <User size={14} />
                        </div>
                        <p className="text-xs text-gray-400 font-medium">Handled by: <span className="text-gray-200">{item.handledBy || 'Admin'}</span></p>
                      </div>
                      {item.notes && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                            <FileText size={14} />
                          </div>
                          <p className="text-xs text-gray-400 italic">"{item.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteItem(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-panel p-8 rounded-2xl max-w-md w-full relative z-10 shadow-2xl border border-white/10"
              >
                <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-rose-500/20">
                  <Trash2 className="text-rose-400" size={32} />
                </div>
                <h3 className="text-2xl font-black text-white text-center mb-2">Delete {deleteItem.type}?</h3>
                <p className="text-gray-400 text-center mb-8 font-medium">
                  This will reverse the transaction and update the customer balance. This action cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setDeleteItem(null)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(deleteItem)}
                    className="flex-1 btn-danger"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <SettlementModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData}
        initialCustomer={customer}
      />
    </DashboardLayout>
  );
}
