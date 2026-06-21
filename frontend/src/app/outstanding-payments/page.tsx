'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { fetchWithAuth } from '@/services/api';
import { toast } from 'sonner';
import { useUser } from '@/components/UserContext';
import { 
  Search, 
  Filter, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Wallet, 
  DollarSign,
  Plus, 
  X, 
  Loader2,
  RefreshCw,
  TrendingDown,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, truncateUUID } from '@/components/ui/Table';
import { StatusBadge, BadgeStatus } from '@/components/ui/StatusBadge';
import { ActionButtons } from '@/components/ui/ActionButtons';

export default function OutstandingPaymentsPage() {
  const { isAdmin } = useUser();
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState({
    totalOutstandingAmount: 0,
    totalDueSuppliers: 0,
    overduePayments: 0,
    paymentsDueToday: 0,
    upcomingDueDates: 0
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING', 'PAID', 'ALL'

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [payFormData, setPayFormData] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    transactionId: '',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyPayment, setHistoryPayment] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsData, dashboardData] = await Promise.all([
        fetchWithAuth(`/supplier-payments?status=${statusFilter}`),
        fetchWithAuth('/supplier-payments/dashboard')
      ]);
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
      setDashboard(dashboardData);
    } catch (error: any) {
      toast.error('Failed to load supplier payment records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Handle local searching
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredPayments(
      payments.filter((payment: any) => {
        const supplierName = payment.supplierId?.name?.toLowerCase() || '';
        const companyName = payment.supplierId?.companyName?.toLowerCase() || '';
        const productName = payment.productId?.name?.toLowerCase() || '';
        const txId = payment.transactionId?.toLowerCase() || '';
        return (
          supplierName.includes(term) ||
          companyName.includes(term) ||
          productName.includes(term) ||
          txId.includes(term)
        );
      })
    );
  }, [searchTerm, payments]);

  const openPayModal = (payment: any) => {
    if (!isAdmin) {
      toast.error('Admin permissions required to record payments.');
      return;
    }
    setSelectedPayment(payment);
    setPayFormData({
      amount: payment.remainingBalance,
      paymentMethod: 'CASH',
      transactionId: '',
      notes: '',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    if (payFormData.amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    if (payFormData.amount > selectedPayment.remainingBalance) {
      toast.error(`Payment amount cannot exceed outstanding balance of ₹${selectedPayment.remainingBalance}`);
      return;
    }

    setActionLoading(true);
    try {
      await fetchWithAuth(`/supplier-payments/${selectedPayment._id}/pay`, {
        method: 'POST',
        body: JSON.stringify(payFormData)
      });
      toast.success('Supplier payment successfully logged');
      setIsPayModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to calculate days remaining
  const getDaysRemaining = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper to determine status tag
  const getStatusDetails = (payment: any) => {
    if (payment.remainingBalance === 0) {
      return { label: 'Paid', bg: 'badge-success' };
    }
    
    const daysLeft = getDaysRemaining(payment.dueDate);
    if (daysLeft < 0) {
      return { label: 'Overdue', bg: 'badge-danger' };
    } else if (daysLeft === 0) {
      return { label: 'Due Today', bg: 'badge-warning animate-pulse' };
    } else {
      return { label: 'Pending', bg: 'badge-primary' };
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              OUTSTANDING PAYMENTS
            </h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              Supplier Accounts Payable & Debt Ledger
            </p>
          </div>
          <button 
            onClick={() => fetchData()}
            className="self-start md:self-auto px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>SYNC LEDGER</span>
          </button>
        </div>

        {/* Warning alerts banner */}
        {!loading && (dashboard.overduePayments > 0 || dashboard.totalOutstandingAmount > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboard.overduePayments > 0 && (
              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-3 backdrop-blur-md">
                <AlertTriangle size={18} className="shrink-0 text-rose-400" />
                <div>
                  <span className="text-rose-300 font-black uppercase tracking-wider block">Overdue Warnings Detected</span>
                  <span>You have {dashboard.overduePayments} supplier invoice payments that have passed their payment due date.</span>
                </div>
              </div>
            )}
            {dashboard.totalOutstandingAmount > 0 && (
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center gap-3 backdrop-blur-md">
                <Wallet size={18} className="shrink-0 text-cyan-400" />
                <div>
                  <span className="text-cyan-300 font-black uppercase tracking-wider block">Accounts Payable Liability</span>
                  <span>Total outstanding liabilities stand at ₹{Number(dashboard?.totalOutstandingAmount || 0).toLocaleString()}.</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Total Liabilities</span>
              <span className="text-2xl font-black tracking-tight text-white block mt-2">
                ₹{Number(dashboard?.totalOutstandingAmount || 0).toLocaleString()}
              </span>
            </div>
            <div className="absolute top-6 right-6 w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
              <DollarSign size={18} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Active Due Suppliers</span>
              <span className="text-2xl font-black tracking-tight text-white block mt-2">
                {dashboard.totalDueSuppliers}
              </span>
            </div>
            <div className="absolute top-6 right-6 w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Wallet size={18} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[140px] border-rose-500/20">
            <div>
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Overdue Invoices</span>
              <span className="text-2xl font-black tracking-tight text-rose-400 block mt-2">
                {dashboard.overduePayments}
              </span>
            </div>
            <div className="absolute top-6 right-6 w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
              <AlertTriangle size={18} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[140px] border-amber-500/20">
            <div>
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">Due Today</span>
              <span className="text-2xl font-black tracking-tight text-amber-400 block mt-2 animate-pulse">
                {dashboard.paymentsDueToday}
              </span>
            </div>
            <div className="absolute top-6 right-6 w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
              <Calendar size={18} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Upcoming Due</span>
              <span className="text-2xl font-black tracking-tight text-white block mt-2">
                {dashboard.upcomingDueDates}
              </span>
            </div>
            <div className="absolute top-6 right-6 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
              <Clock size={18} />
            </div>
          </div>

        </div>

        <div className="glass-panel p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Search by supplier, company, product, txn reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input pl-11"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Filter size={12} />
              <span>Filter Ledger:</span>
            </span>
            <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl w-full md:w-auto">
              <button 
                onClick={() => setStatusFilter('PENDING')}
                className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${statusFilter === 'PENDING' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Outstanding
              </button>
              <button 
                onClick={() => setStatusFilter('PAID')}
                className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${statusFilter === 'PAID' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Paid History
              </button>
              <button 
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                All Records
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-cyan-400">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Loading Accounts Payable...</span>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-20 text-center text-gray-500 italic text-xs font-bold uppercase tracking-widest">
              No matching accounts payable records found.
            </div>
          ) : (
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableHead>Supplier Details</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Reference ID</TableHead>
                  <TableHead className="justify-end text-right">Invoice Amount</TableHead>
                  <TableHead className="justify-end text-right">Amount Paid</TableHead>
                  <TableHead className="justify-end text-right">Outstanding</TableHead>
                  <TableHead>Pay Method</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="justify-center text-center">Actions</TableHead>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: any) => {
                    const statusInfo = getStatusDetails(payment);
                    const daysRemaining = getDaysRemaining(payment.dueDate);
                    
                    return (
                      <TableRow key={payment._id || payment.id}>
                        <TableCell className="flex-col items-start gap-0 font-bold">
                          <span className="block text-white group-hover:text-cyan-400 transition-colors">
                            {payment.supplierId?.name || 'Unknown'}
                          </span>
                          <span className="block text-[10px] text-gray-500">
                            {payment.supplierId?.companyName || 'Unknown Co.'}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300 font-medium">
                          {payment.productId?.name || 'Product Deleted'}
                        </TableCell>
                        <TableCell className="text-gray-400 font-mono text-[10px]" title={payment.transactionId || ''}>
                          {payment.transactionId ? truncateUUID(payment.transactionId) : 'No Ref'}
                        </TableCell>
                        <TableCell className="justify-end text-right font-bold text-white">
                          ₹{Number(payment?.purchaseAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="justify-end text-right text-emerald-400 font-semibold">
                          ₹{Number(payment?.amountPaid || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="justify-end text-right text-cyan-400 font-mono font-bold">
                          ₹{Number(payment?.remainingBalance || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-black text-gray-400">
                            {payment.paymentMethod}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-400 font-medium">
                          {new Date(payment.dueDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {payment.remainingBalance === 0 ? (
                            <span className="text-[10px] font-bold text-emerald-400">Settled</span>
                          ) : daysRemaining < 0 ? (
                            <span className="text-[10px] font-black text-rose-400">
                              {Math.abs(daysRemaining)}d Overdue
                            </span>
                          ) : daysRemaining === 0 ? (
                            <span className="text-[10px] font-black text-amber-400">
                              Due Today
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400">
                              {daysRemaining}d Left
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={statusInfo.bg}>
                            {statusInfo.label}
                          </span>
                        </TableCell>
                        <TableCell className="justify-center text-center">
                          <div className="flex items-center justify-center gap-2 w-full">
                            {payment.paymentsHistory?.length > 0 && (
                              <button 
                                onClick={() => {
                                  setHistoryPayment(payment);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="btn-secondary btn-sm flex items-center justify-center p-0 w-9"
                                title="View Payment Logs"
                              >
                                <FileText size={16} />
                              </button>
                            )}
                            {payment.remainingBalance > 0 && isAdmin && (
                              <button 
                                onClick={() => openPayModal(payment)}
                                className="btn-primary btn-sm px-4 py-2"
                              >
                                <span>PAY</span>
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* MODAL: Record Payment */}
        <AnimatePresence>
          {isPayModalOpen && selectedPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPayModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-lg border border-white/10 rounded-2xl p-6 relative overflow-hidden z-10 space-y-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Record Supplier Payment</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      Pay Remaining balance for {selectedPayment.supplierId?.name}
                    </p>
                  </div>
                  <button onClick={() => setIsPayModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Product / Item:</span>
                    <span className="text-white font-bold">{selectedPayment.productId?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Invoice Reference:</span>
                    <span className="text-gray-300 font-mono text-[10px]">{selectedPayment.transactionId || 'No Ref'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Outstanding Balance:</span>
                    <span className="text-cyan-400 font-black text-sm">₹{Number(selectedPayment?.remainingBalance || 0).toLocaleString()}</span>
                  </div>
                </div>

                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Amount (₹) *</label>
                      <input 
                        type="number" step="0.01" required min="1" max={selectedPayment?.remainingBalance || 0}
                        className="w-full glass-input text-xs font-bold"
                        value={payFormData.amount || ''}
                        onChange={(e) => setPayFormData({ ...payFormData, amount: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
                      <select
                        className="w-full glass-select"
                        value={payFormData.paymentMethod}
                        onChange={(e) => setPayFormData({ ...payFormData, paymentMethod: e.target.value })}
                      >
                        <option value="CASH">Cash</option>
                        <option value="GPAY">GPay</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="DEBIT_CARD">Debit Card</option>
                        <option value="CREDIT_CARD">Credit Card</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Transaction Ref / ID</label>
                      <input 
                        placeholder="UTR / ID" className="w-full glass-input text-xs"
                        value={payFormData.transactionId}
                        onChange={(e) => setPayFormData({ ...payFormData, transactionId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Date</label>
                      <input 
                        type="date" className="w-full glass-input text-xs font-bold"
                        value={payFormData.paymentDate}
                        onChange={(e) => setPayFormData({ ...payFormData, paymentDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Notes</label>
                    <textarea 
                      placeholder="Enter details of transaction" rows={2} className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all min-h-[60px] resize-none text-white"
                      value={payFormData.notes}
                      onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={actionLoading}
                    className="btn-primary w-full"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" /> : 'CONFIRM SUPPLIER PAYMENT'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: Payment history timeline */}
        <AnimatePresence>
          {isHistoryModalOpen && historyPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsHistoryModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-lg border border-white/10 rounded-2xl p-6 relative overflow-hidden z-10 space-y-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Payment Ledger History</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      Log of installments made to {historyPayment.supplierId?.name}
                    </p>
                  </div>
                  <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
                  {historyPayment.paymentsHistory?.map((log: any, idx: number) => (
                    <div key={log._id || idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="block text-emerald-400 font-black text-sm">₹{Number(log?.amount || 0).toLocaleString()}</span>
                        <span className="block text-[10px] text-gray-400 font-medium">
                          Method: <strong className="text-gray-300 font-black">{log.paymentMethod}</strong>
                        </span>
                        {log.transactionId && (
                          <span className="block text-[9px] text-gray-500 font-mono">
                            Ref: {log.transactionId}
                          </span>
                        )}
                        {log.notes && (
                          <p className="text-[10px] text-gray-400 italic mt-1 font-medium bg-white/5 p-2 rounded-xl border border-white/5">
                            "{log.notes}"
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest text-right shrink-0 mt-1">
                        {new Date(log.paymentDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="btn-secondary w-full"
                >
                  CLOSE LEDGER
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
