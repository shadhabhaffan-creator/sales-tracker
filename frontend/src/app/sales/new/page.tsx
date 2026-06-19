'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useCurrency } from '@/components/CurrencyContext';
import { fetchWithAuth } from '@/services/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  Loader2, 
  ArrowLeft,
  User as UserIcon,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  Minus,
  CheckCircle2,
  Package,
  History,
  X,
  Clock,
  Landmark
} from 'lucide-react';

export default function NewSalePage() {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState('CASH');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pData, cData] = await Promise.all([
          fetchWithAuth('/products'),
          fetchWithAuth('/customers')
        ]);
        setProducts(pData);
        setCustomers(cData);
      } catch (error) {
        toast.error('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayProducts = products.flatMap(p => {
    if (p.variants && p.variants.length > 0) {
      return p.variants.map((v: any) => ({
        ...p,
        _id: `${p._id}_${v._id}`,
        productId: p._id,
        variantId: v._id,
        name: `${p.name} (${v.name})`,
        sellingPrice: v.sellingPrice,
        costPrice: v.costPrice,
        stock: v.stock,
        unit: v.unit || p.unit || 'UNIT',
        isVariant: true
      }));
    }
    return [{
      ...p,
      productId: p._id,
      variantId: null,
      isVariant: false
    }];
  });

  const filteredProducts = displayProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addToCart = (product: any) => {
    if (product.stock <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === product.productId && item.variantId === product.variantId
      );
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error('Insufficient stock available');
          return prev;
        }
        return prev.map(item => 
          (item.productId === product.productId && item.variantId === product.variantId)
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { 
        productId: product.productId, 
        variantId: product.variantId,
        name: product.name, 
        quantity: 1, 
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        unit: product.unit || 'UNIT'
      }];
    });
  };

  const removeFromCart = (productId: string, variantId: string | null) => {
    setCart(prev => prev.filter(item => 
      !(item.productId === productId && item.variantId === variantId)
    ));
  };

  const updateQuantity = (productId: string, variantId: string | null, value: string) => {
    const qty = parseFloat(value);
    setCart(prev => prev.map(item => {
      if (item.productId === productId && item.variantId === variantId) {
        if (isNaN(qty) || qty < 0) return { ...item, quantity: 0 };
        if (qty > item.stock) {
          toast.error('Insufficient stock');
          return { ...item, quantity: item.stock };
        }
        return { ...item, quantity: qty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  
  const discountVal = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'PERCENT' ? (subtotal * (discountVal / 100)) : discountVal;
  const total = Math.max(0, subtotal - discountAmount);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('No items in checkout');
      return;
    }
    if (paymentType === 'CREDIT' && !selectedCustomer) {
      toast.error('A customer must be selected for credit transactions');
      return;
    }

    setSubmitting(true);
    try {
      await fetchWithAuth('/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: cart,
          paymentType,
          transactionId: (paymentType === 'UPI' || paymentType === 'BANK') ? transactionId : '',
          customerId: selectedCustomer?._id || null,
          discountType,
          discountValue: discountVal,
        }),
      });

      toast.success('Sale processed successfully');
      router.push('/sales');
    } catch (error: any) {
      toast.error(error.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-8">
        {/* Inventory Section */}
        <div className="flex-1 flex flex-col min-h-0 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-gray-400 hover:text-white">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Point of Sale</h1>
                <p className="text-gray-400 text-xs font-medium">Add products to start a transaction</p>
              </div>
            </div>
            <div className="relative w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Find product or SKU..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-cyan-400 w-12 h-12" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                <Package size={48} className="text-gray-700" />
                <p className="font-bold">Inventory item not found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    onClick={() => addToCart(product)}
                    className="glass-panel p-5 rounded-3xl border border-white/5 group cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 bg-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                        <Plus size={18} />
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{product.category || 'RETAIL'}</p>
                    <h3 className="font-black text-white group-hover:text-cyan-400 transition-colors mb-2 line-clamp-1">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-black text-white">{formatPrice(product.sellingPrice)}</p>
                      <div className={`px-2 py-1 rounded-lg text-[9px] font-black border ${product.stock < 10 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {product.stock} {product.unit || 'UNIT'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Checkout Section */}
        <div className="w-full lg:w-[450px] flex flex-col">
          <div className="glass-panel rounded-[3rem] border border-white/10 overflow-hidden flex flex-col h-full bg-slate-950/40 backdrop-blur-xl relative">
            {/* Cart Header */}
            <div className="p-8 border-b border-white/5 bg-white/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                    <ShoppingCart size={20} />
                  </div>
                  <h2 className="text-xl font-black text-white">Checkout</h2>
                </div>
                <div className="px-3 py-1 bg-cyan-500/10 rounded-lg text-cyan-400 text-[10px] font-black border border-cyan-500/20">
                  {cart.length} ITEMS
                </div>
              </div>

              {/* Customer Selector */}
              <button 
                onClick={() => setIsCustomerModalOpen(true)}
                className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left ${selectedCustomer ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedCustomer ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    <UserIcon size={16} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest ${selectedCustomer ? 'text-indigo-400' : 'text-gray-500'}`}>Customer</p>
                    <p className="text-sm font-bold text-white">{selectedCustomer ? selectedCustomer.name : 'Walk-in Guest'}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-hide">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                  <ShoppingCart size={64} />
                  <p className="font-black uppercase tracking-[0.2em] text-xs">Cart is empty</p>
                </div>
              ) : (
                <AnimatePresence>
                  {cart.map((item) => (
                    <motion.div 
                      key={`${item.productId}_${item.variantId || 'base'}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{item.name}</p>
                        <p className="text-xs font-black text-cyan-500 mt-1">{formatPrice(item.sellingPrice)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1 border border-white/5">
                          <input 
                            type="number" 
                            step="any"
                            className="w-16 bg-transparent text-sm font-black text-center focus:outline-none"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, item.variantId, e.target.value)}
                          />
                          <span className="text-[10px] font-black text-gray-500 mr-2 uppercase">{item.unit || 'UNIT'}</span>
                        </div>
                        <button onClick={() => removeFromCart(item.productId, item.variantId)} className="p-2 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Payment & Footer */}
            <div className="p-8 border-t border-white/10 bg-slate-950 space-y-6">
              <div className="flex items-center gap-2 justify-between">
                {[
                  { id: 'CASH', icon: Banknote, color: 'emerald', label: 'CASH' },
                  { id: 'UPI', icon: Smartphone, color: 'cyan', label: 'UPI' },
                  { id: 'BANK', icon: Landmark, color: 'blue', label: 'BANK' },
                  { id: 'CREDIT', icon: Clock, color: 'rose', label: 'DEBT' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentType(method.id)}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all ${
                      paymentType === method.id 
                        ? `bg-${method.color}-500/10 border-${method.color}-500 text-${method.color}-400` 
                        : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'
                    }`}
                  >
                    <method.icon size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{method.label}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {(paymentType === 'UPI' || paymentType === 'BANK') && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Transaction ID / Reference</label>
                    <input 
                      type="text"
                      placeholder="Enter Reference Number..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-mono"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Discount Input */}
              <div className="space-y-2 border-t border-b border-white/5 py-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Discount</label>
                  <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
                    <button 
                      type="button"
                      onClick={() => setDiscountType('FLAT')}
                      className={`px-3 py-1 text-[10px] font-black transition-colors ${discountType === 'FLAT' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      FLAT
                    </button>
                    <button 
                      type="button"
                      onClick={() => setDiscountType('PERCENT')}
                      className={`px-3 py-1 text-[10px] font-black transition-colors ${discountType === 'PERCENT' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="relative group">
                  <input 
                    type="number"
                    min="0"
                    step="any"
                    placeholder={`Enter discount ${discountType === 'PERCENT' ? '%' : 'amount'}...`}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-bold"
                    value={discountValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0)) {
                        setDiscountValue(val);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2 py-4">
                <div className="flex justify-between items-center text-xs font-medium text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-medium text-rose-400">
                    <span>Discount ({discountType === 'PERCENT' ? `${discountVal}%` : 'Flat'})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4">
                  <span className="text-xl font-black text-white">Total Amount</span>
                  <span className="text-3xl font-black text-cyan-400 tracking-tighter">{formatPrice(total)}</span>
                </div>
              </div>

              <button 
                onClick={handleSubmit} 
                disabled={submitting || cart.length === 0} 
                className={`w-full py-5 rounded-[2rem] text-white font-black text-sm shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
                  submitting || cart.length === 0 
                  ? 'bg-gray-800 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/25 hover:shadow-cyan-500/40'
                }`}
              >
                {submitting ? <Loader2 className="animate-spin" /> : (
                  <>
                    <CheckCircle2 size={20} />
                    <span>FINALIZE TRANSACTION</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCustomerModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-panel w-full max-w-2xl p-10 rounded-[3rem] relative z-10 border border-white/10">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Select Customer</h2>
                  <p className="text-gray-400 text-sm mt-1">Assign this sale to a client record</p>
                </div>
                <button onClick={() => setIsCustomerModalOpen(false)} className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white"><X size={24} /></button>
              </div>

              <div className="relative mb-8">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input placeholder="Search customers by name or phone..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                <div 
                  onClick={() => { setSelectedCustomer(null); setIsCustomerModalOpen(false); }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${!selectedCustomer ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center text-gray-400 font-bold text-xs">WA</div>
                    <div>
                      <p className="font-bold text-white">Walk-in Guest</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Anonymous Customer</p>
                    </div>
                  </div>
                  {!selectedCustomer && <CheckCircle2 className="text-indigo-400" size={20} />}
                </div>

                {customers.map((c) => (
                  <div 
                    key={c._id}
                    onClick={() => { setSelectedCustomer(c); setIsCustomerModalOpen(false); }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${selectedCustomer?._id === c._id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xs">{c.name.substring(0, 2).toUpperCase()}</div>
                      <div>
                        <p className="font-bold text-white">{c.name}</p>
                        <p className="text-[10px] text-gray-500 font-black tracking-widest">{c.phone || 'NO PHONE'}</p>
                      </div>
                    </div>
                    {selectedCustomer?._id === c._id && <CheckCircle2 className="text-indigo-400" size={20} />}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
