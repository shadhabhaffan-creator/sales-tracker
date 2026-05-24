'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Wallet, Loader2, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';

import CustomerProfileModal from '@/components/CustomerProfileModal';
import { Search, LayoutGrid, List, MessageSquare, Phone, ChevronRight, UserPlus, Filter, MoreVertical, Star } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomersPage() {
  const { formatPrice } = useCurrency();
  const { isAdmin, user } = useUser();
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });
  const [settlementData, setSettlementData] = useState({ amount: 0, paymentMethod: 'CASH', notes: '' });

  const fetchCustomers = async () => {
    try {
      const data = await fetchWithAuth('/customers');
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) { toast.error('Failed to fetch customers'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredCustomers(
      customers.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.phone?.includes(term) || 
        c.email?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, customers]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    try {
      await fetchWithAuth('/customers', { 
        method: 'POST', 
        body: JSON.stringify(formData) 
      });
      toast.success('Customer added'); 
      setIsModalOpen(false); 
      setFormData({ name: '', phone: '', email: '', address: '' }); 
      fetchCustomers(); 
    } catch (error: any) { toast.error(error.message); } finally { setLoading(false); }
  };

  const handleSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    try {
      await fetchWithAuth('/settlements', { 
        method: 'POST', 
        body: JSON.stringify({ 
          customerId: selectedCustomer._id,
          amountPaid: settlementData.amount,
          paymentMethod: settlementData.paymentMethod,
          notes: settlementData.notes,
          handledBy: user?.username || 'admin'
        }) 
      });
      toast.success('Settlement recorded'); 
      setIsSettlementModalOpen(false); 
      setSettlementData({ amount: 0, paymentMethod: 'CASH', notes: '' }); 
      fetchCustomers(); 
    } catch (error: any) { toast.error(error.message); } finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Customer Relationship</h1>
            <p className="text-gray-400 font-medium">Manage your clients and their transaction history</p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
              <button 
                onClick={() => setViewMode('GRID')} 
                className={`p-2 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-gray-500 hover:text-white'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewMode('LIST')} 
                className={`p-2 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-gray-500 hover:text-white'}`}
              >
                <List size={20} />
              </button>
            </div>
            {isAdmin && (
              <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-white font-black text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center gap-2">
                <UserPlus size={18} />
                <span>ADD CUSTOMER</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, phone, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-500"
            />
          </div>
          <div className="flex gap-4">
            <button className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-gray-400 flex items-center gap-2 hover:bg-white/10 transition-all">
              <Filter size={18} />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="h-60 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-400 w-12 h-12" /></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="glass-panel p-20 text-center rounded-[3rem] border border-white/5">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-600">
              <Users size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-400">No Customers Found</h3>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search or add a new customer.</p>
          </div>
        ) : viewMode === 'GRID' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer, i) => {
              const balance = (customer.totalSpent || 0) - (customer.totalPaid || 0);
              return (
                <motion.div 
                  key={customer._id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel p-8 rounded-[2.5rem] group hover:scale-[1.02] transition-all border border-white/5 relative overflow-hidden cursor-pointer"
                  onClick={() => setSelectedProfile(customer)}
                >
                  <div className="absolute top-6 right-6">
                    <button className="p-2 hover:bg-white/10 rounded-xl text-gray-600 hover:text-white transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className={`absolute inset-0 rounded-[2rem] blur-md opacity-20 group-hover:opacity-60 transition-opacity ${balance > 1000 ? 'bg-rose-500 animate-pulse' : 'bg-cyan-500'}`} />
                      <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-3xl font-black text-white relative z-10 border border-white/10 shadow-2xl">
                        {customer.name[0].toUpperCase()}
                      </div>
                      {balance > 0 && (
                        <div className="absolute -top-2 -right-2 px-2 py-1 bg-rose-500 text-white text-[10px] font-black rounded-lg shadow-lg shadow-rose-500/30 z-20">
                          DUE
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-black group-hover:text-cyan-400 transition-colors">{customer.name}</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">{customer.phone || 'NO PHONE'}</p>
                    
                    <div className="w-full mt-8 grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-left">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Total Spent</p>
                        <p className="text-sm font-bold text-gray-300">{formatPrice(customer.totalSpent || 0)}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-left">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Balance</p>
                        <p className={`text-sm font-bold ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatPrice(balance)}</p>
                      </div>
                    </div>

                    <div className="w-full mt-6 flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); /* WhatsApp logic */ }}
                        className="flex-1 p-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl transition-all border border-emerald-500/10 flex items-center justify-center"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); /* Call logic */ }}
                        className="flex-1 p-3 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded-xl transition-all border border-cyan-500/10 flex items-center justify-center"
                      >
                        <Phone size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setIsSettlementModalOpen(true); }}
                        className="flex-[2] py-3 bg-white/5 hover:bg-white/10 text-xs font-black uppercase rounded-xl transition-all border border-white/10"
                      >
                        SETTLE
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                  <th className="p-6">Customer</th>
                  <th className="p-6">Contact</th>
                  <th className="p-6">Total Spent</th>
                  <th className="p-6">Current Balance</th>
                  <th className="p-6">Last Activity</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((customer) => {
                  const balance = (customer.totalSpent || 0) - (customer.totalPaid || 0);
                  return (
                    <tr 
                      key={customer._id} 
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => setSelectedProfile(customer)}
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
                            {customer.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-cyan-400 transition-colors">{customer.name}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Gold Member</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <p className="text-sm font-medium text-gray-300">{customer.phone || 'N/A'}</p>
                        <p className="text-[10px] text-gray-500">{customer.email || 'No email'}</p>
                      </td>
                      <td className="p-6 font-black text-white">{formatPrice(customer.totalSpent || 0)}</td>
                      <td className="p-6">
                        <span className={`font-black ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formatPrice(balance)}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-600" />
                          <span className="text-xs font-medium text-gray-400">{customer.lastPurchaseDate ? format(new Date(customer.lastPurchaseDate), 'MMM dd, yyyy') : 'No records'}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-end gap-2">
                          <button className="p-3 bg-white/5 hover:bg-cyan-500/10 rounded-xl text-gray-400 hover:text-cyan-400 transition-all border border-transparent hover:border-cyan-500/20"><ChevronRight size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Customer Profile Modal */}
        <AnimatePresence>
          {selectedProfile && (
            <CustomerProfileModal customer={selectedProfile} onClose={() => setSelectedProfile(null)} />
          )}
        </AnimatePresence>

        {/* New Customer Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-panel w-full max-w-lg p-10 rounded-[3rem] relative z-10 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black text-white tracking-tight">New Customer</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddCustomer} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Customer Name</label>
                    <input placeholder="Full Name" required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                      <input placeholder="+91" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                      <input placeholder="Optional" type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Address</label>
                    <textarea placeholder="Street, City, Zip" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all min-h-[100px] resize-none" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-white font-black text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all active:scale-95">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'CREATE CUSTOMER PROFILE'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Settlement Modal (Re-used) */}
        <AnimatePresence>
          {isSettlementModalOpen && selectedCustomer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettlementModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-panel w-full max-w-md p-10 rounded-[3rem] relative z-10 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black tracking-tight text-white uppercase">Record Payment</h2>
                  <button onClick={() => setIsSettlementModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 bg-rose-500/10 rounded-[2rem] mb-8 border border-rose-500/20 text-center">
                  <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.2em] mb-1">Outstanding Balance</p>
                  <p className="text-4xl font-black text-rose-400 tracking-tighter">{formatPrice((selectedCustomer.totalSpent || 0) - (selectedCustomer.totalPaid || 0))}</p>
                </div>
                <form onSubmit={handleSettlement} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Amount to Pay</label>
                    <input type="number" step="0.01" required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-black text-center text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" value={settlementData.amount || ''} onChange={(e) => setSettlementData({...settlementData, amount: e.target.value === '' ? 0 : parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['CASH', 'UPI', 'BANK'].map(method => (
                        <button 
                          key={method}
                          type="button"
                          onClick={() => setSettlementData({...settlementData, paymentMethod: method})}
                          className={`py-3 rounded-xl text-[10px] font-black transition-all border ${settlementData.paymentMethod === method ? 'bg-cyan-500 border-cyan-400 shadow-lg shadow-cyan-500/20 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white font-black text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all active:scale-95">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'CONFIRM SETTLEMENT'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
