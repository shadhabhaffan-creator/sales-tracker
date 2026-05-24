'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Eye, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';

import InvoiceModal from '@/components/InvoiceModal';
import { Search, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SalesPage() {
  const { formatPrice } = useCurrency();
  const { isAdmin } = useUser();
  const [sales, setSales] = useState<any[]>([]);
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const data = await fetchWithAuth('/sales');
        setSales(data);
        setFilteredSales(data);
      } catch (error) { toast.error('Failed to fetch sales'); } finally { setLoading(false); }
    };
    fetchSales();
  }, []);

  useEffect(() => {
    let result = [...sales];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        (s.invoiceId?.toLowerCase().includes(term)) || 
        (s.customerId?.name?.toLowerCase().includes(term)) ||
        (s._id.slice(-6).toLowerCase().includes(term))
      );
    }

    if (paymentFilter !== 'ALL') {
      result = result.filter(s => s.paymentType === paymentFilter);
    }

    setFilteredSales(result);
  }, [searchTerm, paymentFilter, sales]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [6, 182, 212];
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('AuraSales - Sales Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 140, 20);

    const tableData = filteredSales.map(sale => [
      sale.invoiceId || sale._id.slice(-6).toUpperCase(),
      sale.customerId?.name || 'Guest',
      formatPrice(sale.totalAmount),
      sale.paymentType,
      sale.status || 'PAID',
      format(new Date(sale.date), 'MMM dd, yyyy')
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Invoice', 'Customer', 'Amount', 'Payment', 'Status', 'Date']],
      body: tableData,
      headStyles: { fillColor: primaryColor },
      styles: { fontSize: 8 }
    });

    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Total Transactions: ${filteredSales.length}`, 14, finalY);
    doc.text(`Total Revenue: ${formatPrice(totalRevenue)}`, 140, finalY);

    doc.save(`Sales_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await fetchWithAuth(`/sales/${id}`, { method: 'DELETE' });
      toast.success('Sale deleted successfully');
      setSales(prev => prev.filter(s => s._id !== id));
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Sales Management</h1>
            <p className="text-gray-400 font-medium">Track and manage your business transactions</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={exportToPDF}
              className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all flex items-center gap-2 font-bold text-sm"
            >
              <Download size={18} />
              <span>Export PDF</span>
            </button>
            {isAdmin && (
              <Link href="/sales/new">
                <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-white font-black text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center gap-2">
                  <Plus size={18} />
                  <span>NEW SALE</span>
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by Invoice ID or Customer name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-500"
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="ALL">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CREDIT">Credit</option>
            </select>
            <button className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-gray-400 flex items-center gap-2 hover:bg-white/10 transition-all">
              <CalendarIcon size={18} />
              <span>Date Range</span>
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <th className="p-6">Invoice ID</th>
                  <th className="p-6">Customer</th>
                  <th className="p-6">Amount</th>
                  <th className="p-6">Due</th>
                  <th className="p-6">Payment</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Date</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={8} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400 w-10 h-10" /></td></tr>
                ) : filteredSales.length > 0 ? filteredSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-white/5 transition-colors text-sm group">
                    <td className="p-6 font-mono text-xs text-gray-400">
                      {sale.invoiceId || `#${sale._id.slice(-6).toUpperCase()}`}
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">
                          {sale.customerId?.name?.[0] || 'G'}
                        </div>
                        <span className="font-bold">{sale.customerId?.name || 'Guest'}</span>
                      </div>
                    </td>
                    <td className="p-6 font-black text-white">{formatPrice(sale.totalAmount)}</td>
                    <td className="p-6 font-bold text-rose-400">{sale.dueAmount > 0 ? formatPrice(sale.dueAmount) : '-'}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-tighter ${
                        sale.paymentType === 'CASH' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        sale.paymentType === 'UPI' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {sale.paymentType}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          sale.status === 'PAID' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                          sale.status === 'PARTIAL' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                          'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        }`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{sale.status || 'PAID'}</span>
                      </div>
                    </td>
                    <td className="p-6 text-gray-400 font-medium">{format(new Date(sale.date), 'MMM dd, yyyy')}</td>
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedSale(sale)}
                          className="p-3 bg-white/5 hover:bg-cyan-500/10 rounded-xl text-gray-400 hover:text-cyan-400 transition-all border border-transparent hover:border-cyan-500/20"
                          title="View Invoice"
                        >
                          <Eye size={18} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => setDeleteId(sale._id)}
                            className="p-3 bg-white/5 hover:bg-rose-500/10 rounded-xl text-gray-400 hover:text-rose-400 transition-all border border-transparent hover:border-rose-500/20"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="p-20 text-center text-gray-500 italic">No transactions found matching your criteria</td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="p-6 border-t border-white/5 bg-white/5 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">Showing <span className="text-white font-bold">{filteredSales.length}</span> of <span className="text-white font-bold">{sales.length}</span> transactions</p>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-all disabled:opacity-30" disabled><ChevronLeft size={18} /></button>
              <button className="w-8 h-8 flex items-center justify-center bg-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-500/30">1</button>
              <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-all"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>

        {/* Invoice Modal */}
        <AnimatePresence>
          {selectedSale && (
            <InvoiceModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="glass-panel p-10 rounded-[3rem] max-w-md w-full relative z-10 border border-white/10 shadow-2xl">
                <div className="w-20 h-20 bg-rose-500/20 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-rose-500/20 shadow-xl shadow-rose-500/10">
                  <Trash2 className="text-rose-400" size={36} />
                </div>
                <h3 className="text-3xl font-black text-white text-center mb-2">Delete This Sale?</h3>
                <p className="text-gray-400 text-center mb-10 font-medium leading-relaxed">
                  This action is irreversible. All linked products will be returned to inventory and customer balances will be updated.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black transition-all">CANCEL</button>
                  <button onClick={() => handleDelete(deleteId)} className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 rounded-2xl font-black transition-all shadow-xl shadow-rose-500/25">DELETE</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
