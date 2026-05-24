'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, User, CreditCard, Banknote, Landmark, CheckCircle2, Loader2 } from 'lucide-react';
import { settlementService } from '@/services/settlementService';
import { fetchWithAuth } from '@/services/api';
import { toast } from 'sonner';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  totalDue: number;
}

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCustomer?: Customer | null;
}

export default function SettlementModal({ isOpen, onClose, onSuccess, initialCustomer }: SettlementModalProps) {
  const { formatPrice } = useCurrency();
  const { user } = useUser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const fetchCustomers = async () => {
    try {
      const data = await fetchWithAuth('/customers');
      setCustomers(data);
    } catch {
      toast.error('Failed to fetch customers');
    }
  };

  useEffect(() => {
    if (isOpen && !initialCustomer) {
      setTimeout(() => {
        fetchCustomers();
      }, 0);
    }
    if (initialCustomer) {
      setTimeout(() => {
        setSelectedCustomer(initialCustomer);
      }, 0);
    }
  }, [isOpen, initialCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return toast.error('Please select a customer');
    if (!amount || parseFloat(amount) <= 0) return toast.error('Please enter a valid amount');

    setLoading(true);
    try {
      await settlementService.createSettlement({
        customerId: selectedCustomer._id,
        amountPaid: parseFloat(amount),
        paymentMethod,
        transactionId: (paymentMethod === 'UPI' || paymentMethod === 'BANK') ? transactionId : '',
        notes,
        handledBy: user?.username || 'System'
      });
      toast.success('Settlement recorded successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to create settlement');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Record Settlement</h2>
                  <p className="text-gray-400 text-sm">Process customer payment</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {!initialCustomer && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400 ml-1">Select Customer</label>
                    {selectedCustomer ? (
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-cyan-500/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                            <User className="text-cyan-400" size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-white">{selectedCustomer.name}</p>
                            <p className="text-xs text-gray-400">Due: <span className="text-rose-400 font-bold">{formatPrice(selectedCustomer.totalDue)}</span></p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSelectedCustomer(null)}
                          className="text-xs text-gray-400 hover:text-white underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                          type="text"
                          placeholder="Search customers..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                        {search && filteredCustomers.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden z-10 shadow-2xl">
                            {filteredCustomers.slice(0, 5).map(c => (
                              <button
                                key={c._id}
                                type="button"
                                onClick={() => setSelectedCustomer(c)}
                                className="w-full p-4 text-left hover:bg-white/5 border-b border-white/5 last:border-0 flex justify-between items-center"
                              >
                                <div>
                                  <p className="font-bold text-white">{c.name}</p>
                                  <p className="text-xs text-gray-400">{c.phone}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-400">Due</p>
                                  <p className="font-bold text-rose-400">{formatPrice(c.totalDue)}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selectedCustomer && initialCustomer && (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mb-6">
                    <p className="text-sm text-gray-400 mb-1">Customer</p>
                    <p className="text-lg font-bold text-white">{selectedCustomer.name}</p>
                    <div className="mt-2 flex justify-between items-end">
                      <div>
                        <p className="text-xs text-gray-400">Outstanding Due</p>
                        <p className="text-xl font-black text-rose-400">{formatPrice(selectedCustomer.totalDue)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400 ml-1">Amount Paid</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold text-lg focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400 ml-1">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2 h-[60px]">
                      {[
                        { id: 'CASH', icon: Banknote },
                        { id: 'UPI', icon: CreditCard },
                        { id: 'BANK', icon: Landmark }
                      ].map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex flex-col items-center justify-center rounded-xl border transition-all ${
                            paymentMethod === method.id 
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
                              : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                          }`}
                        >
                          <method.icon size={18} />
                          <span className="text-[10px] font-bold mt-1">{method.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {(paymentMethod === 'UPI' || paymentMethod === 'BANK') && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="text-sm font-semibold text-gray-400 ml-1">Transaction ID / Reference</label>
                      <input
                        type="text"
                        placeholder="Enter Transaction ID..."
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 ml-1">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add details about this settlement..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors resize-none h-24"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedCustomer}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-bold text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                      <span>Confirm Settlement</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
