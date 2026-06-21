'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';

import { Search, Filter, RefreshCcw, Paperclip, ChevronRight, TrendingDown, DollarSign, Calendar as CalendarIcon, Tag } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, truncateUUID } from '@/components/ui/Table';
import { StatusBadge, BadgeStatus } from '@/components/ui/StatusBadge';
import { ActionButtons } from '@/components/ui/ActionButtons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#22d3ee', '#818cf8', '#fbbf24', '#f87171', '#34d399'];

export default function ExpensesPage() {
  const { formatPrice } = useCurrency();
  const { isAdmin } = useUser();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ 
    title: '', 
    category: 'Miscellaneous', 
    amount: 0, 
    paymentMethod: 'CASH',
    transactionId: '',
    notes: '', 
    isRecurring: false,
    recurringInterval: 'MONTHLY'
  });

  const fetchExpenses = async () => {
    try {
      const data = await fetchWithAuth('/expenses');
      setExpenses(data);
    } catch (error) { toast.error('Failed to fetch expenses'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    try {
      await fetchWithAuth('/expenses', { 
        method: 'POST', 
        body: JSON.stringify(formData) 
      });
      toast.success('Expense recorded successfully'); 
      setIsModalOpen(false); 
      setFormData({ 
        title: '', 
        category: 'Miscellaneous', 
        amount: 0, 
        paymentMethod: 'CASH',
        transactionId: '',
        notes: '', 
        isRecurring: false, 
        recurringInterval: 'MONTHLY' 
      }); 
      fetchExpenses(); 
    } catch (error: any) { toast.error(error.message); } finally { setLoading(false); }
  };

  // Category Distribution for Chart
  const categoryData = expenses.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += curr.amount;
    } else {
      acc.push({ name: curr.category, value: curr.amount });
    }
    return acc;
  }, []);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Expense Tracking</h1>
            <p className="text-gray-400 font-medium">Monitor and categorize business spending</p>
          </div>
          {isAdmin && (
            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
              <Plus size={18} />
              <span>RECORD EXPENSE</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-rose-400 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Search expenses by title or category..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full glass-input pl-12"
                />
              </div>
              <button className="btn-secondary">
                <Filter size={18} />
                <span>Filters</span>
              </button>
            </div>

            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="justify-end text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="justify-end text-right">Date</TableHead>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell className="justify-center py-20 w-full">
                        <Loader2 className="animate-spin mx-auto text-rose-400 w-10 h-10" />
                      </TableCell>
                    </TableRow>
                  ) : expenses.length > 0 ? expenses.map((expense) => {
                    let badgeStatus: BadgeStatus = 'PAID';
                    if (expense.paymentMethod === 'CASH') badgeStatus = 'PAID';
                    else if (expense.paymentMethod === 'UPI') badgeStatus = 'ACTIVE';
                    else badgeStatus = 'INACTIVE';

                    return (
                      <TableRow key={expense._id}>
                        <TableCell className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20 shrink-0">
                            <Receipt size={18} />
                          </div>
                          <div className="flex flex-col items-start justify-center gap-0">
                            <p className="font-bold text-white group-hover:text-rose-400 transition-colors">{expense.title}</p>
                            {expense.notes && <p className="text-[10px] text-gray-500 truncate max-w-[150px] italic">"{expense.notes}"</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {expense.category}
                          </span>
                        </TableCell>
                        <TableCell className="flex-col items-start gap-0">
                          <StatusBadge status={badgeStatus} label={expense.paymentMethod || 'CASH'} />
                          {expense.transactionId && <p className="text-[9px] text-gray-500 mt-1 font-mono" title={expense.transactionId}>{truncateUUID(expense.transactionId)}</p>}
                        </TableCell>
                        <TableCell className="justify-end text-right font-black text-rose-400">
                          {formatPrice(expense.amount)}
                        </TableCell>
                        <TableCell>
                          {expense.isRecurring ? (
                            <div className="flex items-center gap-2 text-indigo-400">
                              <RefreshCcw size={14} className="animate-spin-slow" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{expense.recurringInterval}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">ONE-TIME</span>
                          )}
                        </TableCell>
                        <TableCell className="justify-end text-right flex-col items-end gap-0">
                          <p className="text-sm font-medium text-gray-400">{format(new Date(expense.date), 'MMM dd, yyyy')}</p>
                          <button className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1 justify-end mt-1">
                            <Paperclip size={10} />
                            <span>View Receipt</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell className="justify-center py-20 w-full text-gray-500 italic">
                        No expense records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Side Analytics */}
          <div className="space-y-6">
            <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900 to-slate-950 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[80px] rounded-full -mr-16 -mt-16 group-hover:bg-rose-500/20 transition-all duration-700" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
                    <TrendingDown size={20} />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-widest">Total Outflow</h3>
                </div>
                <h4 className="text-5xl font-black text-white tracking-tighter mb-2">{formatPrice(totalExpenses)}</h4>
                <p className="text-gray-500 text-sm font-medium">Accumulated spending for this period</p>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Category Distribution</h3>
              <div className="h-[200px] w-full relative">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-600 italic text-xs">No data available</div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-gray-500 uppercase">Total</span>
                  <span className="text-lg font-black text-white">{categoryData.length}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                {categoryData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-bold text-gray-400">{cat.name}</span>
                    </div>
                    <span className="text-xs font-black text-white">{formatPrice(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* New Expense Modal */}
        <AnimatePresence>
          {isModalOpen && isAdmin && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-panel w-full max-w-lg p-10 rounded-2xl relative z-10 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black text-white tracking-tight">Record Spending</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-all"><X size={24} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Expense Title</label>
                    <div className="relative">
                      <Receipt className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input placeholder="e.g. Monthly Rent" required className="w-full glass-input pl-14" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Category</label>
                      <select className="w-full glass-select" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                        <option value="Rent">Rent</option>
                        <option value="Salaries">Salaries</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Amount</label>
                      <div className="relative">
                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input type="number" step="0.01" required placeholder="0.00" className="w-full glass-input pl-14 text-lg font-black text-rose-400" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: e.target.value === '' ? 0 : parseFloat(e.target.value)})} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
                    <div className="flex gap-2">
                      {['CASH', 'UPI', 'BANK'].map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setFormData({ ...formData, paymentMethod: method })}
                          className={`flex-1 py-3 rounded-xl border text-[10px] font-black transition-all ${
                            formData.paymentMethod === method 
                              ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                              : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {(formData.paymentMethod === 'UPI' || formData.paymentMethod === 'BANK') && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Transaction ID / Reference</label>
                        <input 
                          type="text"
                          placeholder="Ref Number..."
                          className="w-full glass-input font-mono"
                          value={formData.transactionId}
                          onChange={(e) => setFormData({...formData, transactionId: e.target.value})}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RefreshCcw size={18} className="text-indigo-400" />
                      <div>
                        <p className="text-sm font-bold">Recurring Expense</p>
                        <p className="text-[10px] text-gray-500">Auto-post this every month</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={formData.isRecurring} onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})} />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Notes & Remarks</label>
                    <textarea placeholder="Optional details..." className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all min-h-[100px] resize-none text-white" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'CONFIRM RECORD'}
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
