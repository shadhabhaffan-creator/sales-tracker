'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Users, Package, Wallet, ArrowUpRight, ArrowDownRight, 
  Loader2, Clock, Banknote, Lock, CheckSquare, MessageSquare, 
  Calendar as CalendarIcon, User, Mail, Phone, ChevronRight, X, Square, 
  CheckSquare as CheckedIcon, Plus, Play, Award, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

import SalesTrendChart from '@/components/SalesTrendChart';
import RecentTransactions from '@/components/RecentTransactions';
import MiniCalendar from '@/components/MiniCalendar';
import LowStockAlerts from '@/components/LowStockAlerts';
import TopProducts from '@/components/TopProducts';
import QuickActions from '@/components/QuickActions';

export default function Dashboard() {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { user, hasPermission, loading: authLoading } = useUser();
  
  // Admin / General dashboard state
  const [report, setReport] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [paymentDashboard, setPaymentDashboard] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const [reportData, salesData, productsData, customersData, paymentDashboardData] = await Promise.all([
        fetchWithAuth('/reports/daily'),
        fetchWithAuth('/sales'),
        fetchWithAuth('/products'),
        fetchWithAuth('/customers'),
        fetchWithAuth('/supplier-payments/dashboard').catch(() => null)
      ]);
      setReport(reportData);
      setAllSales(salesData);
      setRecentSales(salesData.slice(0, 5));
      setLowStock(productsData.filter((p: any) => p.stock <= (p.lowStockThreshold || 5)));
      setReminders(customersData.filter((c: any) => (c.totalSpent - c.totalPaid) > 0).map((c: any) => ({
        name: c.name,
        balance: c.totalSpent - c.totalPaid
      })));
      setPaymentDashboard(paymentDashboardData);
    } catch (error: any) {
      console.error('Dashboard fetch failed:', error.message || error);
    }
  };

  const initData = async () => {
    setLoading(true);
    await fetchAdminData();
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    initData();
  }, [authLoading, user, router]);

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Loader2 className="animate-spin text-cyan-400 w-16 h-16" />
        <div className="absolute inset-0 blur-xl bg-cyan-500/20 rounded-full animate-pulse" />
      </div>
      <p className="text-cyan-400 font-bold tracking-widest text-xs uppercase animate-pulse">Initializing System...</p>
    </div>
  );

  const canViewRevenue = hasPermission('viewRevenue');

  // --- ADMIN / GENERAL VIEW (Adaptive to viewRevenue) ---
  const stats = [
    { 
      label: 'Total Sales', 
      value: canViewRevenue ? formatPrice(report?.summary?.totalSales || 0) : 'Locked', 
      icon: TrendingUp, 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-500/10', 
      trend: 'Live',
      locked: !canViewRevenue 
    },
    { 
      label: 'Net Profit', 
      value: canViewRevenue ? formatPrice(report?.summary?.netProfit || 0) : 'Locked', 
      icon: Wallet, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10', 
      trend: 'Live',
      locked: !canViewRevenue
    },
    { 
      label: 'Expenses', 
      value: canViewRevenue ? formatPrice(report?.summary?.totalExpenses || 0) : 'Locked', 
      icon: ArrowDownRight, 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10', 
      trend: 'Live',
      locked: !canViewRevenue
    },
    { 
      label: 'Pending Dues', 
      value: formatPrice(report?.summary?.totalPendingDues || 0), 
      icon: Clock, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10', 
      trend: 'Live',
      locked: false // Non-revenue metric
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Business Intelligence</h1>
            <p className="text-gray-400 mt-1 font-medium">Welcome back, <span className="text-cyan-400 font-bold">{user?.fullName || user?.username}</span></p>
          </div>
          {canViewRevenue && (
            <div className="flex gap-3">
              <button className="btn-secondary">Download PDF</button>
              <button className="btn-primary" onClick={() => router.push('/reports')}>View Live Reports</button>
            </div>
          )}
        </header>

        {/* Outstanding Payment Alerts */}
        {paymentDashboard && (paymentDashboard.overduePayments > 0 || paymentDashboard.totalOutstandingAmount > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentDashboard.overduePayments > 0 && (
              <div 
                className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-3 backdrop-blur-md cursor-pointer hover:bg-rose-500/10 transition-all" 
                onClick={() => router.push('/outstanding-payments')}
              >
                <AlertTriangle size={18} className="shrink-0 text-rose-400" />
                <div>
                  <span className="text-rose-300 font-black uppercase tracking-wider block">Overdue Warnings Detected</span>
                  <span>You have {paymentDashboard.overduePayments} supplier invoice payments that have passed their payment due date. Click to manage.</span>
                </div>
              </div>
            )}
            {paymentDashboard.totalOutstandingAmount > 0 && (
              <div 
                className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center gap-3 backdrop-blur-md cursor-pointer hover:bg-cyan-500/10 transition-all" 
                onClick={() => router.push('/outstanding-payments')}
              >
                <Wallet size={18} className="shrink-0 text-cyan-400" />
                <div>
                  <span className="text-cyan-300 font-black uppercase tracking-wider block">Accounts Payable Liability</span>
                  <span>Total outstanding liabilities stand at ₹{paymentDashboard.totalOutstandingAmount.toLocaleString()}. Click to manage.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }} 
              className="glass-panel p-6 rounded-2xl group hover:scale-[1.02] transition-all border border-white/5 relative overflow-hidden"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
              <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-white/5`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-xs font-black uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-end justify-between mt-2">
                  {stat.locked ? (
                    <span className="flex items-center text-rose-400 gap-1.5 text-lg font-black tracking-widest uppercase">
                      <Lock size={16} /> Locked
                    </span>
                  ) : (
                    <h3 className="text-3xl font-black tracking-tight text-white">{stat.value}</h3>
                  )}
                  <span className="badge-primary">
                    {stat.trend}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Analytics & Transactions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Analytics Area */}
          <div className="lg:col-span-2 space-y-8">
            {canViewRevenue ? (
              <SalesTrendChart data={report?.trends || []} />
            ) : (
              <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 flex flex-col items-center justify-center h-[350px]">
                <Lock className="w-12 h-12 text-rose-500 mb-4" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Revenue Charts Locked</h3>
                <p className="text-gray-500 text-sm mt-1 max-w-sm">You do not have the required permissions to view revenue metrics and trends.</p>
              </div>
            )}
            
            <RecentTransactions transactions={recentSales} />
          </div>

          {/* Right Side Widgets */}
          <div className="space-y-8">
            <MiniCalendar alerts={lowStock} reminders={reminders} sales={allSales} />
            <div className="grid grid-cols-1 gap-8">
              <LowStockAlerts products={lowStock.slice(0, 3)} />
              <TopProducts products={report?.topSellingProducts || []} />
            </div>
          </div>
        </div>

        {/* Floating Quick Actions */}
        <QuickActions />
      </div>
    </DashboardLayout>
  );
}
