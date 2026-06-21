'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Plus, Search, Filter, Trash2, Edit2, Loader2, X, Check,
  Briefcase, Banknote, Calendar, CheckSquare, Clock, ArrowRight,
  MessageSquare, User, Mail, Phone, Lock, FileSpreadsheet, MapPin, 
  Layers, ChevronRight, Grid, List, AlertTriangle
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionButtons } from '@/components/ui/ActionButtons';
import { toast } from 'sonner';
import { useUser } from '@/components/UserContext';
import { useCurrency } from '@/components/CurrencyContext';
import { fetchWithAuth } from '@/services/api';
import { format } from 'date-fns';

export default function SuppliersPage() {
  const { user, isAdmin, hasPermission } = useUser();
  const { formatPrice } = useCurrency();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Layout and filter state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Drawer State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    gstTaxId: '',
    paymentTerms: '',
    notes: '',
    status: 'ACTIVE',
    productsSupplied: [] as string[]
  });

  // Purchase Form Fields State
  const [purchaseData, setPurchaseData] = useState({
    productId: '',
    warehouseId: '',
    quantity: 0,
    totalCost: 0,
    invoiceNumber: ''
  });

  const fetchData = async () => {
    try {
      const [suppliersData, productsData, warehousesData] = await Promise.all([
        fetchWithAuth('/suppliers'),
        fetchWithAuth('/products'),
        fetchWithAuth('/warehouses')
      ]);
      setSuppliers(suppliersData);
      setProducts(productsData);
      setWarehouses(warehousesData);
      setFilteredSuppliers(suppliersData);
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync selected supplier details if updated
  useEffect(() => {
    if (selectedSupplier) {
      const updated = suppliers.find(s => s._id === selectedSupplier._id);
      if (updated) setSelectedSupplier(updated);
    }
  }, [suppliers]);

  // Filters logic
  useEffect(() => {
    let result = suppliers;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.name?.toLowerCase().includes(term) ||
        s.companyName?.toLowerCase().includes(term) ||
        s.contactPerson?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(s => s.status === statusFilter);
    }

    setFilteredSuppliers(result);
  }, [searchTerm, statusFilter, suppliers]);

  // Supplier Stats
  const activeSuppliersCount = suppliers.filter(s => s.status === 'ACTIVE').length;
  
  // Calculate total purchase cost
  const totalPurchaseCost = suppliers.reduce((sum, s) => {
    const historyCost = (s.purchaseHistory || []).reduce((acc: number, p: any) => acc + (p.totalCost || 0), 0);
    return sum + historyCost;
  }, 0);

  const pendingOrdersCount = suppliers.reduce((sum, s) => {
    // Arbitrary metric using active purchase logs or unlinked items
    return sum + (s.purchaseHistory || []).length;
  }, 0);

  // Form Operations
  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: '',
      gstTaxId: '',
      paymentTerms: '',
      notes: '',
      status: 'ACTIVE',
      productsSupplied: []
    });
    setIsFormOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, supplier: any) => {
    e.stopPropagation();
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      companyName: supplier.companyName || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      country: supplier.country || '',
      gstTaxId: supplier.gstTaxId || '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || '',
      status: supplier.status || 'ACTIVE',
      productsSupplied: (supplier.productsSupplied || []).map((p: any) => typeof p === 'object' ? p._id : p)
    });
    setIsFormOpen(true);
  };

  const openPurchaseModal = (e: React.MouseEvent, supplier: any) => {
    e.stopPropagation();
    setSelectedSupplier(supplier);
    setPurchaseData({
      productId: (supplier.productsSupplied && supplier.productsSupplied.length > 0) 
        ? (typeof supplier.productsSupplied[0] === 'object' ? supplier.productsSupplied[0]._id : supplier.productsSupplied[0])
        : '',
      warehouseId: warehouses.length > 0 ? warehouses[0]._id : '',
      quantity: 0,
      totalCost: 0,
      invoiceNumber: ''
    });
    setIsPurchaseOpen(true);
  };

  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Access denied. Admin rights required.');
      return;
    }
    setLoading(true);
    try {
      if (editingSupplier) {
        await fetchWithAuth(`/suppliers/${editingSupplier._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Supplier details updated');
      } else {
        await fetchWithAuth('/suppliers', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Supplier added successfully');
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (e: React.MouseEvent, supplier: any) => {
    e.stopPropagation();
    if (!isAdmin) {
      toast.error('Access denied. Admin rights required.');
      return;
    }
    if (!confirm(`Are you sure you want to delete supplier: ${supplier.name}?`)) return;
    try {
      await fetchWithAuth(`/suppliers/${supplier._id}`, { method: 'DELETE' });
      toast.success('Supplier removed');
      if (selectedSupplier?._id === supplier._id) setSelectedSupplier(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Access denied. Admin rights required.');
      return;
    }
    if (!purchaseData.productId) {
      toast.error('Product selection is required');
      return;
    }
    setLoading(true);
    try {
      await fetchWithAuth(`/suppliers/${selectedSupplier._id}/purchase`, {
        method: 'POST',
        body: JSON.stringify(purchaseData)
      });
      toast.success('Inventory ingested & purchase recorded successfully');
      setIsPurchaseOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelect = (prodId: string) => {
    setFormData(prev => {
      const exists = prev.productsSupplied.includes(prodId);
      if (exists) {
        return { ...prev, productsSupplied: prev.productsSupplied.filter(id => id !== prodId) };
      } else {
        return { ...prev, productsSupplied: [...prev.productsSupplied, prodId] };
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase">Supplier Management</h1>
            <p className="text-gray-400 font-medium font-sans">Manage warehouse supply pipelines and purchase orders</p>
          </div>
          {isAdmin && (
            <button 
              onClick={openCreateModal}
              className="px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-white font-black text-xs uppercase shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer active:scale-95 animate-pulse"
            >
              <Plus size={16} />
              <span>ADD SUPPLIER</span>
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Suppliers</p>
              <h3 className="text-3xl font-black text-white mt-1">{suppliers.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-400">
              <Truck size={20} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Active Status</p>
              <h3 className="text-3xl font-black text-white mt-1">{activeSuppliersCount}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <Check size={20} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Ingestion History</p>
              <h3 className="text-3xl font-black text-white mt-1">{pendingOrdersCount} <span className="text-xs font-bold text-gray-500">records</span></h3>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 text-purple-400">
              <Layers size={20} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Purchases</p>
              <h3 className="text-3xl font-black text-white mt-1">
                {hasPermission('viewRevenue') ? formatPrice(totalPurchaseCost) : (
                  <span className="flex items-center text-rose-400 gap-1.5 text-lg font-bold">
                    <Lock size={14} /> Locked
                  </span>
                )}
              </h3>
            </div>
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 text-amber-400">
              <Banknote size={20} />
            </div>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative group w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search suppliers by name, company, contact..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input pl-12"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto justify-end">
            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 shrink-0">
              <Filter size={14} className="text-gray-500 ml-2" />
              <select 
                className="bg-transparent text-xs font-black uppercase tracking-wider text-gray-400 border-none outline-none pr-4 cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">ALL STATUSES</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            {/* View Switcher */}
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 shrink-0">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                <Grid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${viewMode === 'table' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Suppliers List/Table */}
        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <Loader2 className="animate-spin text-cyan-400 w-12 h-12" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="glass-panel p-20 text-center rounded-2xl border border-white/5">
            <Truck className="w-16 h-16 text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-400">No Suppliers Registered</h3>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or register a new supplier to link products.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier, i) => (
              <motion.div 
                key={supplier._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedSupplier(supplier)}
                className="glass-panel p-6 rounded-2xl border border-white/5 hover:scale-[1.01] hover:border-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/5 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                      supplier.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {supplier.status}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {(supplier.productsSupplied || []).length} Products supplied
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white mb-0.5 truncate">{supplier.name}</h3>
                  <p className="text-gray-400 font-bold text-xs flex items-center gap-1 mb-6">
                    <Briefcase size={12} className="text-cyan-400" />
                    <span>{supplier.companyName || 'Individual'}</span>
                  </p>

                  <div className="space-y-1.5 mb-6 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <User size={12} className="text-gray-600 shrink-0" />
                      <span className="truncate">Contact: {supplier.contactPerson || 'N/A'}</span>
                    </div>
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-gray-600 shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-gray-600 shrink-0" />
                        <span className="truncate">{supplier.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  {isAdmin ? (
                    <button 
                      onClick={(e) => openPurchaseModal(e, supplier)}
                      className="btn-secondary btn-sm"
                    >
                      <Plus size={12} />
                      <span>Ingest Stock</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-500 italic">View Only</span>
                  )}

                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <>
                        <button 
                          onClick={(e) => openEditModal(e, supplier)}
                          className="btn-action-edit"
                        >
                          <Edit2 size={22} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteSupplier(e, supplier)}
                          className="btn-action-delete"
                        >
                          <Trash2 size={22} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone / Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead className="justify-center text-center">Actions</TableHead>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow 
                    key={supplier._id} 
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    <TableCell className="font-bold text-white">{supplier.name}</TableCell>
                    <TableCell className="text-gray-300">{supplier.contactPerson || '-'}</TableCell>
                    <TableCell className="text-gray-400 font-bold">{supplier.companyName || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-gray-300 text-xs">{supplier.phone || '-'}</p>
                        <p className="text-gray-500 text-[10px]">{supplier.email || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={supplier.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} />
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">{supplier.paymentTerms || '-'}</TableCell>
                    <TableCell className="justify-center text-center">
                      <div className="flex justify-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={(e) => openPurchaseModal(e, supplier)}
                              className="btn-secondary btn-sm h-10 px-4 rounded-xl"
                            >
                              Ingest
                            </button>
                            <ActionButtons 
                              actions={[
                                {
                                  type: 'edit',
                                  onClick: (e) => openEditModal(e, supplier)
                                },
                                {
                                  type: 'delete',
                                  onClick: (e) => handleDeleteSupplier(e, supplier)
                                }
                              ]}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Supplier Creation / Edit Modal */}
        <AnimatePresence>
          {isFormOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass-panel w-full max-w-2xl p-8 rounded-2xl relative z-10 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide"
              >
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                      {editingSupplier ? 'Modify Supplier Profile' : 'Register Supplier Account'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Provide supplier credentials and payment configurations</p>
                  </div>
                  <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmitSupplier} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Supplier Name</label>
                      <input 
                        placeholder="John Doe" required className="w-full glass-input" 
                        value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Company Name</label>
                      <input 
                        placeholder="Nexus Supply Co" className="w-full glass-input" 
                        value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Contact Person</label>
                      <input 
                        placeholder="Alice Smith (Accounts)" className="w-full glass-input" 
                        value={formData.contactPerson} onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Tax ID / GSTIN</label>
                      <input 
                        placeholder="27AAAPN1234A1Z9" className="w-full glass-input" 
                        value={formData.gstTaxId} onChange={(e) => setFormData({...formData, gstTaxId: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                      <input 
                        placeholder="supplies@nexus.com" type="email" className="w-full glass-input" 
                        value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                      <input 
                        placeholder="+91 9988776655" className="w-full glass-input" 
                        value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Warehouse Street Address</label>
                      <input 
                        placeholder="104 Industrial Sector, Phase 1" className="w-full glass-input" 
                        value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">City</label>
                      <input 
                        placeholder="Mumbai" className="w-full glass-input" 
                        value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">State / Country</label>
                      <input 
                        placeholder="Maharashtra / India" className="w-full glass-input" 
                        value={`${formData.state ? formData.state + ', ' : ''}${formData.country}`} 
                        onChange={(e) => {
                          const parts = e.target.value.split(',');
                          setFormData({
                            ...formData, 
                            state: parts[0]?.trim() || '', 
                            country: parts[1]?.trim() || ''
                          });
                        }} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Terms</label>
                      <select 
                        className="w-full glass-select"
                        value={formData.paymentTerms} onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                      >
                        <option value="Immediate">Immediate / Advance</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 65">Net 65 Days</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Supplier Status</label>
                      <select 
                        className="w-full glass-select"
                        value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>

                    {/* Linked Products checkboxes */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-white/5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 block">Supplied Products</label>
                      <div className="grid grid-cols-2 gap-3 max-h-[140px] overflow-y-auto p-4 bg-white/2 rounded-2xl border border-white/5 scrollbar-hide">
                        {products.map(p => (
                          <div 
                            key={p._id}
                            onClick={() => toggleProductSelect(p._id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                              formData.productsSupplied.includes(p._id) ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-white/5 hover:bg-white/5 text-gray-400'
                            }`}
                          >
                            <span className="text-xs font-bold truncate pr-2">{p.name}</span>
                            {formData.productsSupplied.includes(p._id) ? (
                              <Check size={14} className="text-cyan-400 shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-gray-600 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Notes</label>
                      <textarea 
                        placeholder="Any comments, agreements or payment details..." rows={3}
                        className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all min-h-[80px] resize-none text-white" 
                        value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary w-full"
                  >
                    {editingSupplier ? 'SAVE SUPPLIER PROFILE' : 'REGISTER SUPPLIER ACCOUNT'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Record Ingestion / Stock Purchase Modal */}
        <AnimatePresence>
          {isPurchaseOpen && selectedSupplier && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPurchaseOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass-panel w-full max-w-lg p-8 rounded-2xl relative z-10 border border-white/10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                      <Layers size={18} className="text-cyan-400" />
                      <span>Ingest Inventory Stock</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Supplier: {selectedSupplier.name}</p>
                  </div>
                  <button onClick={() => setIsPurchaseOpen(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={24} /></button>
                </div>

                <form onSubmit={handleRecordPurchase} className="space-y-6">
                  <div className="space-y-4">
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Select Product</label>
                      <select 
                        required
                        className="w-full glass-select"
                        value={purchaseData.productId}
                        onChange={(e) => setPurchaseData({...purchaseData, productId: e.target.value})}
                      >
                        <option value="">Select from catalog...</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id}>{p.name} (SKU: {p.sku || 'N/A'})</option>
                        ))}
                      </select>
                    </div>

                    {/* Warehouse Target */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Target Warehouse (Allocation)</label>
                      <select 
                        required
                        className="w-full glass-select"
                        value={purchaseData.warehouseId}
                        onChange={(e) => setPurchaseData({...purchaseData, warehouseId: e.target.value})}
                      >
                        <option value="">Do not assign to warehouse</option>
                        {warehouses.map(w => (
                          <option key={w._id} value={w._id}>{w.name} (ID: {w.warehouseId})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Quantity Ingested</label>
                        <input 
                          type="number" required placeholder="50" min="1" className="w-full glass-input"
                          value={purchaseData.quantity || ''}
                          onChange={(e) => setPurchaseData({...purchaseData, quantity: Number(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Total Cost Value</label>
                        <input 
                          type="number" required placeholder="2500" min="0" className="w-full glass-input"
                          value={purchaseData.totalCost || ''}
                          onChange={(e) => setPurchaseData({...purchaseData, totalCost: Number(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Purchase Invoice Number</label>
                      <input 
                        placeholder="PO-2026-0034" className="w-full glass-input"
                        value={purchaseData.invoiceNumber}
                        onChange={(e) => setPurchaseData({...purchaseData, invoiceNumber: e.target.value})}
                      />
                    </div>

                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary w-full"
                  >
                    SUBMIT INGESTION ORDER
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Supplier Profile Slide-over Drawer */}
        <AnimatePresence>
          {selectedSupplier && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSupplier(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div 
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.35 }}
                className="w-full max-w-xl bg-slate-950/95 border-l border-white/10 h-full relative z-10 p-6 md:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-xl"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white cursor-pointer"><X size={22} /></button>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                      selectedSupplier.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {selectedSupplier.status}
                    </span>
                  </div>

                  <h2 className="text-3xl font-black text-white tracking-tight uppercase break-words">{selectedSupplier.name}</h2>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 mb-8">
                    <Briefcase size={12} />
                    <span>{selectedSupplier.companyName || 'Individual Supplier'}</span>
                  </p>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-white/2 rounded-2xl border border-white/5 mb-8 text-xs text-gray-400">
                    <div>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Email</span>
                      <span className="text-white truncate block">{selectedSupplier.email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Phone</span>
                      <span className="text-white truncate block">{selectedSupplier.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Payment Terms</span>
                      <span className="text-white block font-bold">{selectedSupplier.paymentTerms || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">GST/Tax ID</span>
                      <span className="text-white block font-mono font-bold">{selectedSupplier.gstTaxId || 'N/A'}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-white/5">
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Address</span>
                      <span className="text-white block">
                        {selectedSupplier.address ? `${selectedSupplier.address}, ` : ''}
                        {selectedSupplier.city ? `${selectedSupplier.city}, ` : ''}
                        {selectedSupplier.state ? `${selectedSupplier.state}, ` : ''}
                        {selectedSupplier.country || ''}
                      </span>
                    </div>
                  </div>

                  {/* Notes panel */}
                  {selectedSupplier.notes && (
                    <div className="p-4 bg-white/2 border border-dashed border-white/5 rounded-2xl mb-8">
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">Supplier Notes</span>
                      <p className="text-xs text-gray-300 italic">"{selectedSupplier.notes}"</p>
                    </div>
                  )}

                  {/* Supplied products list */}
                  <div className="space-y-3 mb-8">
                    <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest block">Linked Catalog Products</span>
                    {(!selectedSupplier.productsSupplied || selectedSupplier.productsSupplied.length === 0) ? (
                      <p className="text-xs text-gray-500 italic">No products mapped to this supplier.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedSupplier.productsSupplied.map((p: any) => (
                          <span key={p._id} className="px-3 py-1 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-300 font-bold">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase history log */}
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide pt-4 border-t border-white/5 space-y-4">
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest block">Stock Ingestion Ledger</span>
                  {(!selectedSupplier.purchaseHistory || selectedSupplier.purchaseHistory.length === 0) ? (
                    <p className="text-xs text-gray-500 italic py-4">No purchase transactions logged yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[22vh] overflow-y-auto pr-1 scrollbar-hide">
                      {selectedSupplier.purchaseHistory.map((ph: any, i: number) => (
                        <div key={i} className="p-3.5 bg-white/2 border border-white/5 rounded-2xl text-xs space-y-1 hover:bg-white/5 transition-all">
                          <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold">
                            <span className="text-cyan-400 font-mono">Invoice: {ph.invoiceNumber || 'N/A'}</span>
                            <span>{format(new Date(ph.date), 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex justify-between items-baseline pt-1">
                            <span className="text-white font-bold">{ph.productName || 'Ingested Item'}</span>
                            <span className="text-emerald-400 font-black text-sm">+{ph.quantity} Items</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1 border-t border-white/5">
                            <span>Ingestion Cost</span>
                            <span className="text-white font-bold">{formatPrice(ph.totalCost)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
