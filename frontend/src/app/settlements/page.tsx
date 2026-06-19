'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Banknote, 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  History,
  FileText,
  User,
  Calendar,
  ChevronRight,
  MoreVertical,
  Download,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { settlementService } from '@/services/settlementService';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { toast } from 'sonner';
import SettlementModal from '@/components/SettlementModal';
import Link from 'next/link';
import { format } from 'date-fns';

export default function SettlementsPage() {
  const { formatPrice } = useCurrency();
  const { user, isAdmin, loading: authLoading } = useUser();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchData = async () => {
    if (authLoading || !user) return;
    try {
      const [history, stats] = await Promise.all([
        settlementService.getSettlements(),
        settlementService.getAnalytics()
      ]);
      setSettlements(history);
      setAnalytics(stats);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authLoading, user]);

  const filteredSettlements = settlements.filter(s => {
    const matchesSearch = s.customerId?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [6, 182, 212];
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('AuraSales - Settlements Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 140, 20);

    const tableData = filteredSettlements.map(s => [
      s.customerId?.name || 'Unknown',
      s.status,
      formatPrice(s.amountPaid),
      formatPrice(s.remainingBalance),
      s.paymentMethod,
      new Date(s.date).toLocaleDateString()
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Customer', 'Status', 'Paid', 'Remaining', 'Method', 'Date']],
      body: tableData,
      headStyles: { fillColor: primaryColor },
      styles: { fontSize: 8 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Total Recovered: ${formatPrice(analytics?.totalRecovered || 0)}`, 14, finalY);
    doc.text(`Today's Collection: ${formatPrice(analytics?.daily || 0)}`, 140, finalY);

    doc.save(`Settlements_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const stats = [
    { label: "Today's Collection", value: analytics?.daily || 0, icon: Banknote, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Total Recovered", value: analytics?.totalRecovered || 0, icon: ArrowUpRight, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Pending Dues", value: analytics?.totalDues || 0, icon: Clock, color: "text-rose-400", bg: "bg-rose-500/10" },
    { label: "Overdue Accounts", value: analytics?.overdueCount || 0, icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", suffix: " Accounts" },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PAID': return 'badge-success';
      case 'PARTIAL': return 'badge-warning';
      case 'OVERDUE': return 'badge-danger';
      default: return 'badge-primary';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/40">
                <History className="text-white" size={24} />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight">Settlements</h1>
            </div>
            <p className="text-gray-400 font-medium">Manage collections and customer financial history</p>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn-primary"
              >
                <Plus size={18} />
                <span>Record Settlement</span>
              </button>
            )}
            <button 
              onClick={exportToPDF}
              className="btn-secondary flex items-center justify-center p-0 w-11 shrink-0"
            >
              <Download size={20} />
            </button>
          </div>
        </header>

        {/* Analytics Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-all"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon size={80} />
              </div>
              <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-white/5`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <h3 className="text-3xl font-black text-white tracking-tighter">
                  {typeof stat.value === 'number' && !stat.suffix ? formatPrice(stat.value) : stat.value}
                </h3>
                {stat.suffix && <span className="text-sm font-bold text-gray-500">{stat.suffix}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input pl-12"
            />
          </div>
          <div className="flex gap-2 p-1.5 bg-white/5 rounded-xl border border-white/10 overflow-x-auto w-full md:w-auto scrollbar-hide">
            {['ALL', 'PAID', 'PARTIAL', 'OVERDUE'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  statusFilter === status 
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* History Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/2 overflow-hidden text-[10px] font-black tracking-wider uppercase text-slate-500">
                  <th className="p-6">Customer</th>
                  <th className="p-6 text-center">Status</th>
                  <th className="p-6">Amount Paid</th>
                  <th className="p-6">Remaining</th>
                  <th className="p-6">Method</th>
                  <th className="p-6">Date & Handler</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-cyan-500 w-12 h-12" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading History...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-20 text-center">
                      <p className="text-gray-500 font-bold">No settlements found matching your criteria</p>
                    </td>
                  </tr>
                ) : filteredSettlements.map((s) => (
                  <tr key={s._id} className="hover:bg-white/2 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-white/5">
                          <User className="text-cyan-400" size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-white text-base">{s.customerId?.name}</p>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">ID: #{s._id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={getStatusStyle(s.status)}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-6">
                      <p className="text-emerald-400 font-black text-lg">+{formatPrice(s.amountPaid)}</p>
                    </td>
                    <td className="p-6">
                      <p className="text-white font-bold">{formatPrice(s.remainingBalance)}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                          {s.paymentMethod === 'CASH' ? <Banknote size={14} /> : s.paymentMethod === 'UPI' ? <FileText size={14} /> : <FileText size={14} />}
                        </div>
                        <span className="text-xs font-bold text-gray-300">{s.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="text-sm font-bold text-white">{new Date(s.date).toLocaleDateString()}</p>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">By {s.handledBy}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <Link href={`/settlements/customer/${s.customerId?._id}`}>
                        <button className="btn-secondary btn-sm flex items-center justify-center p-0 w-9">
                          <ChevronRight size={20} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SettlementModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
}
