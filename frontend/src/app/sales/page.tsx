'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';

import InvoiceModal from '@/components/InvoiceModal';
import {
  Search,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const data = await fetchWithAuth('/sales');

        setSales(data || []);
        setFilteredSales(data || []);

      } catch {
        toast.error('Failed to fetch sales');
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  useEffect(() => {
    let result = [...sales];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      result = result.filter((s) =>
        s.invoiceId?.toLowerCase()?.includes(term) ||

        s.customerId?.name
          ?.toLowerCase()
          ?.includes(term) ||

        String(
          s._id || s.id || ''
        )
          .slice(-6)
          .toLowerCase()
          .includes(term)
      );
    }

    if (paymentFilter !== 'ALL') {
      result = result.filter(
        s => s.paymentType === paymentFilter
      );
    }

    setFilteredSales(result);

  }, [searchTerm, paymentFilter, sales]);



  const exportToPDF = () => {
    const doc = new jsPDF();

    const tableData =
      filteredSales.map(sale => [

        sale.invoiceId ||

        String(
          sale._id || sale.id || ''
        )
          .slice(-6)
          .toUpperCase(),

        sale.customerId?.name || 'Guest',

        formatPrice(
          sale.totalAmount || 0
        ),

        sale.paymentType,

        sale.status || 'PAID',

        sale.date
          ? format(
              new Date(sale.date),
              'MMM dd, yyyy'
            )
          : '-'
      ]);

    autoTable(doc,{
      head:[[
        'Invoice',
        'Customer',
        'Amount',
        'Payment',
        'Status',
        'Date'
      ]],
      body:tableData
    });

    doc.save('sales-report.pdf');
  };


  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this sale? This will restore stock levels.')) return;
    try {
      await fetchWithAuth(
        `/sales/${id}`,
        {
          method: 'DELETE'
        }
      );

      setSales(prev =>
        prev.filter(
          s =>
            (s._id || s.id)
            !== id
        )
      );

      toast.success(
        'Deleted'
      );

      setDeleteId(null);

    } catch {
      toast.error(
        'Delete failed'
      );
    }
  };


  return (

<DashboardLayout>

<div className="space-y-8 pb-10">
  {/* Header */}
  <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
    <div>
      <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent uppercase">
        Sales Ledger
      </h1>
      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
        Monitor transaction history, print invoices, and manage customer credit/dues
      </p>
    </div>
    
    <div className="flex items-center gap-3">
      <button
        onClick={exportToPDF}
        className="px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
      >
        <Download size={14}/>
        <span>Export PDF</span>
      </button>

      {isAdmin && (
        <Link href="/sales/new">
          <button className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-black text-xs uppercase shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer">
            <Plus size={14}/>
            <span>NEW SALE</span>
          </button>
        </Link>
      )}
    </div>
  </div>

  {/* Search & Filters */}
  <div className="flex flex-col md:flex-row gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-md">
    <div className="relative flex-1 group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
      <input 
        type="text" 
        placeholder="Search by Invoice #, Customer name, or ID..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-500 font-bold"
      />
    </div>
    
    <select
      value={paymentFilter}
      onChange={(e) => setPaymentFilter(e.target.value)}
      className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer font-bold min-w-[180px]"
    >
      <option value="ALL">All Payment Types</option>
      <option value="CASH">Cash</option>
      <option value="UPI">UPI</option>
      <option value="CREDIT">Credit / Due</option>
    </select>
  </div>

  {/* Ledger Table */}
  <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-white/5">
            <th className="py-5 px-6">Invoice ID</th>
            <th className="py-5 px-6">Customer</th>
            <th className="py-5 px-6">Date</th>
            <th className="py-5 px-6 text-right">Total Amount</th>
            <th className="py-5 px-6">Payment</th>
            <th className="py-5 px-6">Status</th>
            <th className="py-5 px-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-xs">
          {loading ? (
            <tr>
              <td colSpan={7} className="py-20 text-center">
                <div className="flex flex-col items-center justify-center gap-3 text-cyan-400">
                  <Loader2 className="animate-spin" size={24} />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Loading sales history...</span>
                </div>
              </td>
            </tr>
          ) : filteredSales.length > 0 ? (
            filteredSales.map((sale) => {
              const invId = sale.invoiceId || `#${String(sale._id || sale.id || '').slice(-6).toUpperCase()}`;
              const custName = sale.customerId?.name || 'Guest';
              const saleDate = sale.date ? format(new Date(sale.date), 'MMM dd, yyyy') : '-';
              const amount = sale.totalAmount || 0;
              const payment = sale.paymentType || 'CASH';
              const status = sale.status || 'PAID';
              
              let statusColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
              if (status === 'DUE') statusColor = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
              else if (status === 'PARTIAL') statusColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';

              return (
                <tr key={sale._id || sale.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-6 font-bold text-white font-mono">{invId}</td>
                  <td className="py-4 px-6 font-bold text-white">{custName}</td>
                  <td className="py-4 px-6 text-gray-400 font-medium">{saleDate}</td>
                  <td className="py-4 px-6 text-right text-white font-bold">{formatPrice(amount)}</td>
                  <td className="py-4 px-6 font-semibold uppercase tracking-wider">{payment}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${statusColor}`}>
                      {status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/5 cursor-pointer flex items-center justify-center"
                        title="View Invoice"
                      >
                        <Eye size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(sale._id || sale.id)}
                          className="p-2 bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 cursor-pointer flex items-center justify-center"
                          title="Delete Sale"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="py-20 text-center text-gray-500 italic text-xs font-bold uppercase tracking-widest">
                No sales records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>


<AnimatePresence>

{selectedSale && (

<InvoiceModal

sale={selectedSale}

onClose={()=>
setSelectedSale(
null
)
}

/>

)}

</AnimatePresence>

</div>

</DashboardLayout>

)

}