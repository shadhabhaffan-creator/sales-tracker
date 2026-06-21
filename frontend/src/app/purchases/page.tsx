'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Loader2, X, Download, AlertTriangle, AlertCircle, MapPin, Package, History, ShoppingBag, DollarSign, Wallet, CreditCard, ChevronRight, Hash, Building2, User, Eye, Edit2, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, truncateUUID } from '@/components/ui/Table';
import { StatusBadge, BadgeStatus } from '@/components/ui/StatusBadge';
import { ActionButtons, ActionType } from '@/components/ui/ActionButtons';
import { toast } from 'sonner';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';

export default function PurchasesPage() {
  const { isAdmin } = useUser();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dashboard Stats
  const [dashboard, setDashboard] = useState({
    totalPurchases: 0,
    purchaseValue: 0,
    outstandingAmount: 0,
    pendingPayments: 0
  });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Purchase Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    supplierId: '',
    productName: '',
    variantName: '',
    quantity: 0,
    unit: 'PIECE',
    costPrice: 0,
    notes: '',
    amountPaid: 0,
    paymentMethod: 'CASH',
    warehouseAllocations: [] as Array<{ warehouseId: string; quantity: number }>
  });

  // Selected Supplier Details (Auto-calculated)
  const [selectedSupplierDetails, setSelectedSupplierDetails] = useState<any>(null);

  // Record Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [payFormData, setPayFormData] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    transactionId: '',
    notes: ''
  });

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purchasesData, dashboardData, suppliersData, warehousesData, productsData] = await Promise.all([
        fetchWithAuth('/purchases'),
        fetchWithAuth('/purchases/dashboard'),
        fetchWithAuth('/suppliers'),
        fetchWithAuth('/warehouses'),
        fetchWithAuth('/products')
      ]);

      setPurchases(purchasesData);
      setFilteredPurchases(purchasesData);
      setDashboard(dashboardData);
      setSuppliers(suppliersData);
      setWarehouses(warehousesData);
      setProducts(productsData || []);

      // Pre-populate first warehouse allocation row if warehouses exist
      if (warehousesData.length > 0) {
        setPurchaseForm(prev => ({
          ...prev,
          warehouseAllocations: [{ warehouseId: warehousesData[0]._id, quantity: 0 }]
        }));
      }
    } catch (error: any) {
      toast.error('Failed to load purchase information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected supplier details automatically when form supplierId changes
  useEffect(() => {
    if (purchaseForm.supplierId) {
      const s = suppliers.find(sup => sup._id === purchaseForm.supplierId);
      setSelectedSupplierDetails(s || null);
    } else {
      setSelectedSupplierDetails(null);
    }
  }, [purchaseForm.supplierId, suppliers]);

  // Auto-detect product type when product name changes
  useEffect(() => {
    if (!purchaseForm.productName.trim()) {
      setSelectedProduct(null);
      return;
    }
    const matched = products.find(
      p => p.name.trim().toLowerCase() === purchaseForm.productName.trim().toLowerCase()
    );
    setSelectedProduct(matched || null);
  }, [purchaseForm.productName, products]);

  // Handle local searching/filtering
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    let result = purchases.filter((p: any) => {
      const pId = p.purchaseId?.toLowerCase() || '';
      const invoice = p.invoiceNumber?.toLowerCase() || '';
      const prodName = p.productName?.toLowerCase() || '';
      const supplierName = p.supplierId?.name?.toLowerCase() || '';
      const company = p.supplierId?.companyName?.toLowerCase() || '';
      
      return (
        pId.includes(term) ||
        invoice.includes(term) ||
        prodName.includes(term) ||
        supplierName.includes(term) ||
        company.includes(term)
      );
    });

    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.paymentStatus === statusFilter);
    }

    setFilteredPurchases(result);
  }, [searchTerm, statusFilter, purchases]);

  const handleOpenForm = () => {
    setPurchaseForm({
      invoiceNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      supplierId: suppliers[0]?._id || '',
      productName: '',
      variantName: '',
      quantity: 0,
      unit: 'PIECE',
      costPrice: 0,
      notes: '',
      amountPaid: 0,
      paymentMethod: 'CASH',
      warehouseAllocations: warehouses.length > 0 
        ? [{ warehouseId: warehouses[0]._id, quantity: 0 }] 
        : []
    });
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleAddWarehouseRow = () => {
    if (warehouses.length === 0) return;
    setPurchaseForm(prev => ({
      ...prev,
      warehouseAllocations: [...prev.warehouseAllocations, { warehouseId: warehouses[0]._id, quantity: 0 }]
    }));
  };

  const handleRemoveWarehouseRow = (index: number) => {
    setPurchaseForm(prev => ({
      ...prev,
      warehouseAllocations: prev.warehouseAllocations.filter((_, i) => i !== index)
    }));
  };

  const handleWarehouseAllocationChange = (index: number, field: string, value: any) => {
    setPurchaseForm(prev => {
      const newAllocations = [...prev.warehouseAllocations];
      newAllocations[index] = {
        ...newAllocations[index],
        [field]: value
      };
      return {
        ...prev,
        warehouseAllocations: newAllocations
      };
    });
  };

  // Allocations validation total
  const totalAllocated = purchaseForm.warehouseAllocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!purchaseForm.supplierId) {
      toast.error('Please select a supplier');
      return;
    }

    if (!purchaseForm.productName.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    if (purchaseForm.quantity <= 0) {
      toast.error('Quantity purchased must be greater than zero');
      return;
    }

    if (purchaseForm.costPrice <= 0) {
      toast.error('Cost price must be greater than zero');
      return;
    }

    if (totalAllocated !== purchaseForm.quantity) {
      toast.error(`Total allocated quantities (${totalAllocated}) must match quantity purchased (${purchaseForm.quantity})`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetchWithAuth('/purchases', {
        method: 'POST',
        body: JSON.stringify(purchaseForm)
      });
      
      toast.success(res.message || 'Purchase logged successfully');
      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete purchase intake');
    } finally {
      setActionLoading(false);
    }
  };

  const openPayModal = (purchase: any) => {
    setSelectedPurchase(purchase);
    setPayFormData({
      amount: purchase.remainingBalance,
      paymentMethod: 'CASH',
      transactionId: '',
      notes: ''
    });
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;

    if (payFormData.amount <= 0 || payFormData.amount > selectedPurchase.remainingBalance) {
      toast.error(`Payment amount must be between 1 and ${selectedPurchase.remainingBalance}`);
      return;
    }

    setActionLoading(true);
    try {
      await fetchWithAuth(`/purchases/${selectedPurchase._id}/pay`, {
        method: 'POST',
        body: JSON.stringify(payFormData)
      });
      toast.success('Payment recorded successfully');
      setIsPayModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  const exportPurchasesToCSV = () => {
    if (purchases.length === 0) {
      toast.error('No purchases to export');
      return;
    }

    const headers = [
      'Purchase ID', 'Invoice Number', 'Supplier', 'Product', 'Variant',
      'Quantity', 'Unit', 'Cost Price', 'Total Amount', 'Amount Paid',
      'Remaining Balance', 'Payment Status', 'Payment Method', 'Purchase Date'
    ];

    const rows = purchases.map(p => [
      p.purchaseId || '',
      p.invoiceNumber || '',
      p.supplierId?.name || '',
      p.productName || '',
      p.variantName || '',
      p.quantity || 0,
      p.unit || '',
      p.costPrice || 0,
      p.totalAmount || 0,
      p.amountPaid || 0,
      p.remainingBalance || 0,
      p.paymentStatus || '',
      p.paymentMethod || '',
      p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Purchases_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">

        {/* Title / Action Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              PURCHASE MANAGEMENT
            </h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              Log & track supplier invoices and dynamic inventory intakes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportPurchasesToCSV}
              className="btn-secondary"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={handleOpenForm}
              className="btn-primary"
            >
              <Plus size={16} />
              <span>New Purchase</span>
            </button>
          </div>
        </div>

        {/* Dashboard Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[130px]">
            <div>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Total Purchases</span>
              <span className="text-2xl font-black text-white block mt-2">{dashboard.totalPurchases}</span>
            </div>
            <div className="absolute top-6 right-6 w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
              <ShoppingBag size={18} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[130px]">
            <div>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Total Purchase Value</span>
              <span className="text-2xl font-black text-white block mt-2">₹{dashboard.purchaseValue?.toLocaleString()}</span>
            </div>
            <div className="absolute top-6 right-6 w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <DollarSign size={18} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[130px]">
            <div>
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Outstanding Amount</span>
              <span className="text-2xl font-black text-rose-400 block mt-2">₹{dashboard.outstandingAmount?.toLocaleString()}</span>
            </div>
            <div className="absolute top-6 right-6 w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
              <Wallet size={18} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[130px]">
            <div>
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">Pending Payments</span>
              <span className="text-2xl font-black text-amber-400 block mt-2">{dashboard.pendingPayments}</span>
            </div>
            <div className="absolute top-6 right-6 w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
              <CreditCard size={18} />
            </div>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 glass-panel p-4 rounded-2xl">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Search by ID, invoice, product, supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input pl-11 placeholder-gray-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Filter size={12} />
              <span>Status:</span>
            </span>
            <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl w-full md:w-auto">
              {['ALL', 'PAID', 'PARTIALLY_PAID', 'DEBT'].map((st) => (
                <button 
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 md:flex-none px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${statusFilter === st ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold shadow-md' : 'text-gray-400 hover:text-white'}`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Ledger */}
        {/* Table Ledger */}
        <div className="w-full">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-cyan-400">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Loading purchase invoices...</span>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="py-20 text-center text-gray-500 italic text-xs font-bold uppercase tracking-widest">
              No purchase logs found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableHead>Purchase ID</TableHead>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Product Details</TableHead>
                <TableHead className="justify-end text-right">Qty</TableHead>
                <TableHead className="justify-end text-right">Total Amount</TableHead>
                <TableHead className="justify-end text-right">Paid</TableHead>
                <TableHead className="justify-end text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="justify-center text-center">Actions</TableHead>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((p: any) => {
                  let badgeStatus: BadgeStatus = 'PAID';
                  if (p.paymentStatus === 'PAID') badgeStatus = 'PAID';
                  else if (p.paymentStatus === 'DEBT') badgeStatus = 'OVERDUE';
                  else if (p.paymentStatus === 'PARTIALLY_PAID') badgeStatus = 'PARTIAL';

                  return (
                    <TableRow key={p._id}>
                      <TableCell className="font-bold text-white font-mono" title={p.purchaseId}>{truncateUUID(p.purchaseId)}</TableCell>
                      <TableCell className="text-gray-400 font-mono text-[11px]">{p.invoiceNumber}</TableCell>
                      <TableCell className="font-bold text-white flex-col items-start gap-0">
                        <span className="block">{p.supplierId?.name || 'Deleted Supplier'}</span>
                        <span className="block text-[10px] text-gray-500 font-normal">{p.supplierId?.companyName || ''}</span>
                      </TableCell>
                      <TableCell className="text-gray-300 font-medium flex-col items-start gap-0">
                        <span className="block">{p.productName}</span>
                        {p.variantName && (
                          <span className="inline-block px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-black text-gray-400 mt-0.5">
                            {p.variantName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="justify-end text-right font-semibold text-white">
                        {p.quantity} <span className="text-[10px] text-gray-500 font-bold">{p.unit}</span>
                      </TableCell>
                      <TableCell className="justify-end text-right text-white font-bold">
                        ₹{p.totalAmount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="justify-end text-right text-emerald-400 font-medium">
                        ₹{p.amountPaid?.toLocaleString()}
                      </TableCell>
                      <TableCell className="justify-end text-right text-cyan-400 font-mono font-bold">
                        ₹{p.remainingBalance?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge 
                          status={badgeStatus} 
                          label={p.paymentStatus === 'DEBT' ? 'UNPAID / DEBT' : p.paymentStatus?.replace('_', ' ')} 
                        />
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {new Date(p.purchaseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="justify-center text-center">
                        <div className="flex gap-2 justify-center w-full">
                          <ActionButtons 
                            actions={[
                              {
                                type: 'view',
                                onClick: () => {
                                  setDetailPurchase(p);
                                  setIsDetailModalOpen(true);
                                }
                              }
                            ]}
                          />
                          {p.remainingBalance > 0 && isAdmin && (
                            <button 
                              onClick={() => openPayModal(p)}
                              className="btn-primary btn-sm px-3.5 ml-1"
                            >
                              PAY
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* MODAL: New Purchase Intake */}
        <AnimatePresence>
          {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFormOpen(false)}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-3xl border border-white/10 rounded-2xl p-6 relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-start shrink-0 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Log Product Purchase</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      Enter product specifications, supplier billing, and warehouse stock allocation
                    </p>
                  </div>
                  <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreatePurchase} className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
                  
                  {/* Basic Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Invoice Number *</label>
                      <input 
                        type="text" required placeholder="e.g. INV-10029"
                        className="w-full glass-input text-xs font-bold"
                        value={purchaseForm.invoiceNumber}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Purchase Date *</label>
                      <input 
                        type="date" required
                        className="w-full glass-input text-xs font-bold"
                        value={purchaseForm.purchaseDate}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Select Supplier *</label>
                      <select 
                        required className="w-full glass-select"
                        value={purchaseForm.supplierId}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                      >
                        <option value="">-- Choose Supplier --</option>
                        {suppliers.map(s => (
                          <option key={s._id} value={s._id}>{s.name} ({s.companyName})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Supplier Card */}
                  {selectedSupplierDetails && (
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-xs space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="block text-white font-black text-sm">{selectedSupplierDetails.name}</span>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">{selectedSupplierDetails.companyName}</span>
                        </div>
                        {selectedSupplierDetails.gstId && (
                          <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[9px] font-black text-cyan-400">
                            GST/TAX: {selectedSupplierDetails.gstId}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 text-[10px] text-gray-400 font-medium">
                        <div>
                          <span className="block">Contact: <strong className="text-gray-300 font-bold">{selectedSupplierDetails.contactPerson}</strong></span>
                          <span className="block">Phone: <strong className="text-gray-300 font-bold">{selectedSupplierDetails.phoneNumber}</strong></span>
                        </div>
                        <div>
                          <span className="block">Email: <strong className="text-gray-300 font-bold">{selectedSupplierDetails.email}</strong></span>
                          <span className="block">Address: <strong className="text-gray-300 font-bold">{selectedSupplierDetails.address}, {selectedSupplierDetails.city}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Product Name *</label>
                      <input 
                        type="text" required placeholder="e.g. Organic Energy Drink"
                        className="w-full glass-input text-xs font-bold"
                        list="purchase-product-suggestions"
                        value={purchaseForm.productName}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, productName: e.target.value })}
                      />
                      <datalist id="purchase-product-suggestions">
                        {products.map(p => (
                          <option key={p._id || p.id} value={p.name}>
                            {p.type === 'CHILD' ? `↳ Child (Conv: ${p.conversion_quantity})` : p.type === 'PARENT' ? 'Bulk / Raw Parent' : 'Standard'}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Product Variant (Optional)</label>
                      <input 
                        type="text" placeholder="e.g. 500ml, Family Pack, Blue"
                        className="w-full glass-input text-xs font-bold"
                        value={purchaseForm.variantName}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, variantName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Unit Type *</label>
                      <select 
                        required className="w-full glass-select"
                        value={purchaseForm.unit}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, unit: e.target.value })}
                      >
                        <option value="UNIT">Unit / Pieces</option>
                        <option value="ML">ML (Milliliters)</option>
                        <option value="LITER">Liters (L)</option>
                        <option value="GRAM">Grams (G)</option>
                        <option value="KILOGRAM">Kilograms (KG)</option>
                        <option value="PIECE">Pieces (Piece)</option>
                        <option value="BOTTLE">Bottles (Bottle)</option>
                        <option value="BOX">Boxes (Box)</option>
                        <option value="PACK">Packs (Pack)</option>
                        <option value="CARTON">Cartons (Carton)</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Child Product Conversion Banner */}
                  {selectedProduct?.type === 'CHILD' && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-400 shrink-0" />
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Child / Converted Product Detected</span>
                      </div>
                      <p className="text-[10px] text-gray-300 leading-relaxed">
                        <strong className="text-white">{selectedProduct.name}</strong> is a converted sellable product linked to a parent bulk product.
                        When you enter the quantity below, that many child units will be purchased — and the equivalent parent stock
                        (<strong className="text-amber-300">{selectedProduct.conversion_quantity} parent units per child unit</strong>) will be automatically added to the parent product's inventory.
                        Child stock is always derived automatically — it is never stored manually.
                      </p>
                      {(() => {
                        const parent = products.find(p => (p._id || p.id) === selectedProduct.parent_id);
                        if (!parent) return null;
                        const availableChildUnits = Math.floor((parent.stock || 0) / (selectedProduct.conversion_quantity || 1));
                        return (
                          <div className="flex gap-4 pt-2 border-t border-amber-500/15 text-[10px] font-bold">
                            <span className="text-gray-400">Parent Stock: <strong className="text-white">{parent.stock} {parent.unit}</strong></span>
                            <span className="text-gray-400">Current Available Child Units: <strong className="text-cyan-400">{availableChildUnits}</strong></span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Quantity and Price calculations */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">
                        {selectedProduct?.type === 'CHILD'
                          ? `Child Units Received (×${selectedProduct.conversion_quantity} = Parent Stock) *`
                          : 'Quantity Purchased *'
                        }
                      </label>
                      <input 
                        type="number" required min="1"
                        className="w-full glass-input text-xs font-bold"
                        value={purchaseForm.quantity || ''}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Cost Price Per Unit (₹) *</label>
                      <input 
                        type="number" required step="0.01" min="0.01"
                        className="w-full glass-input text-xs font-bold"
                        value={purchaseForm.costPrice || ''}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, costPrice: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Total Amount (₹)</label>
                      <input 
                        type="text" readOnly
                        className="w-full glass-input text-xs font-black text-cyan-400 bg-white/5 border-dashed border-white/10"
                        value={`₹ ${(purchaseForm.quantity * purchaseForm.costPrice).toLocaleString()}`}
                      />
                    </div>
                  </div>

                  {/* Warehouse Allocation Section */}
                  <div className="space-y-3 p-4 bg-white/5 border border-white/5 rounded-2xl relative">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider block">Warehouse Allocation *</span>
                      <button 
                        type="button" onClick={handleAddWarehouseRow}
                        className="btn-secondary btn-sm flex items-center gap-1"
                      >
                        <Plus size={10} />
                        <span>Add Row</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {purchaseForm.warehouseAllocations.map((alloc, idx) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <div className="flex-1">
                            <select 
                              required className="w-full glass-select"
                              value={alloc.warehouseId}
                              onChange={(e) => handleWarehouseAllocationChange(idx, 'warehouseId', e.target.value)}
                            >
                              <option value="">-- Select Warehouse --</option>
                              {warehouses.map(w => (
                                <option key={w._id} value={w._id}>{w.name} ({w.warehouseId})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-32">
                            <input 
                              type="number" required placeholder="Qty" min="1"
                              className="w-full glass-input font-bold"
                              value={alloc.quantity || ''}
                              onChange={(e) => handleWarehouseAllocationChange(idx, 'quantity', Math.max(0, Number(e.target.value) || 0))}
                            />
                          </div>
                          {purchaseForm.warehouseAllocations.length > 1 && (
                            <button 
                              type="button" onClick={() => handleRemoveWarehouseRow(idx)}
                              className="btn-danger btn-sm p-0 w-9 h-9"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400">Total Allocated: <strong className={`${totalAllocated === purchaseForm.quantity ? 'text-emerald-400' : 'text-amber-400'}`}>{totalAllocated} / {purchaseForm.quantity} units</strong></span>
                      {totalAllocated !== purchaseForm.quantity && (
                        <span className="text-rose-400 animate-pulse text-[9px] font-black uppercase">Allocated sum must equal purchase quantity</span>
                      )}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-4 border-t border-white/10 pt-4">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Payment Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Amount Paid (₹) *</label>
                        <input 
                          type="number" required min="0" max={purchaseForm.quantity * purchaseForm.costPrice}
                          className="w-full glass-input text-xs font-bold"
                          value={purchaseForm.amountPaid || ''}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, amountPaid: Math.min(purchaseForm.quantity * purchaseForm.costPrice, Math.max(0, Number(e.target.value) || 0)) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Remaining Balance (₹)</label>
                        <input 
                          type="text" readOnly
                          className="w-full glass-input text-xs font-black text-rose-400 bg-white/5 border-dashed border-white/10"
                          value={`₹ ${(Math.max(0, (purchaseForm.quantity * purchaseForm.costPrice) - purchaseForm.amountPaid)).toLocaleString()}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
                        <select 
                          className="w-full glass-select"
                          value={purchaseForm.paymentMethod}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
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
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Notes / Terms</label>
                    <textarea 
                      placeholder="Add terms, shipping references, or special notes..." rows={2}
                      className="w-full glass-input text-xs p-3"
                      value={purchaseForm.notes}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                    />
                  </div>

                  <div className="shrink-0 pt-4 border-t border-white/10">
                    <button 
                      type="submit" 
                      disabled={actionLoading || totalAllocated !== purchaseForm.quantity}
                      className="w-full btn-primary"
                    >
                      {actionLoading ? <Loader2 className="animate-spin" /> : 'SAVE PURCHASE & UPDATE INVENTORY'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: Record Partial/Pending Payment */}
        <AnimatePresence>
          {isPayModalOpen && selectedPurchase && (
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
                className="glass-panel w-full max-w-md border border-white/10 rounded-2xl p-6 relative overflow-hidden z-10 space-y-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Record Supplier Payment</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      Mark pending balance as paid for {selectedPurchase.supplierId?.name}
                    </p>
                  </div>
                  <button onClick={() => setIsPayModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Purchase ID:</span>
                    <span className="text-white font-mono font-bold">{selectedPurchase.purchaseId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Remaining Balance:</span>
                    <span className="text-cyan-400 font-black text-sm">₹{selectedPurchase.remainingBalance?.toLocaleString()}</span>
                  </div>
                </div>

                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Amount (₹) *</label>
                    <input 
                      type="number" required min="1" max={selectedPurchase.remainingBalance}
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

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Transaction Ref / ID</label>
                    <input 
                      type="text" placeholder="UTR Number / Transaction ID"
                      className="w-full glass-input text-xs font-bold"
                      value={payFormData.transactionId}
                      onChange={(e) => setPayFormData({ ...payFormData, transactionId: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Notes</label>
                    <textarea 
                      placeholder="Enter internal details..." rows={2}
                      className="w-full glass-input text-xs p-3"
                      value={payFormData.notes}
                      onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={actionLoading}
                    className="w-full btn-primary"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" /> : 'RECORD SUPPLIER PAYMENT'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: Invoice Details View */}
        <AnimatePresence>
          {isDetailModalOpen && detailPurchase && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-2xl border border-white/10 rounded-2xl p-6 relative overflow-hidden z-10 flex flex-col max-h-[85vh] space-y-6"
              >
                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Invoice Details</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      Purchase reference: {detailPurchase.purchaseId}
                    </p>
                  </div>
                  <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-xs">
                  {/* Supplier Card */}
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Supplier Details</span>
                    <div className="flex justify-between">
                      <span className="text-white font-bold">{detailPurchase.supplierId?.name}</span>
                      <span className="text-gray-400">{detailPurchase.supplierId?.companyName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-400 pt-2 border-t border-white/5">
                      <div>
                        <span>Contact: {detailPurchase.supplierId?.contactPerson}</span>
                        <br />
                        <span>Phone: {detailPurchase.supplierId?.phoneNumber}</span>
                      </div>
                      <div>
                        <span>GST/Tax ID: {detailPurchase.supplierId?.gstId || 'N/A'}</span>
                        <br />
                        <span>City: {detailPurchase.supplierId?.city || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Product Specifications */}
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Product Specifications</span>
                    <div className="flex justify-between">
                      <span className="text-white font-bold">{detailPurchase.productName}</span>
                      {detailPurchase.variantName && (
                        <span className="px-2 py-0.5 bg-white/5 rounded font-black text-cyan-400 text-[10px]">{detailPurchase.variantName}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/5 text-[10px] text-gray-400">
                      <div>
                        <span>Cost price:</span>
                        <span className="block font-bold text-white mt-1">₹{detailPurchase.costPrice?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span>Quantity:</span>
                        <span className="block font-bold text-white mt-1">{detailPurchase.quantity} {detailPurchase.unit}</span>
                      </div>
                      <div>
                        <span>Total value:</span>
                        <span className="block font-bold text-cyan-400 mt-1">₹{detailPurchase.totalAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Billing & Payment Summary</span>
                    <div className="grid grid-cols-3 gap-4 text-[10px] text-gray-400">
                      <div>
                        <span>Paid amount:</span>
                        <span className="block font-bold text-emerald-400 mt-1">₹{detailPurchase.amountPaid?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span>Remaining:</span>
                        <span className="block font-bold text-rose-400 mt-1">₹{detailPurchase.remainingBalance?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span>Status:</span>
                        <span className="block font-bold text-white uppercase mt-1">{detailPurchase.paymentStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Warehouse Allocation Breakdown */}
                  {detailPurchase.warehouseAllocations?.length > 0 && (
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Warehouse Stock Allocation</span>
                      <div className="space-y-1.5 pt-2">
                        {detailPurchase.warehouseAllocations.map((alloc: any, idx: number) => {
                          const wName = warehouses.find(w => w._id === alloc.warehouseId)?.name || 'Unknown Warehouse';
                          return (
                            <div key={idx} className="flex justify-between items-center text-[10px]">
                              <span className="text-gray-400">{wName}</span>
                              <span className="text-white font-bold">{alloc.quantity} units</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {detailPurchase.notes && (
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Notes / Terms</span>
                      <p className="text-gray-300 italic">"{detailPurchase.notes}"</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full btn-secondary"
                >
                  CLOSE INVOICE
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
