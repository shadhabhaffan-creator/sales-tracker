'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Warehouse, Plus, Search, Filter, Trash2, Edit2, Loader2, X, Check,
  ArrowRightLeft, ArrowUpRight, ArrowDownRight, Layers, User, Phone, 
  MapPin, Clipboard, Settings, Lock, CheckSquare, Clock, BarChart3,
  Calendar, Grid, List, ShieldCheck, Activity, AlertTriangle, Truck, TrendingUp
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, truncateUUID } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionButtons } from '@/components/ui/ActionButtons';
import { toast } from 'sonner';
import { useUser } from '@/components/UserContext';
import { useCurrency } from '@/components/CurrencyContext';
import { fetchWithAuth } from '@/services/api';
import { format } from 'date-fns';

export default function WarehousesPage() {
  const { user, isAdmin } = useUser();
  
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout & Filter states
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Drawer State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Capacity increase modal
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [capacityTarget, setCapacityTarget] = useState<any>(null);
  const [capacityAddAmount, setCapacityAddAmount] = useState(0);
  const [capacityLoading, setCapacityLoading] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    warehouseId: '',
    location: '',
    address: '',
    managerName: '',
    contactNumber: '',
    capacity: 0,
    status: 'ACTIVE'
  });

  // Transfer Wizard State
  const [transferData, setTransferData] = useState({
    productId: '',
    variantId: '',
    type: 'TRANSFER', // 'INCOMING', 'OUTGOING', 'TRANSFER', 'ADJUSTMENT'
    quantity: 0,
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    warehouseId: '',
    reference: ''
  });

  const fetchData = async () => {
    try {
      const [warehousesData, productsData, movementsData] = await Promise.all([
        fetchWithAuth('/warehouses'),
        fetchWithAuth('/products'),
        fetchWithAuth('/warehouses/movements')
      ]);
      setWarehouses(warehousesData);
      setProducts(productsData);
      setMovements(movementsData);
      setFilteredWarehouses(warehousesData);
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync selected warehouse details if updated
  useEffect(() => {
    if (selectedWarehouse) {
      const updated = warehouses.find(w => w._id === selectedWarehouse._id);
      if (updated) setSelectedWarehouse(updated);
    }
  }, [warehouses]);

  // Filters logic
  useEffect(() => {
    let result = warehouses;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(w => 
        w.name?.toLowerCase().includes(term) ||
        w.warehouseId?.toLowerCase().includes(term) ||
        w.location?.toLowerCase().includes(term) ||
        w.managerName?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(w => w.status === statusFilter);
    }

    setFilteredWarehouses(result);
  }, [searchTerm, statusFilter, warehouses]);

  // Warehouse KPI Card Calculations
  const totalStockCount = warehouses.reduce((sum, w) => sum + (w.currentStock || 0), 0);
  const totalCapacity = warehouses.reduce((sum, w) => sum + (w.capacity || 0), 0);
  const availableCapacity = Math.max(0, totalCapacity - totalStockCount);

  // Low stock products across all warehouses (threshold <= 5)
  const lowStockCount = warehouses.reduce((sum, w) => {
    const lowProds = (w.products || []).filter((p: any) => p.stock <= 5).length;
    return sum + lowProds;
  }, 0);

  const incomingLogsCount = movements.filter(m => m.type === 'INCOMING').length;
  const outgoingLogsCount = movements.filter(m => m.type === 'OUTGOING').length;

  // Form Handlers
  const openCreateModal = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      warehouseId: 'WH-' + Math.floor(1000 + Math.random() * 9000),
      location: '',
      address: '',
      managerName: '',
      contactNumber: '',
      capacity: 1000,
      status: 'ACTIVE'
    });
    setIsFormOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, warehouse: any) => {
    e.stopPropagation();
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name || '',
      warehouseId: warehouse.warehouseId || '',
      location: warehouse.location || '',
      address: warehouse.address || '',
      managerName: warehouse.managerName || '',
      contactNumber: warehouse.contactNumber || '',
      capacity: warehouse.capacity || 0,
      status: warehouse.status || 'ACTIVE'
    });
    setIsFormOpen(true);
  };

  const openTransferModal = () => {
    const firstProd = products.length > 0 ? products[0] : null;
    setTransferData({
      productId: firstProd ? firstProd._id : '',
      variantId: firstProd && firstProd.variants && firstProd.variants.length > 0 ? firstProd.variants[0]._id : '',
      type: 'TRANSFER',
      quantity: 0,
      sourceWarehouseId: warehouses.length > 0 ? warehouses[0]._id : '',
      destinationWarehouseId: warehouses.length > 1 ? warehouses[1]._id : warehouses.length > 0 ? warehouses[0]._id : '',
      warehouseId: warehouses.length > 0 ? warehouses[0]._id : '',
      reference: ''
    });
    setIsTransferOpen(true);
  };

  const handleSubmitWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Admin privileges required.');
      return;
    }
    setLoading(true);
    try {
      if (editingWarehouse) {
        await fetchWithAuth(`/warehouses/${editingWarehouse._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Warehouse profiles updated successfully');
      } else {
        await fetchWithAuth('/warehouses', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Warehouse facility added');
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWarehouse = async (e: React.MouseEvent, warehouse: any) => {
    e.stopPropagation();
    if (!isAdmin) {
      toast.error('Admin privileges required.');
      return;
    }
    if (!confirm(`Are you sure you want to delete warehouse: ${warehouse.name}?`)) return;
    try {
      await fetchWithAuth(`/warehouses/${warehouse._id}`, { method: 'DELETE' });
      toast.success('Warehouse deleted');
      if (selectedWarehouse?._id === warehouse._id) setSelectedWarehouse(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleApplyMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Admin privileges required.');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...transferData };
      if (payload.type !== 'TRANSFER') {
        payload.sourceWarehouseId = '';
        payload.destinationWarehouseId = '';
      }
      await fetchWithAuth('/warehouses/movement', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      toast.success('Stock movement executed');
      setIsTransferOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCapacityModal = (e: React.MouseEvent, wh: any) => {
    e.stopPropagation();
    setCapacityTarget(wh);
    setCapacityAddAmount(0);
    setIsCapacityModalOpen(true);
  };

  const handleIncreaseCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capacityTarget || capacityAddAmount <= 0) {
      toast.error('Please enter a valid capacity increase amount');
      return;
    }
    setCapacityLoading(true);
    try {
      const newCapacity = (capacityTarget.capacity || 0) + capacityAddAmount;
      await fetchWithAuth(`/warehouses/${capacityTarget._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ capacity: newCapacity })
      });
      toast.success(`Capacity increased by ${capacityAddAmount} units (New total: ${newCapacity})`);
      setIsCapacityModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update capacity');
    } finally {
      setCapacityLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase">Warehouse Management</h1>
            <p className="text-gray-400 font-medium font-sans">Track multi-warehouse allocations, capacity metrics, and stock flows</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <button 
                  onClick={openTransferModal}
                  className="px-6 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-white font-black text-xs uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <ArrowRightLeft size={16} className="text-cyan-400" />
                  <span>Transfer Stock</span>
                </button>
                <button 
                  onClick={openCreateModal}
                  className="px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-white font-black text-xs uppercase shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus size={16} />
                  <span>ADD WAREHOUSE</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Warehouses</p>
              <h3 className="text-3xl font-black text-white mt-1">{warehouses.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-400">
              <Warehouse size={20} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Allocated Stock</p>
              <h3 className="text-3xl font-black text-white mt-1">{totalStockCount} <span className="text-xs font-bold text-gray-500">items</span></h3>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <Layers size={20} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Available Capacity</p>
              <h3 className="text-3xl font-black text-white mt-1">{availableCapacity} <span className="text-xs font-bold text-gray-500">units</span></h3>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 text-purple-400">
              <Activity size={20} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Low Stock Items</p>
              <h3 className="text-3xl font-black text-rose-400 mt-1">{lowStockCount}</h3>
            </div>
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 text-rose-400">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative group w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search warehouses by name, ID, manager name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input pl-12"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto justify-end">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 shrink-0">
              <Filter size={14} className="text-gray-500 ml-2" />
              <select 
                className="bg-transparent text-xs font-black uppercase tracking-wider text-gray-400 border-none outline-none pr-4 cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">ALL FACILITIES</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

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

        {/* Warehouses Grid / Table */}
        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <Loader2 className="animate-spin text-cyan-400 w-12 h-12" />
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="glass-panel p-20 text-center rounded-2xl border border-white/5">
            <Warehouse className="w-16 h-16 text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-400">No Warehouse Facilities</h3>
            <p className="text-gray-500 text-sm mt-2">Create a warehouse facility to track stock locations and allocations.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWarehouses.map((wh, i) => {
              const stockPercentage = wh.capacity > 0 ? Math.min(100, Math.round((wh.currentStock / wh.capacity) * 100)) : 0;
              return (
                <motion.div 
                  key={wh._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedWarehouse(wh)}
                  className="glass-panel p-6 rounded-2xl border border-white/5 hover:scale-[1.01] hover:border-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/5 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                        wh.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {wh.status}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-cyan-400">{wh.warehouseId}</span>
                    </div>

                    <h3 className="text-lg font-black text-white mb-0.5 truncate">{wh.name}</h3>
                    <p className="text-gray-400 font-bold text-xs flex items-center gap-1 mb-6">
                      <MapPin size={12} className="text-cyan-400 shrink-0" />
                      <span>{wh.location || 'Not Specified'}</span>
                    </p>

                    {/* Stock Fill Indicator */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500">
                        <span>Capacity Utilized</span>
                        <span className="text-white">{wh.currentStock} / {wh.capacity} Units ({stockPercentage}%)</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            stockPercentage > 90 ? 'bg-rose-500' : stockPercentage > 70 ? 'bg-amber-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${stockPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-6 text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-gray-600" />
                        <span className="truncate">Manager: {wh.managerName || 'Unassigned'}</span>
                      </div>
                      {wh.contactNumber && (
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-gray-600" />
                          <span className="truncate">{wh.contactNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500">
                      {(wh.products || []).length} Unique Products
                    </span>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <>
                          <button 
                            onClick={(e) => openCapacityModal(e, wh)}
                            className="btn-action-success"
                            title="Increase Capacity"
                          >
                            <TrendingUp size={22} />
                          </button>
                          <button 
                            onClick={(e) => openEditModal(e, wh)}
                            className="btn-action-edit"
                          >
                            <Edit2 size={22} />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteWarehouse(e, wh)}
                            className="btn-action-delete"
                          >
                            <Trash2 size={22} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Table view */
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableHead>Warehouse</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Stock Fill Ratio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="justify-center text-center">Actions</TableHead>
              </TableHeader>
              <TableBody>
                {filteredWarehouses.map((wh) => (
                  <TableRow 
                    key={wh._id} 
                    onClick={() => setSelectedWarehouse(wh)}
                  >
                    <TableCell className="font-bold text-white">{wh.name}</TableCell>
                    <TableCell className="text-cyan-400 font-mono text-xs" title={wh.warehouseId}>{truncateUUID(wh.warehouseId)}</TableCell>
                    <TableCell className="text-gray-300">{wh.location || '-'}</TableCell>
                    <TableCell className="text-gray-400 font-bold">{wh.managerName || 'Unassigned'}</TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-300">{wh.currentStock} / {wh.capacity}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={wh.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} />
                    </TableCell>
                    <TableCell className="justify-center text-center">
                      <div className="flex justify-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={(e) => openCapacityModal(e, wh)}
                              className="btn-action-success w-10 h-10 rounded-xl flex items-center justify-center border"
                              title="Increase Capacity"
                            >
                              <TrendingUp size={22} />
                            </button>
                            <ActionButtons 
                              actions={[
                                {
                                  type: 'edit',
                                  onClick: (e) => openEditModal(e, wh)
                                },
                                {
                                  type: 'delete',
                                  onClick: (e) => handleDeleteWarehouse(e, wh)
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

        {/* Warehouse Creation / Edit Modal */}
        <AnimatePresence>
          {isFormOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass-panel w-full max-w-xl p-8 rounded-2xl relative z-10 border border-white/10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                      {editingWarehouse ? 'Modify Warehouse Settings' : 'Create Warehouse Facility'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Configure layout, capacity, and manager assignment</p>
                  </div>
                  <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmitWarehouse} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Warehouse Name</label>
                      <input 
                        placeholder="Central Storage Facility" required className="w-full glass-input" 
                        value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Warehouse ID (Unique)</label>
                      <input 
                        placeholder="WH-901" required className="w-full glass-input font-mono font-bold text-cyan-400" 
                        value={formData.warehouseId} onChange={(e) => setFormData({...formData, warehouseId: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Warehouse Location (City/Hub)</label>
                      <input 
                        placeholder="JNPT Port Hub, Navi Mumbai" className="w-full glass-input" 
                        value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Manager Name</label>
                      <input 
                        placeholder="Rajesh Kumar" className="w-full glass-input font-bold" 
                        value={formData.managerName} onChange={(e) => setFormData({...formData, managerName: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Manager Contact Number</label>
                      <input 
                        placeholder="+91 9999000022" className="w-full glass-input" 
                        value={formData.contactNumber} onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Capacity Limit (Items)</label>
                      <input 
                        type="number" required placeholder="5000" className="w-full glass-input" 
                        value={formData.capacity || ''} onChange={(e) => setFormData({...formData, capacity: Number(e.target.value) || 0})} 
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Facility Address</label>
                      <input 
                        placeholder="Gate No. 4, Warehouse Zone, JNPT, Navi Mumbai, MH - 400707" className="w-full glass-input" 
                        value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        className="w-full glass-select"
                        value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary w-full"
                  >
                    {editingWarehouse ? 'SAVE WAREHOUSE PROFILE' : 'CREATE WAREHOUSE FACILITY'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Stock Transfer and Adjustment Wizard */}
        <AnimatePresence>
          {isTransferOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTransferOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass-panel w-full max-w-xl p-8 rounded-2xl relative z-10 border border-white/10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                      <ArrowRightLeft size={18} className="text-cyan-400" />
                      <span>Stock Movement & Transfer Wizard</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Record transfers, dispatches, adjustments, or additions</p>
                  </div>
                  <button onClick={() => setIsTransferOpen(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={24} /></button>
                </div>

                <form onSubmit={handleApplyMovement} className="space-y-6">
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Movement Type</label>
                    <select 
                      className="w-full glass-select"
                      value={transferData.type}
                      onChange={(e) => setTransferData({
                        ...transferData, 
                        type: e.target.value,
                        sourceWarehouseId: warehouses.length > 0 ? warehouses[0]._id : '',
                        destinationWarehouseId: warehouses.length > 1 ? warehouses[1]._id : warehouses.length > 0 ? warehouses[0]._id : '',
                        warehouseId: warehouses.length > 0 ? warehouses[0]._id : ''
                      })}
                    >
                      <option value="TRANSFER">TRANSFER BETWEEN WAREHOUSES</option>
                      <option value="INCOMING">INCOMING ADDITION (FROM SUPPLIER/FACTORY)</option>
                      <option value="OUTGOING">OUTGOING DISPATCH (SALES/DAMAGE)</option>
                      <option value="ADJUSTMENT">MANUAL AUDIT STOCK ADJUSTMENT</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Select Product</label>
                    <select 
                      required
                      className="w-full glass-select"
                      value={transferData.productId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        const prod = products.find(p => p._id === pId);
                        setTransferData({
                          ...transferData,
                          productId: pId,
                          variantId: prod && prod.variants && prod.variants.length > 0 ? prod.variants[0]._id : ''
                        });
                      }}
                    >
                      <option value="">Select from catalog...</option>
                      {products.map(p => (
                        <option key={p._id} value={p._id}>{p.name} (SKU: {p.sku || 'N/A'})</option>
                      ))}
                    </select>
                  </div>

                  {/* Conditional Variant Selector */}
                  {(() => {
                    const selectedProd = products.find(p => p._id === transferData.productId);
                    if (selectedProd && selectedProd.variants && selectedProd.variants.length > 0) {
                      return (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Select Packaging / Variant</label>
                          <select
                            required
                            className="w-full glass-select"
                            value={transferData.variantId}
                            onChange={(e) => setTransferData({ ...transferData, variantId: e.target.value })}
                          >
                            <option value="">Select variant...</option>
                            {selectedProd.variants.map((v: any) => (
                              <option key={v._id} value={v._id}>{v.name} (SKU: {v.sku || 'N/A'}, Stock: {v.stock})</option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Source & Destination Warehouse Conditional Selects */}
                  {transferData.type === 'TRANSFER' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Source Warehouse (From)</label>
                        <select 
                          required
                          className="w-full glass-select"
                          value={transferData.sourceWarehouseId}
                          onChange={(e) => setTransferData({...transferData, sourceWarehouseId: e.target.value})}
                        >
                          <option value="">Select source...</option>
                          {warehouses.map(w => (
                            <option key={w._id} value={w._id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Destination Warehouse (To)</label>
                        <select 
                          required
                          className="w-full glass-select"
                          value={transferData.destinationWarehouseId}
                          onChange={(e) => setTransferData({...transferData, destinationWarehouseId: e.target.value})}
                        >
                          <option value="">Select destination...</option>
                          {warehouses.map(w => (
                            <option key={w._id} value={w._id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Single Warehouse selector for In/Out/Adjustments */}
                  {transferData.type !== 'TRANSFER' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">
                        {transferData.type === 'INCOMING' ? 'Target Warehouse (To)' : 
                         transferData.type === 'OUTGOING' ? 'Source Warehouse (From)' : 'Target Warehouse'}
                      </label>
                      <select 
                        required
                        className="w-full glass-select"
                        value={transferData.warehouseId}
                        onChange={(e) => setTransferData({
                          ...transferData, 
                          warehouseId: e.target.value,
                          destinationWarehouseId: e.target.value, // sync
                          sourceWarehouseId: e.target.value
                        })}
                      >
                        <option value="">Select warehouse...</option>
                        {warehouses.map(w => (
                          <option key={w._id} value={w._id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">
                        {transferData.type === 'ADJUSTMENT' ? 'New Stock Level (Set to)' : 'Quantity to Move'}
                      </label>
                      <input 
                        type="number" required placeholder="10" min="0" className="w-full glass-input font-bold"
                        value={transferData.quantity || ''}
                        onChange={(e) => setTransferData({...transferData, quantity: Number(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Reference / Note</label>
                      <input 
                        placeholder="Order ID / Reason for adjustment" className="w-full glass-input"
                        value={transferData.reference}
                        onChange={(e) => setTransferData({...transferData, reference: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary w-full"
                  >
                    CONFIRM MOVEMENT ORDER
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Warehouse Detail Slide-over Drawer */}
        <AnimatePresence>
          {selectedWarehouse && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedWarehouse(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div 
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.35 }}
                className="w-full max-w-xl bg-slate-950/95 border-l border-white/10 h-full relative z-10 p-6 md:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-xl"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setSelectedWarehouse(null)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white cursor-pointer"><X size={22} /></button>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                      selectedWarehouse.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {selectedWarehouse.status}
                    </span>
                  </div>

                  <h2 className="text-3xl font-black text-white tracking-tight uppercase break-words">{selectedWarehouse.name}</h2>
                  <p className="text-xs text-cyan-400 font-mono font-bold mt-1 mb-8">{selectedWarehouse.warehouseId}</p>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-white/2 rounded-2xl border border-white/5 mb-8 text-xs text-gray-400">
                    <div>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Manager</span>
                      <span className="text-white truncate block">{selectedWarehouse.managerName || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Contact</span>
                      <span className="text-white truncate block">{selectedWarehouse.contactNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Location</span>
                      <span className="text-white block">{selectedWarehouse.location || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Utilization Ratio</span>
                      <span className="text-white block font-bold">
                        {selectedWarehouse.currentStock} / {selectedWarehouse.capacity} Units ({selectedWarehouse.capacity > 0 ? Math.round((selectedWarehouse.currentStock / selectedWarehouse.capacity) * 100) : 0}%)
                      </span>
                    </div>
                    {selectedWarehouse.address && (
                      <div className="col-span-2 pt-2 border-t border-white/5">
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Facility Address</span>
                        <span className="text-white block">{selectedWarehouse.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Stock Allocations List */}
                  <div className="space-y-3 mb-8">
                    <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest block">Stored Product Inventory</span>
                    {(!selectedWarehouse.products || selectedWarehouse.products.length === 0) ? (
                      <p className="text-xs text-gray-500 italic py-4">No products currently stored here.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[22vh] overflow-y-auto pr-1 scrollbar-hide">
                        {selectedWarehouse.products.map((p: any) => (
                          <div key={p._id} className="p-4 bg-white/2 border border-white/5 rounded-2xl flex flex-col justify-between gap-1 text-xs">
                            <div className="flex justify-between items-start">
                              <span className="text-white font-bold truncate pr-2 text-sm">{p.productId?.name || 'Catalog Item'}</span>
                              <span className={`font-black px-2 py-0.5 rounded ${p.stock <= 5 ? 'bg-rose-500/10 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                                {p.stock} units
                              </span>
                            </div>
                            {p.productId?.supplierId && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                                <Truck size={10} className="text-cyan-400 shrink-0" />
                                <span>Supplied by: <strong className="text-gray-400">{p.productId.supplierId.name}</strong></span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Movements Ledger for this warehouse */}
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide pt-4 border-t border-white/5 space-y-4">
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest block">Movement ledger logs</span>
                  {movements.filter(m => 
                    m.warehouseId?._id === selectedWarehouse._id ||
                    m.sourceWarehouseId?._id === selectedWarehouse._id ||
                    m.destinationWarehouseId?._id === selectedWarehouse._id
                  ).length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-4">No movements recorded for this facility.</p>
                  ) : (
                    <div className="space-y-3 max-h-[22vh] overflow-y-auto pr-1 scrollbar-hide">
                      {movements.filter(m => 
                        m.warehouseId?._id === selectedWarehouse._id ||
                        m.sourceWarehouseId?._id === selectedWarehouse._id ||
                        m.destinationWarehouseId?._id === selectedWarehouse._id
                      ).map((m: any, idx: number) => {
                        const isSource = m.sourceWarehouseId?._id === selectedWarehouse._id;
                        const isDest = m.destinationWarehouseId?._id === selectedWarehouse._id;
                        
                        let directionLabel = m.type;
                        let directionStyle = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';

                        if (m.type === 'TRANSFER') {
                          if (isSource) {
                            directionLabel = 'TRANSFER OUT';
                            directionStyle = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                          } else if (isDest) {
                            directionLabel = 'TRANSFER IN';
                            directionStyle = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                          }
                        } else if (m.type === 'INCOMING') {
                          directionStyle = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                        } else if (m.type === 'OUTGOING') {
                          directionStyle = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                        }

                        return (
                          <div key={idx} className="p-3.5 bg-white/2 border border-white/5 rounded-2xl text-xs space-y-1 hover:bg-white/5 transition-all">
                            <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${directionStyle}`}>
                                {directionLabel}
                              </span>
                              <span>{format(new Date(m.createdAt), 'MMM dd, hh:mm a')}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-1">
                              <div>
                                <span className="text-white font-bold block">{m.productId?.name || 'Catalog Item'}</span>
                                {m.productId?.supplierId && (
                                  <span className="text-[9px] text-gray-500 block">Supplied by: {m.productId.supplierId.name}</span>
                                )}
                              </div>
                              <span className={`font-black text-sm shrink-0 ${directionLabel.includes('OUT') || m.type === 'OUTGOING' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {directionLabel.includes('OUT') || m.type === 'OUTGOING' ? '-' : '+'}{m.quantity} Units
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-gray-500 pt-1 border-t border-white/5">
                              <span>Ref: {m.reference || 'None'}</span>
                              <span className="text-cyan-400">@{m.performedBy || 'System'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Increase Capacity Modal */}
        <AnimatePresence>
          {isCapacityModalOpen && capacityTarget && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCapacityModalOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10 border border-white/10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <TrendingUp size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white tracking-tight uppercase">Increase Capacity</h2>
                      <p className="text-[10px] text-gray-500 font-bold mt-0.5">{capacityTarget.name} · {capacityTarget.warehouseId}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsCapacityModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={20} /></button>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mb-6 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Current Capacity</p>
                    <p className="text-2xl font-black text-white">{capacityTarget.capacity || 0} <span className="text-xs text-gray-500">units</span></p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Current Stock</p>
                    <p className="text-2xl font-black text-cyan-400">{capacityTarget.currentStock || 0} <span className="text-xs text-gray-500">used</span></p>
                  </div>
                </div>

                <form onSubmit={handleIncreaseCapacity} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Add Capacity Units *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 500"
                      className="w-full glass-input font-bold text-lg"
                      value={capacityAddAmount || ''}
                      onChange={(e) => setCapacityAddAmount(Math.max(0, Number(e.target.value) || 0))}
                    />
                    {capacityAddAmount > 0 && (
                      <p className="text-[10px] text-emerald-400 font-bold ml-1 mt-1">
                        New total: {(capacityTarget.capacity || 0) + capacityAddAmount} units
                      </p>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={capacityLoading || capacityAddAmount <= 0}
                    className="btn-primary w-full"
                  >
                    {capacityLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Updating...</>
                    ) : (
                      <><TrendingUp size={16} /> Increase by {capacityAddAmount || '...'} Units</>
                    )}
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
