'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Loader2, X, Edit2, Trash2, Search, Filter, AlertCircle, BarChart2, PieChart, Truck, Warehouse as WarehouseIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/components/CurrencyContext';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';
import { getInventoryValue, defaultCostCalcType } from '@/lib/inventoryValue';

import ProductDetailModal from '@/components/ProductDetailModal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionButtons } from '@/components/ui/ActionButtons';

const PREDEFINED_VARIANTS = [
  '200ml',
  '500ml',
  '1 Liter',
  'Small',
  'Medium',
  'Large'
];

const UNIT_OPTIONS = [
  { value: 'ML', label: 'Milliliters (ML)' },
  { value: 'LITER', label: 'Liters (L)' },
  { value: 'GRAM', label: 'Grams (G)' },
  { value: 'KILOGRAM', label: 'Kilograms (KG)' },
  { value: 'PIECE', label: 'Pieces (Piece)' },
  { value: 'BOTTLE', label: 'Bottles (Bottle)' },
  { value: 'BOX', label: 'Boxes (Box)' },
  { value: 'PACK', label: 'Packs (Pack)' },
  { value: 'CARTON', label: 'Cartons (Carton)' },
  { value: 'OTHER', label: 'Other' }
];

export default function ProductsPage() {
  const { formatPrice } = useCurrency();
  const { isAdmin } = useUser();
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({ 
    name: '', 
    sku: '', 
    category: '', 
    stock: 0, 
    costPrice: 0, 
    sellingPrice: 0, 
    image: '', 
    unit: 'UNIT',
    supplierId: '',
    type: 'STANDARD',
    parent_id: '',
    conversion_quantity: 0,
    costCalculationType: 'PER_UNIT' as string
  });

  const [supplierPaymentInfo, setSupplierPaymentInfo] = useState({
    enabled: false,
    purchaseAmount: 0,
    amountPaid: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    transactionId: '',
    paymentMethod: 'CASH',
    notes: '',
    receiptImage: ''
  });

  const [formAllocations, setFormAllocations] = useState<Array<{ warehouseId: string, quantity: number }>>([]);
  const [formVariants, setFormVariants] = useState<any[]>([]);
  const [customVariantName, setCustomVariantName] = useState('');

  const fetchProducts = async () => {
    try {
      const [productsData, suppliersData, warehousesData] = await Promise.all([
        fetchWithAuth('/products'),
        fetchWithAuth('/suppliers').catch(() => []),
        fetchWithAuth('/warehouses').catch(() => [])
      ]);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setSuppliers(suppliersData);
      setWarehouses(warehousesData);
    } catch (error) { 
      toast.error('Failed to fetch product assets'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchProducts(); 
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredProducts(
      products.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.sku?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, products]);

  // Auto-calculate child product stock whenever parent or conversion_quantity changes
  useEffect(() => {
    if (formData.type !== 'CHILD') return;
    const parent = products.find(p => p._id === formData.parent_id || p.id === formData.parent_id);
    if (parent && formData.conversion_quantity > 0) {
      const derived = Math.floor((parent.stock || 0) / formData.conversion_quantity);
      setFormData(prev => ({ ...prev, stock: derived }));
    } else {
      setFormData(prev => ({ ...prev, stock: 0 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.parent_id, formData.conversion_quantity, formData.type, products]);

  const addVariant = (variantName: string) => {
    // Avoid duplicate variant names in the form
    if (formVariants.some(v => v.name.toLowerCase() === variantName.toLowerCase())) {
      toast.error('A variant with this name already exists');
      return;
    }
    setFormVariants([...formVariants, {
      name: variantName,
      sku: '',
      costPrice: formData.costPrice || 0,
      sellingPrice: formData.sellingPrice || 0,
      stock: 0,
      unit: 'PIECE',
      supplierId: formData.supplierId || '',
      allocations: []
    }]);
  };

  const removeVariant = (index: number) => {
    setFormVariants(formVariants.filter((_, i) => i !== index));
  };

  const updateVariantField = (index: number, field: string, value: any) => {
    const updated = [...formVariants];
    updated[index][field] = value;
    setFormVariants(updated);
  };

  const addVariantAllocation = (vIdx: number) => {
    const updated = [...formVariants];
    updated[vIdx].allocations = [...(updated[vIdx].allocations || []), { warehouseId: '', quantity: 0 }];
    setFormVariants(updated);
  };

  const removeVariantAllocation = (vIdx: number, aIdx: number) => {
    const updated = [...formVariants];
    updated[vIdx].allocations = updated[vIdx].allocations.filter((_: any, i: number) => i !== aIdx);
    setFormVariants(updated);
  };

  const updateVariantAllocation = (vIdx: number, aIdx: number, field: string, value: any) => {
    const updated = [...formVariants];
    updated[vIdx].allocations[aIdx][field] = value;
    setFormVariants(updated);
  };

  const totalAllocated = formAllocations.reduce((sum, item) => sum + item.quantity, 0);
  const allocationsMatch = formData.type === 'CHILD' || formData.stock === 0 || totalAllocated === formData.stock;

  const isVariantsAllocationValid = () => {
    if (formVariants.length === 0) return true;
    for (const v of formVariants) {
      if (v.stock > 0) {
        const vAllocTotal = (v.allocations || []).reduce((sum: number, a: any) => sum + (Number(a.quantity) || 0), 0);
        if (vAllocTotal !== v.stock) return false;
      }
    }
    return true;
  };

  const isChildValid = formData.type === 'CHILD' ? {
    hasParent: !!formData.parent_id,
    hasConsumption: formData.conversion_quantity > 0,
    hasSupplier: !!formData.supplierId,
    hasStock: formData.stock >= 0,
    hasCostPrice: formData.costPrice !== undefined && formData.costPrice !== null && formData.costPrice.toString() !== '',
    hasSellingPrice: formData.sellingPrice !== undefined && formData.sellingPrice !== null && formData.sellingPrice.toString() !== '',
    hasSku: !!formData.sku
  } : null;

  const isChildFormReady = isChildValid ? Object.values(isChildValid).every(Boolean) : false;
  const disabledCondition = loading;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // 1. General Fields
    if (!formData.name || formData.name.trim() === '') {
      newErrors['name'] = 'Product Name is required';
    }

    // 2. Child product validation
    if (formData.type === 'CHILD') {
      if (!formData.parent_id) {
        newErrors['parent_id'] = 'Parent Product is required';
      }
      if (formData.conversion_quantity <= 0) {
        newErrors['conversion_quantity'] = 'Consumption Quantity must be greater than zero';
      }
      if (!formData.supplierId) {
        newErrors['supplierId'] = 'Supplier Source is required';
      }
      if (formData.costPrice === undefined || formData.costPrice === null || formData.costPrice.toString().trim() === '') {
        newErrors['costPrice'] = 'Cost Price is required';
      } else if (Number(formData.costPrice) < 0) {
        newErrors['costPrice'] = 'Cost Price cannot be negative';
      }
      if (formData.sellingPrice === undefined || formData.sellingPrice === null || formData.sellingPrice.toString().trim() === '') {
        newErrors['sellingPrice'] = 'Selling Price is required';
      } else if (Number(formData.sellingPrice) < 0) {
        newErrors['sellingPrice'] = 'Selling Price cannot be negative';
      }
      if (!formData.sku || formData.sku.trim() === '') {
        newErrors['sku'] = 'SKU is required for child products';
      }
    } else {
      // 3. Parent or Standard Product validation
      if (formVariants.length > 0) {
        // Variant Validation
        formVariants.forEach((v, vIdx) => {
          if (!v.name || v.name.trim() === '') {
            newErrors[`variant-${vIdx}-name`] = `Variant #${vIdx + 1} name is required`;
          }
          if (v.costPrice === undefined || v.costPrice === null || v.costPrice.toString().trim() === '') {
            newErrors[`variant-${vIdx}-costPrice`] = `Cost Price is required for variant "${v.name || vIdx + 1}"`;
          } else if (Number(v.costPrice) < 0) {
            newErrors[`variant-${vIdx}-costPrice`] = `Cost Price cannot be negative for variant "${v.name || vIdx + 1}"`;
          }
          if (v.sellingPrice === undefined || v.sellingPrice === null || v.sellingPrice.toString().trim() === '') {
            newErrors[`variant-${vIdx}-sellingPrice`] = `Selling Price is required for variant "${v.name || vIdx + 1}"`;
          } else if (Number(v.sellingPrice) < 0) {
            newErrors[`variant-${vIdx}-sellingPrice`] = `Selling Price cannot be negative for variant "${v.name || vIdx + 1}"`;
          }
          if (v.stock === undefined || v.stock === null || v.stock.toString().trim() === '') {
            newErrors[`variant-${vIdx}-stock`] = `Received Stock Qty is required for variant "${v.name || vIdx + 1}"`;
          } else if (Number(v.stock) < 0) {
            newErrors[`variant-${vIdx}-stock`] = `Stock cannot be negative for variant "${v.name || vIdx + 1}"`;
          }
          if (!v.supplierId) {
            newErrors[`variant-${vIdx}-supplierId`] = `Supplier Source is required for variant "${v.name || vIdx + 1}"`;
          }
          // Warehouse allocations for variant if stock > 0
          if (Number(v.stock) > 0) {
            if (!v.allocations || v.allocations.length === 0) {
              newErrors[`variant-${vIdx}-allocations`] = `Please add at least one warehouse row to allocate variant "${v.name || vIdx + 1}" stock`;
            } else {
              const vAllocTotal = v.allocations.reduce((sum: number, a: any) => sum + (Number(a.quantity) || 0), 0);
              if (vAllocTotal !== Number(v.stock)) {
                newErrors[`variant-${vIdx}-allocations`] = `Allocated stock (${vAllocTotal}) does not match received quantity (${v.stock}) for variant "${v.name || vIdx + 1}"`;
              }
              v.allocations.forEach((alloc: any, aIdx: number) => {
                if (!alloc.warehouseId) {
                  newErrors[`variant-${vIdx}-allocation-${aIdx}-warehouse`] = `Select Warehouse for variant "${v.name || vIdx + 1}" allocation #${aIdx + 1}`;
                }
                if (!alloc.quantity || Number(alloc.quantity) <= 0) {
                  newErrors[`variant-${vIdx}-allocation-${aIdx}-quantity`] = `Quantity must be greater than zero for variant "${v.name || vIdx + 1}" allocation #${aIdx + 1}`;
                }
              });
            }
          }
        });
      } else {
        // Standard Product Validation (no variants)
        if (formData.stock === undefined || formData.stock === null || formData.stock.toString().trim() === '') {
          newErrors['stock'] = 'Received Stock Level is required';
        } else if (Number(formData.stock) < 0) {
          newErrors['stock'] = 'Stock level cannot be negative';
        }
        if (!formData.supplierId) {
          newErrors['supplierId'] = 'Supplier Source is required';
        }
        if (!formData.unit) {
          newErrors['unit'] = 'Unit of Measure is required';
        }
        if (formData.costPrice === undefined || formData.costPrice === null || formData.costPrice.toString().trim() === '') {
          newErrors['costPrice'] = 'Cost Price is required';
        } else if (Number(formData.costPrice) < 0) {
          newErrors['costPrice'] = 'Cost Price cannot be negative';
        }
        if (formData.sellingPrice === undefined || formData.sellingPrice === null || formData.sellingPrice.toString().trim() === '') {
          newErrors['sellingPrice'] = 'Selling Price is required';
        } else if (Number(formData.sellingPrice) < 0) {
          newErrors['sellingPrice'] = 'Selling Price cannot be negative';
        }
        // Warehouse allocations for standard if stock > 0
        if (Number(formData.stock) > 0) {
          if (!formAllocations || formAllocations.length === 0) {
            newErrors['allocations'] = 'Please add at least one warehouse row to allocate the stock';
          } else {
            const totalAllocated = formAllocations.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
            if (totalAllocated !== Number(formData.stock)) {
              newErrors['allocations'] = `Allocated stock (${totalAllocated}) does not match received quantity (${formData.stock})`;
            }
            formAllocations.forEach((alloc, aIdx) => {
              if (!alloc.warehouseId) {
                newErrors[`allocation-${aIdx}-warehouse`] = `Select Warehouse for allocation #${aIdx + 1}`;
              }
              if (!alloc.quantity || Number(alloc.quantity) <= 0) {
                newErrors[`allocation-${aIdx}-quantity`] = `Quantity must be greater than zero for allocation #${aIdx + 1}`;
              }
            });
          }
        }
      }
    }

    // 4. Supplier Payment tracking validation
    if (supplierPaymentInfo.enabled && !editingProduct) {
      if (Number(supplierPaymentInfo.purchaseAmount) <= 0) {
        newErrors['supplierPayment-purchaseAmount'] = 'Purchase amount must be greater than zero when payment tracking is enabled';
      }
      if (Number(supplierPaymentInfo.amountPaid) < 0) {
        newErrors['supplierPayment-amountPaid'] = 'Amount paid cannot be negative';
      }
      if (Number(supplierPaymentInfo.amountPaid) > Number(supplierPaymentInfo.purchaseAmount)) {
        newErrors['supplierPayment-amountPaid'] = 'Amount paid cannot exceed total purchase amount';
      }
      if (!formData.supplierId) {
        newErrors['supplierId'] = 'Please select a Supplier Source to track supplier payment';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    // 1. Log form values before submit
    console.log("[FORM SUBMIT] Form values before validation:", {
      formData,
      formVariants,
      formAllocations,
      supplierPaymentInfo
    });

    // 2. Perform validation audit
    const validationErrors = validateForm();
    
    // Log validation results
    console.log("[FORM SUBMIT] Validation results:", {
      isValid: Object.keys(validationErrors).length === 0,
      errors: validationErrors
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      const firstErrorKey = Object.keys(validationErrors)[0];
      const errorMessage = validationErrors[firstErrorKey];
      
      // Display a toast explaining why submission failed
      toast.error(`Submission failed: ${errorMessage}`);

      // Automatically scroll to the first invalid field
      setTimeout(() => {
        const errorElement = document.getElementById(`field-${firstErrorKey}`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (errorElement.tagName === 'INPUT' || errorElement.tagName === 'SELECT') {
            errorElement.focus();
          }
        }
      }, 50);
      return;
    }

    // Clear validation errors if valid
    setErrors({});

    setLoading(true);
    
    const payload = editingProduct 
      ? { ...formData, id: editingProduct._id, allocations: formAllocations, variants: formVariants }
      : { 
          ...formData, 
          allocations: formAllocations, 
          variants: formVariants,
          supplierPaymentInfo: supplierPaymentInfo.enabled ? {
            supplierId: formData.supplierId,
            purchaseAmount: supplierPaymentInfo.purchaseAmount,
            amountPaid: supplierPaymentInfo.amountPaid,
            paymentDate: supplierPaymentInfo.paymentDate,
            dueDate: supplierPaymentInfo.dueDate,
            transactionId: supplierPaymentInfo.transactionId,
            paymentMethod: supplierPaymentInfo.paymentMethod,
            notes: supplierPaymentInfo.notes,
            receiptImage: supplierPaymentInfo.receiptImage
          } : undefined
        };

    // 3. Log API request payload
    console.log("[FORM SUBMIT] API request payload:", payload);

    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const response = await fetchWithAuth('/products', { 
        method, 
        body: JSON.stringify(payload) 
      });
      
      // 4. Log API response
      console.log("[FORM SUBMIT] API response success:", response);
      
      toast.success(editingProduct ? 'Product inventory updated' : 'Product successfully added');
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ 
        name: '', 
        sku: '', 
        category: '', 
        stock: 0, 
        costPrice: 0, 
        sellingPrice: 0, 
        image: '', 
        unit: 'UNIT', 
        supplierId: '',
        type: 'STANDARD',
        parent_id: '',
        conversion_quantity: 0,
        costCalculationType: 'PER_UNIT'
      });
      setSupplierPaymentInfo({
        enabled: false,
        purchaseAmount: 0,
        amountPaid: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        transactionId: '',
        paymentMethod: 'CASH',
        notes: '',
        receiptImage: ''
      });
      setFormAllocations([]);
      setFormVariants([]);
      fetchProducts();
    } catch (error: any) { 
      // 5. Log any caught exceptions
      console.error("[FORM SUBMIT] Submission failed with exception:", error);
      // Display the exact error message returned by backend
      toast.error(error.message || 'An unexpected error occurred during submission'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetchWithAuth('/products', { method: 'DELETE', body: JSON.stringify({ id }) });
      toast.success('Product removed from inventory');
      fetchProducts();
    } catch (error: any) { 
      toast.error(error.message); 
    }
  };

  const totalInventoryValue = products.reduce((sum, p) => {
    if (p.type === 'CHILD') return sum; // Skip child — stock is derived from parent
    if (p.variants && p.variants.length > 0) {
      return sum + p.variants.reduce((vs: number, v: any) => vs + getInventoryValue(v.stock, v.costPrice, 'PER_UNIT', v.unit), 0);
    }
    return sum + getInventoryValue(p.stock, p.costPrice, p.costCalculationType, p.unit);
  }, 0);
  const lowStockCount = products.filter(p => p.stock < (p.lowStockThreshold || 10)).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase">Inventory Control</h1>
            <p className="text-gray-400 font-medium">Monitor stock levels, pricing, and profit margins</p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => { 
                setEditingProduct(null); 
                setFormData({ 
                  name: '', 
                  sku: '', 
                  category: '', 
                  stock: 0, 
                  costPrice: 0, 
                  sellingPrice: 0, 
                  image: '', 
                  unit: 'UNIT',
                  supplierId: '',
                  type: 'STANDARD',
                  parent_id: '',
                  conversion_quantity: 0,
                  costCalculationType: 'PER_UNIT'
                }); 
                setSupplierPaymentInfo({
                  enabled: false,
                  purchaseAmount: 0,
                  amountPaid: 0,
                  paymentDate: new Date().toISOString().split('T')[0],
                  dueDate: new Date().toISOString().split('T')[0],
                  transactionId: '',
                  paymentMethod: 'CASH',
                  notes: '',
                  receiptImage: ''
                });
                setFormAllocations([]);
                setFormVariants([]);
                setErrors({});
                setIsModalOpen(true); 
              }} 
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Add Product</span>
            </button>
          )}
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                <BarChart2 size={24} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Value</p>
                <h3 className="text-2xl font-black">{formatPrice(totalInventoryValue)}</h3>
              </div>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/20">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Low Stock Items</p>
                <h3 className="text-2xl font-black text-amber-400">{lowStockCount} Products</h3>
              </div>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/20">
                <PieChart size={24} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Out of Stock</p>
                <h3 className="text-2xl font-black text-rose-400">{outOfStockCount} Products</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by product name, SKU, or category..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input pl-12 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Products Table (Desktop) */}
        <div className="hidden md:block">
          <Table gridTemplate="3fr 1fr 1.2fr 1.2fr 1fr 1fr 1.2fr">
            <TableHeader>
              <TableHead className="justify-center text-center">Product Information</TableHead>
              <TableHead className="justify-center text-center">Stock</TableHead>
              <TableHead className="justify-center text-center">Cost Price</TableHead>
              <TableHead className="justify-center text-center">Selling Price</TableHead>
              <TableHead className="justify-center text-center">Profit</TableHead>
              <TableHead className="justify-center text-center">Status</TableHead>
              <TableHead className="justify-center text-center">Actions</TableHead>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell className="justify-center py-20 w-full"><Loader2 className="animate-spin text-cyan-400 w-10 h-10" /></TableCell></TableRow>
              ) : filteredProducts.length > 0 ? filteredProducts.map((product) => {
                const profit = product.sellingPrice - product.costPrice;
                const margin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;
                const isLow = product.stock < (product.lowStockThreshold || 10);
                const isOut = product.stock === 0;

                return (
                  <TableRow 
                    key={product._id || product.id} 
                    onClick={() => setSelectedProduct(product)}
                  >
                    <TableCell className="justify-center text-center">
                      <div className="flex items-center gap-3 justify-center text-center w-full">
                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/5 overflow-hidden shrink-0">
                          {product.image ? (
                            <img src={product.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="text-gray-600 group-hover:text-cyan-400 transition-colors" size={20} />
                          )}
                        </div>
                        <div className="text-left shrink-0">
                          <p className="font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                            {product.name}
                            {product.type === 'PARENT' && (
                              <span className="text-[8px] font-black tracking-wider uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded">
                                Raw
                              </span>
                            )}
                            {product.type === 'CHILD' && (
                              <span className="text-[8px] font-black tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                Child
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{product.sku || 'NO-SKU'}</span>
                            {product.variants && product.variants.length > 0 ? (
                              <span className="text-[10px] text-indigo-400 font-bold">
                                • {product.variants.length} packaging options
                              </span>
                            ) : product.type === 'CHILD' && product.parent_id ? (
                              <span className="text-[10px] text-gray-400 font-bold">
                                • Parent: {products.find(p => p._id === product.parent_id || p.id === product.parent_id)?.name || 'Bulk Link'}
                              </span>
                            ) : product.supplierId ? (
                              (() => {
                                const sId = product.supplierId._id || product.supplierId.id || product.supplierId;
                                const supplierObj = suppliers.find(s => s._id === sId || s.id === sId);
                                const supplierName = supplierObj ? supplierObj.name : (product.supplierId.name || '');
                                if (!supplierName) return null;
                                return (
                                  <span className="text-[10px] text-cyan-400 font-bold">
                                    • Supplied by: {supplierName}
                                  </span>
                                );
                              })()
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="justify-center text-center">
                      <div>
                        <p className={`text-sm font-black ${isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {product.stock}
                        </p>
                        <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{product.type === 'CHILD' ? 'Units' : (product.type === 'PARENT' && (product.unit === 'LITER' || product.unit === 'UNIT') ? 'L' : (product.unit === 'LITER' ? 'L' : (product.unit === 'UNIT' ? 'Units' : (product.unit || 'L'))))}</p>
                      </div>
                    </TableCell>
                    <TableCell className="justify-center text-center font-semibold text-white">
                      {formatPrice(product.costPrice)}
                    </TableCell>
                    <TableCell className="justify-center text-center font-bold text-white">
                      {formatPrice(product.sellingPrice)}
                    </TableCell>
                    <TableCell className="justify-center text-center">
                      <div className="flex flex-col items-center justify-center gap-1 text-center">
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded border border-emerald-500/20">
                          +{margin.toFixed(1)}%
                        </span>
                        <span className="text-xs font-bold text-emerald-500">+{formatPrice(profit)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="justify-center text-center">
                      <StatusBadge status={isOut ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK'} />
                    </TableCell>
                    <TableCell className="justify-center text-center">
                      <ActionButtons 
                        actions={[
                          {
                            type: 'edit',
                            onClick: (e) => {
                              e.stopPropagation();
                              setEditingProduct(product);
                              setFormData({ 
                                name: product.name, 
                                sku: product.sku || '', 
                                category: product.category || '', 
                                stock: product.stock, 
                                costPrice: product.costPrice, 
                                sellingPrice: product.sellingPrice,
                                image: product.image || '',
                                unit: product.unit || 'UNIT',
                                supplierId: product.supplierId?._id || product.supplierId || '',
                                type: product.type || 'STANDARD',
                                parent_id: product.parent_id?._id || product.parent_id || '',
                                conversion_quantity: product.conversion_quantity || 0,
                                costCalculationType: product.costCalculationType || defaultCostCalcType(product.unit || 'UNIT')
                              });
                              
                              // Pre-populate allocations for normal product
                              const currentAllocations: any[] = [];
                              warehouses.forEach(wh => {
                                const found = (wh.products || []).find((p: any) => p.productId?._id === product._id || p.productId === product._id);
                                if (found && !found.variantId) {
                                  currentAllocations.push({
                                    warehouseId: wh._id,
                                    quantity: found.stock
                                  });
                                }
                              });
                              setFormAllocations(currentAllocations);

                              // Pre-populate variants
                              if (product.variants && product.variants.length > 0) {
                                const loadedVariants = product.variants.map((v: any) => {
                                  const allocs: any[] = [];
                                  warehouses.forEach(wh => {
                                    const match = (wh.products || []).find((wp: any) => 
                                      (wp.productId?._id === product._id || wp.productId === product._id) && 
                                      wp.variantId === v._id
                                    );
                                    if (match) {
                                      allocs.push({
                                        warehouseId: wh._id,
                                        quantity: match.stock
                                      });
                                    }
                                  });
                                  return {
                                    _id: v._id,
                                    name: v.name,
                                    sku: v.sku || '',
                                    costPrice: v.costPrice,
                                    sellingPrice: v.sellingPrice,
                                    stock: v.stock,
                                    unit: v.unit || 'PIECE',
                                    supplierId: v.supplierId?._id || v.supplierId || '',
                                    allocations: allocs
                                  };
                                });
                                setFormVariants(loadedVariants);
                              } else {
                                setFormVariants([]);
                              }
                              setErrors({});
                              setIsModalOpen(true);
                            }
                          },
                          ...(isAdmin ? [{
                            type: 'delete' as 'delete',
                            onClick: (e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleDelete(product._id || product.id);
                            }
                          }] : [])
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell className="justify-center py-20 w-full text-gray-500 italic">No products found in your inventory</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Product Cards (Mobile) */}
        <div className="block md:hidden space-y-4">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400 w-10 h-10" /></div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const profit = product.sellingPrice - product.costPrice;
              const margin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;
              const isLow = product.stock < (product.lowStockThreshold || 10);
              const isOut = product.stock === 0;

              return (
                <div 
                  key={product._id || product.id} 
                  onClick={() => setSelectedProduct(product)}
                  className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4 cursor-pointer hover:border-cyan-500/20 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 overflow-hidden shrink-0">
                      {product.image ? (
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="text-gray-600" size={24} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate text-sm flex items-center gap-1.5">
                        {product.name}
                        {product.type === 'PARENT' && (
                          <span className="text-[7px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1 rounded">
                            Raw
                          </span>
                        )}
                        {product.type === 'CHILD' && (
                          <span className="text-[7px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1 rounded">
                            Child
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                        {product.sku || 'NO-SKU'}
                        {product.type === 'CHILD' && product.parent_id && ` • Parent: ${products.find(p => p._id === product.parent_id || p.id === product.parent_id)?.name || 'Bulk'}`}
                      </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-wider ${
                      isOut ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      isLow ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {isOut ? 'OUT' : isLow ? 'LOW' : 'IN'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5 text-xs">
                    <div>
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">Stock</p>
                      <p className={`font-bold mt-0.5 ${isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {product.stock} {product.type === 'CHILD' ? 'Units' : (product.type === 'PARENT' && (product.unit === 'LITER' || product.unit === 'UNIT') ? 'L' : (product.unit === 'LITER' ? 'L' : (product.unit === 'UNIT' ? 'Units' : (product.unit || 'L'))))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">Cost / Price</p>
                      <p className="font-bold text-gray-300 mt-0.5">
                        {formatPrice(product.costPrice)} / {formatPrice(product.sellingPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">Margin</p>
                       <p className="font-bold text-emerald-400 mt-0.5">
                         +{margin.toFixed(1)}%
                       </p>
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setEditingProduct(product);
                        setFormData({
                          name: product.name,
                          sku: product.sku || '',
                          category: product.category || '',
                          stock: product.stock,
                          costPrice: product.costPrice,
                          sellingPrice: product.sellingPrice,
                          image: product.image || '',
                          unit: product.unit || 'UNIT',
                          supplierId: product.supplierId?._id || product.supplierId || '',
                          type: product.type || 'STANDARD',
                          parent_id: product.parent_id?._id || product.parent_id || '',
                          conversion_quantity: product.conversion_quantity || 0,
                          costCalculationType: product.costCalculationType || defaultCostCalcType(product.unit || 'UNIT')
                        });
                        
                        // Pre-populate allocations
                        const currentAllocations: any[] = [];
                        warehouses.forEach(wh => {
                          const found = (wh.products || []).find((p: any) => p.productId?._id === product._id || p.productId === product._id);
                          if (found && !found.variantId) {
                            currentAllocations.push({
                              warehouseId: wh._id,
                              quantity: found.stock
                            });
                          }
                        });
                        setFormAllocations(currentAllocations);

                        // Pre-populate variants
                        if (product.variants && product.variants.length > 0) {
                          const loadedVariants = product.variants.map((v: any) => {
                            const allocs: any[] = [];
                            warehouses.forEach(wh => {
                              const match = (wh.products || []).find((wp: any) => 
                                (wp.productId?._id === product._id || wp.productId === product._id) && 
                                wp.variantId === v._id
                              );
                              if (match) {
                                allocs.push({
                                  warehouseId: wh._id,
                                  quantity: match.stock
                                });
                              }
                            });
                            return {
                              _id: v._id,
                              name: v.name,
                              sku: v.sku || '',
                              costPrice: v.costPrice,
                              sellingPrice: v.sellingPrice,
                              stock: v.stock,
                              unit: v.unit || 'PIECE',
                              supplierId: v.supplierId?._id || v.supplierId || '',
                              allocations: allocs
                            };
                          });
                          setFormVariants(loadedVariants);
                        } else {
                          setFormVariants([]);
                        }
                        setErrors({});
                        setIsModalOpen(true);
                      }}
                      className="btn-action-edit"
                      title="Edit Product"
                    >
                      <Edit2 size={22} />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDelete(product._id || product.id)}
                        className="btn-action-delete"
                        title="Delete Product"
                      >
                        <Trash2 size={22} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass-panel p-10 text-center text-gray-500 italic text-sm font-bold uppercase tracking-widest border border-white/5">
              No products found
            </div>
          )}
        </div>

        {/* Product Detail Modal */}
        <AnimatePresence>
          {selectedProduct && (
            <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
          )}
        </AnimatePresence>

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-panel w-full max-w-4xl p-10 rounded-2xl relative z-10 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">{editingProduct ? 'Update Product Profile' : 'Register New Product'}</h2>
                    <p className="text-xs text-gray-500 mt-1">Specify source supplier, warehouse logistics, and packaging/variant configurations</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-all cursor-pointer"><X size={24} /></button>
                </div>
                
                <form onSubmit={handleSubmit} noValidate className="space-y-8">
                  {/* General Profile */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">General Product Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Product Name</label>
                        <input 
                          id="field-name"
                          placeholder="e.g. Toothpaste" 
                          required 
                          className={`w-full glass-input ${errors.name ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`} 
                          value={formData.name} 
                          onChange={(e) => {
                            setFormData({...formData, name: e.target.value});
                            if (errors.name) setErrors(prev => { const next = { ...prev }; delete next.name; return next; });
                          }} 
                        />
                        {errors.name && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors.name}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Category</label>
                        <input placeholder="e.g. Personal Care" className="w-full glass-input" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Image URL (Optional)</label>
                        <input placeholder="https://..." className="w-full glass-input" value={formData.image} onChange={(e) => setFormData({...formData, image: e.target.value})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Product Management Type</label>
                        <select
                          className="w-full glass-select text-xs font-bold cursor-pointer"
                          value={formData.type}
                          onChange={(e) => setFormData({
                            ...formData,
                            type: e.target.value,
                            ...(e.target.value !== 'CHILD' ? { parent_id: '', conversion_quantity: 0 } : {}),
                            // Auto-set costCalculationType default based on current unit when type changes
                            costCalculationType: defaultCostCalcType(formData.unit)
                          })}
                        >
                          <option value="STANDARD">Standard Product</option>
                          <option value="PARENT">Raw Material / Bulk Can (Parent)</option>
                      <option value="CHILD">Converted Sellable Product (Child)</option>
                        </select>
                      </div>

                      {formData.type === 'CHILD' && (
                        <>
                           <div className="space-y-1">
                             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Link Parent Product *</label>
                             <select
                               id="field-parent_id"
                               required
                               className={`w-full glass-select ${errors.parent_id ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                               value={formData.parent_id || ''}
                               onChange={(e) => {
                                 setFormData({...formData, parent_id: e.target.value});
                                 if (errors.parent_id) setErrors(prev => { const next = { ...prev }; delete next.parent_id; return next; });
                               }}
                             >
                               <option value="">Select Parent Product...</option>
                               {products.filter(p => p.type === 'PARENT').map(p => (
                                 <option key={p._id} value={p._id}>{p.name} ({p.stock} {p.unit} available)</option>
                               ))}
                             </select>
                             {errors.parent_id && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors.parent_id}</p>}
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Consumption Quantity per Child Unit *</label>
                             <input
                               id="field-conversion_quantity"
                               type="number"
                               step="any"
                               placeholder="e.g. 0.2 (Liters of parent)"
                               required
                               className={`w-full glass-input font-bold ${errors.conversion_quantity ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                               value={formData.conversion_quantity || ''}
                               onChange={(e) => {
                                 setFormData({...formData, conversion_quantity: e.target.value === '' ? 0 : parseFloat(e.target.value)});
                                 if (errors.conversion_quantity) setErrors(prev => { const next = { ...prev }; delete next.conversion_quantity; return next; });
                               }}
                             />
                             {errors.conversion_quantity && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors.conversion_quantity}</p>}
                             {(() => {
                               const parent = products.find(p => p._id === formData.parent_id || p.id === formData.parent_id);
                               if (parent && parent.unit === 'LITER' && formData.conversion_quantity > 0) {
                                 return <p className="text-[10px] text-cyan-400 font-bold mt-1 ml-1">{formData.conversion_quantity} Liter → {formData.conversion_quantity * 1000}ml</p>;
                               }
                               return null;
                             })()}
                           </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Product Variants Section */}
                  <div className="space-y-6 pt-6 border-t border-white/5">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Product Variants / Packaging Options</h3>
                      <p className="text-xs text-gray-500 mt-1">Create multiple configurations under this product catalog entry (e.g. size, pack, color)</p>
                    </div>

                    {/* Predefined Variant Buttons */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Quick Add Predefined Option:</span>
                      <div className="flex flex-wrap gap-2">
                        {PREDEFINED_VARIANTS.map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => addVariant(v)}
                            className="btn-secondary btn-sm"
                          >
                            + {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Variant Adder */}
                    <div className="flex gap-3 max-w-md items-center">
                      <input
                        type="text"
                        placeholder="Or enter custom variant (e.g. 750ml, Family Pack, Blue...)"
                        value={customVariantName}
                        onChange={(e) => setCustomVariantName(e.target.value)}
                        className="glass-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customVariantName.trim()) {
                            addVariant(customVariantName.trim());
                            setCustomVariantName('');
                          } else {
                            toast.error('Please enter a variant name');
                          }
                        }}
                        className="btn-primary shrink-0"
                      >
                        + Create Custom
                      </button>
                    </div>

                    {/* Form Variants Grid list */}
                    {formVariants.length > 0 ? (
                      <div className="space-y-6">
                        {formVariants.map((v, vIdx) => (
                          <div key={vIdx} className="bg-white/2 p-6 rounded-2xl border border-white/5 relative group hover:border-cyan-500/10 transition-all space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                              <h4 className="text-sm font-black text-cyan-400 uppercase tracking-wide">Variant: {v.name}</h4>
                              <button
                                type="button"
                                onClick={() => removeVariant(vIdx)}
                                className="p-2 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-500/10"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            {/* Variant parameters */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">SKU / Unique ID</label>
                                <input
                                  id={`field-variant-${vIdx}-sku`}
                                  type="text"
                                  placeholder="SKU-VAR-1"
                                  className={`w-full glass-input text-xs font-mono font-bold ${errors[`variant-${vIdx}-sku`] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                  value={v.sku}
                                  onChange={(e) => updateVariantField(vIdx, 'sku', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Cost Price *</label>
                                <input
                                  id={`field-variant-${vIdx}-costPrice`}
                                  type="number"
                                  step="0.01"
                                  required
                                  placeholder="0.00"
                                  className={`w-full glass-input text-xs font-bold ${errors[`variant-${vIdx}-costPrice`] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                  value={v.costPrice || ''}
                                  onChange={(e) => updateVariantField(vIdx, 'costPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                />
                                {errors[`variant-${vIdx}-costPrice`] && <p className="text-[9px] text-rose-400 font-bold mt-1 ml-1">{errors[`variant-${vIdx}-costPrice`]}</p>}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Selling Price *</label>
                                <input
                                  id={`field-variant-${vIdx}-sellingPrice`}
                                  type="number"
                                  step="0.01"
                                  required
                                  placeholder="0.00"
                                  className={`w-full glass-input text-xs font-bold text-cyan-400 ${errors[`variant-${vIdx}-sellingPrice`] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                  value={v.sellingPrice || ''}
                                  onChange={(e) => updateVariantField(vIdx, 'sellingPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                />
                                {errors[`variant-${vIdx}-sellingPrice`] && <p className="text-[9px] text-rose-400 font-bold mt-1 ml-1">{errors[`variant-${vIdx}-sellingPrice`]}</p>}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Received Stock Qty</label>
                                <input
                                  id={`field-variant-${vIdx}-stock`}
                                  type="number"
                                  required
                                  placeholder="0"
                                  className={`w-full glass-input text-xs font-bold ${errors[`variant-${vIdx}-stock`] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                  value={v.stock || ''}
                                  onChange={(e) => updateVariantField(vIdx, 'stock', e.target.value === '' ? 0 : parseInt(e.target.value))}
                                />
                                {errors[`variant-${vIdx}-stock`] && <p className="text-[9px] text-rose-400 font-bold mt-1 ml-1">{errors[`variant-${vIdx}-stock`]}</p>}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Unit Type</label>
                                <select
                                  id={`field-variant-${vIdx}-unit`}
                                  className="w-full glass-select text-xs font-bold cursor-pointer"
                                  value={v.unit}
                                  onChange={(e) => updateVariantField(vIdx, 'unit', e.target.value)}
                                >
                                  {UNIT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Supplier Source *</label>
                                <select
                                  id={`field-variant-${vIdx}-supplierId`}
                                  required
                                  className={`w-full glass-select ${errors[`variant-${vIdx}-supplierId`] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                  value={v.supplierId}
                                  onChange={(e) => updateVariantField(vIdx, 'supplierId', e.target.value)}
                                >
                                  <option value="">Select Supplier...</option>
                                  {suppliers.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} - {s.companyName}</option>
                                  ))}
                                </select>
                                {errors[`variant-${vIdx}-supplierId`] && <p className="text-[9px] text-rose-400 font-bold mt-1 ml-1">{errors[`variant-${vIdx}-supplierId`]}</p>}
                              </div>
                            </div>

                            {/* Nested Warehouse Allocations for Variant */}
                            {v.stock > 0 && (
                              <div className="space-y-3 pt-3 border-t border-white/5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Warehouse Allocation for {v.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => addVariantAllocation(vIdx)}
                                    className="btn-secondary btn-sm flex items-center gap-1"
                                  >
                                    <Plus size={10} />
                                    <span>Add Row</span>
                                  </button>
                                </div>

                                <div id={`field-variant-${vIdx}-allocations`} className="space-y-2">
                                  {errors[`variant-${vIdx}-allocations`] && (
                                    <p className="text-xs text-rose-400 font-bold flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                                      <AlertCircle size={12} className="shrink-0" />
                                      <span>{errors[`variant-${vIdx}-allocations`]}</span>
                                    </p>
                                  )}
                                  {(!v.allocations || v.allocations.length === 0) ? (
                                    <p className="text-[10px] text-amber-400/80 italic bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10">Please add at least one warehouse row to allocate this variant's stock.</p>
                                  ) : (
                                    v.allocations.map((alloc: any, aIdx: number) => (
                                      <div key={aIdx} className="flex gap-2 items-center flex-wrap md:flex-nowrap">
                                        <div className="flex-1 min-w-[150px]">
                                          <select
                                            id={`field-variant-${vIdx}-allocation-${aIdx}-warehouse`}
                                            required
                                            className={`w-full glass-select ${errors[`variant-${vIdx}-allocation-${aIdx}-warehouse`] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                            value={alloc.warehouseId}
                                            onChange={(e) => updateVariantAllocation(vIdx, aIdx, 'warehouseId', e.target.value)}
                                          >
                                            <option value="">Select Warehouse...</option>
                                            {warehouses.map(w => (
                                              <option key={w._id} value={w._id}>{w.name} ({w.location})</option>
                                            ))}
                                          </select>
                                          {errors[`variant-${vIdx}-allocation-${aIdx}-warehouse`] && <p className="text-[9px] text-rose-400 font-bold mt-0.5 ml-1">{errors[`variant-${vIdx}-allocation-${aIdx}-warehouse`]}</p>}
                                        </div>
                                        <div className="w-24">
                                          <input
                                            id={`field-variant-${vIdx}-allocation-${aIdx}-quantity`}
                                            type="number"
                                            required
                                            min="1"
                                            placeholder="Qty"
                                            className={`w-full glass-input font-bold ${errors[`variant-${vIdx}-allocation-${aIdx}-quantity`] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                            value={alloc.quantity || ''}
                                            onChange={(e) => updateVariantAllocation(vIdx, aIdx, 'quantity', Number(e.target.value) || 0)}
                                          />
                                          {errors[`variant-${vIdx}-allocation-${aIdx}-quantity`] && <p className="text-[9px] text-rose-400 font-bold mt-0.5 ml-1">{errors[`variant-${vIdx}-allocation-${aIdx}-quantity`]}</p>}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeVariantAllocation(vIdx, aIdx)}
                                          className="p-2.5 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 rounded-lg transition-all border border-transparent hover:border-rose-500/10 cursor-pointer"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* Validation Message */}
                                {v.stock > 0 && (
                                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider pt-1">
                                    <span className="text-gray-500">Allocated stock:</span>
                                    <span className={(v.allocations || []).reduce((sum: number, a: any) => sum + (Number(a.quantity) || 0), 0) === v.stock ? 'text-emerald-400' : 'text-rose-400'}>
                                      {(v.allocations || []).reduce((sum: number, a: any) => sum + (Number(a.quantity) || 0), 0)} / {v.stock}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No variants created. Add predefined or custom pack sizes above.</p>
                    )}
                  </div>

                  {/* Standard non-variant fallback fields (only show if NO variants exist) */}
                  {formVariants.length === 0 && (
                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Standard Base Product Parameters</h3>
                        <p className="text-[10px] text-gray-500">Specify pricing, stock, and supplier details for standard catalog item (no variants)</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">SKU / Model Number</label>
                            <input 
                              id="field-sku"
                              placeholder="Unique ID" 
                              className={`w-full glass-input font-mono font-bold ${errors.sku ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`} 
                              value={formData.sku} 
                              onChange={(e) => {
                                setFormData({...formData, sku: e.target.value});
                                if (errors.sku) setErrors(prev => { const next = { ...prev }; delete next.sku; return next; });
                              }} 
                            />
                            {errors.sku && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors.sku}</p>}
                          </div>
                          {formData.type === 'CHILD' ? (
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Received Stock Qty (Auto-Calculated)</label>
                              <div className="relative">
                                <input
                                  id="field-stock"
                                  type="number"
                                  readOnly
                                  className="w-full glass-input font-bold text-cyan-400 bg-white/3 cursor-not-allowed opacity-80"
                                  value={formData.stock}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-cyan-500 uppercase tracking-wider">Auto</div>
                              </div>
                              <p className="text-[10px] text-cyan-400/70 font-medium ml-1 mt-1">
                                {formData.parent_id && formData.conversion_quantity > 0
                                  ? `${products.find(p => p._id === formData.parent_id || p.id === formData.parent_id)?.stock || 0} ÷ ${formData.conversion_quantity} = ${formData.stock} units`
                                  : 'Calculated from Parent Stock ÷ Consumption Quantity'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Received Stock Level</label>
                              <input 
                                id="field-stock"
                                type="number" 
                                placeholder="0" 
                                required 
                                className={`w-full glass-input font-bold ${errors.stock ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                value={formData.stock || ''} 
                                onChange={(e) => {
                                  const newStock = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setFormData({...formData, stock: newStock});
                                  if (errors.stock || errors.allocations) setErrors(prev => { const next = { ...prev }; delete next.stock; delete next.allocations; return next; });
                                }} 
                              />
                              {errors.stock && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors.stock}</p>}
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Supplier Source *</label>
                            <select
                              id="field-supplierId"
                              required={formVariants.length === 0}
                              className={`w-full glass-select ${errors.supplierId ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                              value={formData.supplierId}
                              onChange={(e) => {
                                setFormData({...formData, supplierId: e.target.value});
                                if (errors.supplierId) setErrors(prev => { const next = { ...prev }; delete next.supplierId; return next; });
                              }}
                            >
                              <option value="">Select Supplier source...</option>
                              {suppliers.map(s => (
                                <option key={s._id} value={s._id}>{s.name} - {s.companyName}</option>
                              ))}
                            </select>
                            {errors.supplierId && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors.supplierId}</p>}
                            {formData.supplierId && (
                              <p className="text-[10px] text-cyan-400 font-bold ml-1 mt-1">
                                Supplied by: {suppliers.find(s => s._id === formData.supplierId)?.name || ''}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Unit of Measure</label>
                            <select 
                              id="field-unit"
                              className={`w-full glass-select ${errors.unit ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                              value={formData.unit}
                              onChange={(e) => {
                                const newUnit = e.target.value;
                                setFormData({
                                  ...formData,
                                  unit: newUnit,
                                  // Auto-suggest appropriate cost type when unit changes
                                  costCalculationType: defaultCostCalcType(newUnit)
                                });
                                if (errors.unit) setErrors(prev => { const next = { ...prev }; delete next.unit; return next; });
                              }}
                            >
                              <option value="UNIT">Pieces (Unit)</option>
                              <option value="KG">Kilograms (KG)</option>
                              <option value="GRAM">Grams (G)</option>
                              <option value="LITER">Liters (L)</option>
                              <option value="ML">Milliliters (ML)</option>
                            </select>
                            {errors.unit && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors.unit}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Cost Calculation Type — critical for correct inventory valuation */}
                      {formData.type !== 'CHILD' && (
                        <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-3">
                          <div>
                            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Inventory Valuation Method</h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">Choose how the Cost Price is interpreted for inventory valuation</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              formData.costCalculationType !== 'TOTAL_BATCH'
                                ? 'border-cyan-500/40 bg-cyan-500/8'
                                : 'border-white/10 bg-white/3 hover:bg-white/5'
                            }`}>
                              <input
                                type="radio"
                                className="mt-0.5 accent-cyan-400"
                                checked={formData.costCalculationType !== 'TOTAL_BATCH'}
                                onChange={() => setFormData({...formData, costCalculationType: 'PER_UNIT'})}
                              />
                              <div>
                                <p className="text-xs font-black text-white">Per Unit Cost</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Cost Price × Stock Qty</p>
                                <p className="text-[10px] text-gray-500">e.g. Bottles, Boxes, Pieces</p>
                              </div>
                            </label>
                            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              formData.costCalculationType === 'TOTAL_BATCH'
                                ? 'border-amber-500/40 bg-amber-500/8'
                                : 'border-white/10 bg-white/3 hover:bg-white/5'
                            }`}>
                              <input
                                type="radio"
                                className="mt-0.5 accent-amber-400"
                                checked={formData.costCalculationType === 'TOTAL_BATCH'}
                                onChange={() => setFormData({...formData, costCalculationType: 'TOTAL_BATCH'})}
                              />
                              <div>
                                <p className="text-xs font-black text-white">Total Batch Cost</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Cost Price = Total batch value</p>
                                <p className="text-[10px] text-gray-500">e.g. 1000L Oil bought for ₹10,000</p>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                            {formData.costCalculationType === 'TOTAL_BATCH'
                              ? 'Total Batch Cost (Purchase Price for entire stock)'
                              : 'Cost Price Per Unit (Purchase)'}
                          </label>
                          <input
                            id="field-costPrice"
                            type="number" step="0.01" placeholder="0.00"
                            required={formVariants.length === 0}
                            className={`w-full glass-input font-bold ${errors.costPrice ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                            value={formData.costPrice || ''}
                            onChange={(e) => {
                              setFormData({...formData, costPrice: e.target.value === '' ? 0 : parseFloat(e.target.value)});
                              if (errors.costPrice) setErrors(prev => { const next = { ...prev }; delete next.costPrice; return next; });
                            }}
                          />
                          {errors.costPrice && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors.costPrice}</p>}
                          {formData.costCalculationType === 'TOTAL_BATCH' && formData.costPrice > 0 && formData.stock > 0 && (
                            <p className="text-[10px] text-amber-400/80 font-medium ml-1 mt-1">
                              Effective per unit: ₹{(formData.costPrice / formData.stock).toFixed(2)} / {formData.unit || 'unit'}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Selling Price (Retail)</label>
                          <input 
                            id="field-sellingPrice"
                            type="number" step="0.01" placeholder="0.00" 
                            required={formVariants.length === 0} 
                            className={`w-full glass-input font-bold text-cyan-400 ${errors.sellingPrice ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`} 
                            value={formData.sellingPrice || ''} 
                            onChange={(e) => {
                              setFormData({...formData, sellingPrice: e.target.value === '' ? 0 : parseFloat(e.target.value)});
                              if (errors.sellingPrice) setErrors(prev => { const next = { ...prev }; delete next.sellingPrice; return next; });
                            }} 
                          />
                          {errors.sellingPrice && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors.sellingPrice}</p>}
                        </div>
                      </div>

                      {/* Warehouse allocations split manager (only for standard items) */}
                      {formData.type !== 'CHILD' && formData.stock > 0 && (
                        <div id="field-allocations" className="space-y-4 pt-6 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-wider">Warehouse Stock Allocation</h4>
                              <p className="text-[10px] text-gray-500">Split the {formData.stock} received quantity between storage facilities</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormAllocations([...formAllocations, { warehouseId: '', quantity: 0 }])}
                              className="btn-secondary btn-sm flex items-center gap-1"
                            >
                              <Plus size={12} />
                              <span>Add Row</span>
                            </button>
                          </div>

                          {errors.allocations && (
                            <p className="text-xs text-rose-400 font-bold flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl">
                              <AlertCircle size={14} className="shrink-0" />
                              <span>{errors.allocations}</span>
                            </p>
                          )}

                          <div className="space-y-3">
                            {formAllocations.length === 0 ? (
                              <p className="text-xs text-amber-400/80 italic bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10">Please add at least one warehouse row to allocate the stock.</p>
                            ) : (
                              formAllocations.map((alloc, idx) => (
                                <div key={idx} className="flex gap-3 items-center flex-wrap md:flex-nowrap">
                                  <div className="flex-1 min-w-[200px]">
                                    <select
                                      id={`field-allocation-${idx}-warehouse`}
                                      required
                                      className={`w-full glass-select ${errors[`allocation-${idx}-warehouse`] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                      value={alloc.warehouseId}
                                      onChange={(e) => {
                                        const updated = [...formAllocations];
                                        updated[idx].warehouseId = e.target.value;
                                        setFormAllocations(updated);
                                        setErrors(prev => {
                                          const next = { ...prev };
                                          delete next[`allocation-${idx}-warehouse`];
                                          delete next.allocations;
                                          return next;
                                        });
                                      }}
                                    >
                                      <option value="">Select Warehouse...</option>
                                      {warehouses.map(w => (
                                        <option key={w._id} value={w._id}>{w.name} ({w.location})</option>
                                      ))}
                                    </select>
                                    {errors[`allocation-${idx}-warehouse`] && <p className="text-[9px] text-rose-400 font-bold mt-0.5 ml-1">{errors[`allocation-${idx}-warehouse`]}</p>}
                                  </div>
                                  <div className="w-28">
                                    <input
                                      id={`field-allocation-${idx}-quantity`}
                                      type="number"
                                      required
                                      min="1"
                                      placeholder="Qty"
                                      className={`w-full glass-input font-bold ${errors[`allocation-${idx}-quantity`] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`}
                                      value={alloc.quantity || ''}
                                      onChange={(e) => {
                                        const updated = [...formAllocations];
                                        updated[idx].quantity = Number(e.target.value) || 0;
                                        setFormAllocations(updated);
                                        setErrors(prev => {
                                          const next = { ...prev };
                                          delete next[`allocation-${idx}-quantity`];
                                          delete next.allocations;
                                          return next;
                                        });
                                      }}
                                    />
                                    {errors[`allocation-${idx}-quantity`] && <p className="text-[9px] text-rose-400 font-bold mt-0.5 ml-1">{errors[`allocation-${idx}-quantity`]}</p>}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormAllocations(formAllocations.filter((_, i) => i !== idx));
                                      setErrors(prev => {
                                        const next = { ...prev };
                                        delete next.allocations;
                                        return next;
                                      });
                                    }}
                                    className="p-3 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 rounded-xl transition-all border border-transparent hover:border-rose-500/20 cursor-pointer"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-2 text-[10px] font-black uppercase tracking-wider">
                            <span className="text-gray-500">Total Allocated:</span>
                            <span className={allocationsMatch ? 'text-emerald-400' : 'text-rose-400'}>
                              {totalAllocated} / {formData.stock} {allocationsMatch && '✓'}
                            </span>
                          </div>

                          {!allocationsMatch && (
                            <p className="text-xs text-rose-400 font-bold flex items-center gap-1.5 mt-2 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl">
                              <AlertCircle size={14} className="shrink-0" />
                              <span>Allocated stock does not match received quantity</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Supplier Payment Tracking Section */}
                      {!editingProduct && (
                        <div className="pt-6 border-t border-white/5 space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                              checked={supplierPaymentInfo.enabled}
                              onChange={(e) => setSupplierPaymentInfo({ ...supplierPaymentInfo, enabled: e.target.checked })}
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-cyan-400 transition-colors">
                                Enable Supplier Payment / Debt Tracking
                              </span>
                              <span className="text-[10px] text-gray-500">
                                Automatically log purchase amount, amount paid, and due balance in Outstanding Payments
                              </span>
                            </div>
                          </label>

                          {supplierPaymentInfo.enabled && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Total Purchase Amount *</label>
                                  <input 
                                    id="field-supplierPayment-purchaseAmount"
                                    type="number" step="0.01" required placeholder="0.00" 
                                    className={`w-full glass-input text-xs font-bold ${errors['supplierPayment-purchaseAmount'] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`} 
                                    value={supplierPaymentInfo.purchaseAmount || ''} 
                                    onChange={(e) => {
                                      setSupplierPaymentInfo({ 
                                        ...supplierPaymentInfo, 
                                        purchaseAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) 
                                      });
                                      if (errors['supplierPayment-purchaseAmount']) setErrors(prev => { const next = { ...prev }; delete next['supplierPayment-purchaseAmount']; return next; });
                                    }} 
                                  />
                                  {errors['supplierPayment-purchaseAmount'] && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors['supplierPayment-purchaseAmount']}</p>}
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Amount Paid *</label>
                                  <input 
                                    id="field-supplierPayment-amountPaid"
                                    type="number" step="0.01" required placeholder="0.00" 
                                    className={`w-full glass-input text-xs font-bold ${errors['supplierPayment-amountPaid'] ? '!border-rose-500 ring-1 ring-rose-500/50' : ''}`} 
                                    value={supplierPaymentInfo.amountPaid || ''} 
                                    onChange={(e) => {
                                      setSupplierPaymentInfo({ 
                                        ...supplierPaymentInfo, 
                                        amountPaid: e.target.value === '' ? 0 : parseFloat(e.target.value) 
                                      });
                                      if (errors['supplierPayment-amountPaid']) setErrors(prev => { const next = { ...prev }; delete next['supplierPayment-amountPaid']; return next; });
                                    }} 
                                  />
                                  {errors['supplierPayment-amountPaid'] && <p className="text-[10px] text-rose-400 font-bold mt-1 ml-1">{errors['supplierPayment-amountPaid']}</p>}
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Remaining Balance</label>
                                  <div className="w-full glass-input text-xs font-mono font-bold bg-white/5 border border-white/5 flex items-center min-h-[42px] px-4 text-cyan-400">
                                    ₹{(supplierPaymentInfo.purchaseAmount - supplierPaymentInfo.amountPaid).toLocaleString()}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
                                  <select 
                                    className="w-full glass-select"
                                    value={supplierPaymentInfo.paymentMethod}
                                    onChange={(e) => setSupplierPaymentInfo({ ...supplierPaymentInfo, paymentMethod: e.target.value })}
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
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Date</label>
                                  <input 
                                    type="date" className="w-full glass-input text-xs font-bold" 
                                    value={supplierPaymentInfo.paymentDate} 
                                    onChange={(e) => setSupplierPaymentInfo({ ...supplierPaymentInfo, paymentDate: e.target.value })} 
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Due Date</label>
                                  <input 
                                    type="date" className="w-full glass-input text-xs font-bold text-rose-400" 
                                    value={supplierPaymentInfo.dueDate} 
                                    onChange={(e) => setSupplierPaymentInfo({ ...supplierPaymentInfo, dueDate: e.target.value })} 
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Transaction ID / Reference Number</label>
                                  <input 
                                    placeholder="Txn ID, Cheque Number etc." className="w-full glass-input text-xs" 
                                    value={supplierPaymentInfo.transactionId} 
                                    onChange={(e) => setSupplierPaymentInfo({ ...supplierPaymentInfo, transactionId: e.target.value })} 
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Receipt Reference / Link (Optional)</label>
                                  <input 
                                    placeholder="https://example.com/receipt.pdf" className="w-full glass-input text-xs" 
                                    value={supplierPaymentInfo.receiptImage} 
                                    onChange={(e) => setSupplierPaymentInfo({ ...supplierPaymentInfo, receiptImage: e.target.value })} 
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Notes</label>
                                <textarea 
                                  placeholder="E.g., Batch payment for inventory stock" rows={2} className="w-full glass-input text-xs p-3" 
                                  value={supplierPaymentInfo.notes} 
                                  onChange={(e) => setSupplierPaymentInfo({ ...supplierPaymentInfo, notes: e.target.value })} 
                                />
                              </div>

                              {/* Status Badge Info */}
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-gray-400">Payment Status:</span>
                                {(() => {
                                  const bal = supplierPaymentInfo.purchaseAmount - supplierPaymentInfo.amountPaid;
                                  if (bal <= 0) {
                                    return <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">Paid</span>;
                                  } else if (supplierPaymentInfo.amountPaid > 0) {
                                    return <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md">Partially Paid</span>;
                                  } else {
                                    return <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md">Debt / Unpaid</span>;
                                  }
                                })()}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Save Submit Button */}
                  <div className="pt-6">
                    {formData.type === 'CHILD' && isChildValid && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 text-xs">
                        <h4 className="font-bold text-white mb-2 uppercase tracking-wider">Validation Checklist</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className={isChildValid.hasParent ? "text-emerald-400" : "text-rose-400"}>
                            {isChildValid.hasParent ? "✓" : "✗"} Parent Product Selected
                          </div>
                          <div className={isChildValid.hasConsumption ? "text-emerald-400" : "text-rose-400"}>
                            {isChildValid.hasConsumption ? "✓" : "✗"} Consumption Quantity Valid
                          </div>
                          <div className={isChildValid.hasSupplier ? "text-emerald-400" : "text-rose-400"}>
                            {isChildValid.hasSupplier ? "✓" : "✗"} Supplier Selected
                          </div>
                          <div className={isChildValid.hasStock ? "text-emerald-400" : "text-rose-400"}>
                            {isChildValid.hasStock ? "✓" : "✗"} Auto Stock Calculated
                          </div>
                          <div className={isChildValid.hasCostPrice ? "text-emerald-400" : "text-rose-400"}>
                            {isChildValid.hasCostPrice ? "✓" : "✗"} Cost Price Entered
                          </div>
                          <div className={isChildValid.hasSellingPrice ? "text-emerald-400" : "text-rose-400"}>
                            {isChildValid.hasSellingPrice ? "✓" : "✗"} Selling Price Entered
                          </div>
                          <div className={isChildValid.hasSku ? "text-emerald-400" : "text-rose-400"}>
                            {isChildValid.hasSku ? "✓" : "✗"} SKU Entered
                          </div>
                        </div>
                      </div>
                    )}
                    <button 
                      type="submit" 
                      disabled={disabledCondition} 
                      className="w-full btn-primary"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : (editingProduct ? 'UPDATE INVENTORY PROFILE' : 'CONFIRM PRODUCT ADDITION')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
