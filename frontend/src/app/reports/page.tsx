'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download,
  Calendar,
  Loader2,
  PieChart as PieChartIcon,
  Activity,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('daily');
  const { formatPrice } = useCurrency();
  const { user, loading: authLoading } = useUser();

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth(`/reports/daily?range=${range}`);
      setReport(data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchReport();
    }
  }, [authLoading, user, range]);

  if (loading && !report) {
    return (
      <DashboardLayout>
        <div className="h-[70vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-cyan-400 w-12 h-12" />
        </div>
      </DashboardLayout>
    );
  }

  if (!report || !report.summary) {
    return (
      <DashboardLayout>
        <div className="h-[70vh] flex flex-col items-center justify-center text-gray-500 gap-4">
          <Activity size={48} className="text-gray-700" />
          <p className="text-xl font-bold">No intelligence data found for this period</p>
          <button onClick={fetchReport} className="text-cyan-400 hover:underline">Retry Fetch</button>
        </div>
      </DashboardLayout>
    );
  }

  const { summary, details, trends } = report;

  const COLORS = ['#22d3ee', '#f87171', '#34d399', '#818cf8'];
  const pieData = [
    { name: 'Profit', value: summary.totalProfit },
    { name: 'Expenses', value: summary.totalExpenses },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Business Intelligence</h1>
            <p className="text-gray-400 font-medium">Comprehensive financial analysis and performance metrics</p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
              {['daily', 'weekly', 'monthly'].map((r) => (
                <button 
                  key={r}
                  onClick={() => setRange(r)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${range === r ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold shadow-sm' : 'text-gray-500 hover:text-white'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button className="btn-secondary">
              <Download size={16} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Top KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ReportCard title="Gross Revenue" value={formatPrice(summary.totalSales)} icon={DollarSign} color="cyan" trend="Live" isUp={true} />
          <ReportCard title="Total Expenses" value={formatPrice(summary.totalExpenses)} icon={TrendingDown} color="rose" trend="Live" isUp={false} />
          <ReportCard title="Net Profit" value={formatPrice(summary.netProfit)} icon={BarChart3} color="emerald" trend="Live" isUp={true} />
          <ReportCard title="Inventory Value" value={formatPrice(summary.inventoryValue || 0)} icon={Package} color="indigo" trend="Current" isUp={true} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 glass-panel p-8 rounded-2xl border border-white/10 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  <Activity className="text-cyan-400" />
                  Growth Trajectory
                </h3>
                <p className="text-gray-500 text-xs font-medium mt-1">Daily sales and profit trends for the last 7 days</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Profit</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '900' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#06b6d4" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Breakdown */}
          <div className="glass-panel p-8 rounded-2xl border border-white/10 flex flex-col">
            <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
              <PieChartIcon className="text-indigo-400" />
              Efficiency
            </h3>
            
            <div className="h-[200px] w-full mb-8 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-gray-500 uppercase">Margin</span>
                <span className="text-2xl font-black text-white">
                  {summary.totalSales > 0 ? ((summary.netProfit / summary.totalSales) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                  <span className="text-sm font-bold text-gray-400">Total Profit</span>
                </div>
                <span className="text-sm font-black text-white">{formatPrice(summary.totalProfit)}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                  <span className="text-sm font-bold text-gray-400">Total Expenses</span>
                </div>
                <span className="text-sm font-black text-white">{formatPrice(summary.totalExpenses)}</span>
              </div>
              <div className="p-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-between mt-auto shadow-xl shadow-cyan-500/20">
                <div>
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Net Earnings</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{formatPrice(summary.netProfit)}</p>
                </div>
                <ArrowUpRight className="text-white opacity-50" size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Volume */}
        <div className="glass-panel p-10 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-10">
            <Layers className="text-amber-400" />
            <h3 className="text-xl font-black text-white uppercase tracking-widest">Transaction Volume Breakdown</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="p-8 bg-white/5 rounded-2xl border border-white/5 text-center group hover:border-cyan-500/30 transition-all">
                <p className="text-5xl font-black text-cyan-400 mb-2 tracking-tighter group-hover:scale-110 transition-transform">{details.salesCount}</p>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Total Sales</p>
              </div>
            </div>
            <div className="relative">
              <div className="p-8 bg-white/5 rounded-2xl border border-white/5 text-center group hover:border-emerald-500/30 transition-all">
                <p className="text-5xl font-black text-emerald-400 mb-2 tracking-tighter group-hover:scale-110 transition-transform">{details.settlementsCount}</p>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Settlements</p>
              </div>
            </div>
            <div className="relative">
              <div className="p-8 bg-white/5 rounded-2xl border border-white/5 text-center group hover:border-rose-500/30 transition-all">
                <p className="text-5xl font-black text-rose-400 mb-2 tracking-tighter group-hover:scale-110 transition-transform">{details.expensesCount}</p>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Expense Logs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const ReportCard = ({ title, value, icon: Icon, color, trend, isUp }: any) => (
  <motion.div whileHover={{ y: -5 }} className="glass-panel p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 blur-[60px] rounded-full -mr-12 -mt-12 group-hover:bg-${color}-500/10 transition-all duration-700`} />
    <div className="relative z-10">
      <div className={`w-14 h-14 bg-${color}-500/10 rounded-2xl flex items-center justify-center mb-6 border border-${color}-500/20 shadow-lg shadow-${color}-500/5`}>
        <Icon className={`text-${color}-400`} size={28} />
      </div>
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-white tracking-tighter mb-4">{value}</h3>
      <div className={`flex items-center gap-1.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
        <span className="badge-primary">{trend}</span>
        <span className="text-[10px] text-gray-600 font-bold ml-1 uppercase">Updates in real-time</span>
      </div>
    </div>
  </motion.div>
);
