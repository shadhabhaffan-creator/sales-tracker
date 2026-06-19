'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MessageSquare, MapPin, Calendar, ShoppingBag, CreditCard, Clock, TrendingUp, ChevronRight, User, Loader2, Trash2 } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyContext';
import { settlementService } from '@/services/settlementService';
import ConfirmModal from '@/components/ConfirmModal';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/services/api';

export default function CustomerProfileModal({ customer, onClose }: { customer: any, onClose: () => void }) {
  const { formatPrice } = useCurrency();

  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetchWithAuth(`/customers/${customer._id}`, { method: 'DELETE' });
      toast.success('Customer deleted');
      onClose();
      window.location.reload(); 
    } catch (error: any) {
      toast.error('Failed to delete customer: ' + error.message);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const data = await settlementService.getCustomerTimeline(customer._id);
        setTimeline(data);
      } catch (error) {
        console.error('Failed to fetch timeline');
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [customer._id]);

  const purchases = timeline.filter(t => t.type === 'SALE').reverse();
  const payments = timeline.filter(t => t.type === 'SETTLEMENT').reverse();

  const stats = [
    { label: 'Total Spent', value: formatPrice(customer.totalSpent || 0), icon: TrendingUp, color: 'text-cyan-400' },
    { label: 'Total Paid', value: formatPrice(customer.totalPaid || 0), icon: CreditCard, color: 'text-emerald-400' },
    { label: 'Pending Due', value: formatPrice((customer.totalSpent || 0) - (customer.totalPaid || 0)), icon: Clock, color: 'text-rose-400' },
    { label: 'Last Purchase', value: customer.lastPurchaseDate ? format(new Date(customer.lastPurchaseDate), 'MMM dd') : 'Never', icon: ShoppingBag, color: 'text-indigo-400' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
        className="glass-panel w-full max-w-5xl max-h-[90vh] rounded-2xl relative z-10 shadow-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Side: Profile Info */}
        <div className="w-full md:w-80 bg-white/5 border-r border-white/5 p-8 flex flex-col items-center text-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-cyan-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-5xl font-black text-white relative z-10 border-4 border-white/10 shadow-2xl">
              {customer.name[0].toUpperCase()}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-[#0f172a] flex items-center justify-center z-20">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black mt-6 tracking-tight">{customer.name}</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Premium Customer</p>
          
          <div className="w-full mt-10 space-y-3">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
              <Phone size={18} className="text-cyan-400" />
              <div className="text-left">
                <p className="text-[10px] text-gray-500 font-black uppercase">Phone</p>
                <p className="text-sm font-bold">{customer.phone || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
              <MapPin size={18} className="text-indigo-400" />
              <div className="text-left">
                <p className="text-[10px] text-gray-500 font-black uppercase">Address</p>
                <p className="text-sm font-bold truncate max-w-[160px]">{customer.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="w-full mt-10 grid grid-cols-2 gap-3">
            <button className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-lg shadow-emerald-500/20 group">
              <MessageSquare size={20} className="text-white group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase">WhatsApp</span>
            </button>
            <button 
              onClick={() => setShowConfirmDelete(true)}
              disabled={isDeleting}
              className="flex-1 py-4 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border border-rose-500/20 group"
            >
              <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase">Delete</span>
            </button>
          </div>
        </div>

        {/* Custom Confirmation Modal */}
        <ConfirmModal 
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={handleDelete}
          isLoading={isDeleting}
          isDanger={true}
          title="Delete Customer?"
          message={`Are you sure you want to delete ${customer.name}? This will permanently remove their profile AND all associated sales and settlements history. This action cannot be undone.`}
          confirmText="Yes, Delete All"
          cancelText="No, Keep It"
        />

        {/* Right Side: Detailed Stats & History */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Financial Overview</h3>
              <p className="text-gray-400 text-sm font-medium">Detailed spending and payment analysis</p>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500/20 rounded-xl transition-all text-gray-400 hover:text-rose-400">
              <X size={20} />
            </button>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon size={14} className={stat.color} />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</span>
                </div>
                <p className="text-xl font-black tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* History Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Purchases */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Recent Purchases</h4>
                <button className="text-xs text-cyan-400 font-bold hover:underline">View All</button>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-400" /></div>
                ) : purchases.length > 0 ? purchases.map((sale, i) => (
                  <div key={sale._id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                        <ShoppingBag size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{sale.invoiceId || 'N/A'}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{format(new Date(sale.date), 'MMMM dd, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{formatPrice(sale.totalAmount)}</p>
                      <div className="flex items-center gap-1 justify-end">
                        <ChevronRight size={12} className="text-gray-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-6 text-gray-600 italic text-xs">No purchase history found</p>
                )}
              </div>
            </div>

            {/* Recent Settlements */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Recent Settlements</h4>
                <button className="text-xs text-emerald-400 font-bold hover:underline">History</button>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-400" /></div>
                ) : payments.length > 0 ? payments.map((payment, i) => (
                  <div key={payment._id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Payment Received</p>
                        <p className="text-[10px] text-gray-500 font-medium">{format(new Date(payment.date), 'MMMM dd, yyyy')} • {payment.paymentMethod}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400">+{formatPrice(payment.amountPaid)}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-6 text-gray-600 italic text-xs">No settlement history found</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Customer Remarks</h4>
            <div className="p-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <textarea 
                placeholder="Add a private note about this customer..." 
                className="w-full bg-transparent border-none outline-none text-sm text-gray-300 resize-none min-h-[100px] placeholder:text-gray-600"
                defaultValue={customer.notes}
              />
              <div className="flex justify-end mt-4">
                <button className="btn-secondary btn-sm">Save Notes</button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
