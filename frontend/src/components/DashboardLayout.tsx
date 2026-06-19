'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Eye,
  Banknote,
  Truck,
  Warehouse,
  Wallet,
  ShoppingBag,
  Boxes
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import TopNavbar from '@/components/TopNavbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout, isAdmin, hasPermission } = useUser();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: ShoppingCart, label: 'Sales', href: '/sales', permission: 'changeSalesStatus' },
    { icon: Users, label: 'Customers', href: '/customers' },
    { icon: Banknote, label: 'Settlements', href: '/settlements', permission: 'viewRevenue' },
    { icon: Package, label: 'Products', href: '/products' },
    { icon: Boxes, label: 'Bulk Inventory', href: '/inventory' },
    { icon: ShoppingBag, label: 'Purchases', href: '/purchases' },
    { icon: Truck, label: 'Suppliers', href: '/suppliers' },
    { icon: Wallet, label: 'Outstanding Payments', href: '/outstanding-payments' },
    { icon: Warehouse, label: 'Warehouses', href: '/warehouses' },
    { icon: Receipt, label: 'Expenses', href: '/expenses' },
    { icon: BarChart3, label: 'Reports', href: '/reports', permission: 'accessAnalytics' },
    { icon: ShieldCheck, label: 'Employees', href: '/employees', permission: ['manageTeamMembers', 'createEmployeeAccounts'] },
    { icon: Settings, label: 'Settings', href: '/settings', permission: 'accessSettings' },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.permission) return true;
    if (Array.isArray(item.permission)) {
      return item.permission.some(p => hasPermission(p));
    }
    return hasPermission(item.permission);
  });

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-xl">
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <ShieldCheck className="text-white" />
          </div>
          {(isSidebarOpen || isMobile) && (
            <span className="font-bold text-xl tracking-tight">AuraSales</span>
          )}
        </div>
        {!isMobile ? (
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        ) : (
          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
        {filteredMenuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className="block"
              onClick={() => isMobile && setIsMobileOpen(false)}
            >
              <div className={`
                flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group
                ${isActive ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30' : 'hover:bg-white/5 text-gray-400'}
              `}>
                <item.icon size={20} className={isActive ? 'text-white' : 'group-hover:text-white group-hover:scale-110 transition-transform'} />
                {(isSidebarOpen || isMobile) && <span className="font-medium tracking-wide">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5">
        <button 
          onClick={() => {
            if (isMobile) setIsMobileOpen(false);
            logout();
          }} 
          className="w-full flex items-center gap-4 px-4 py-3 text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all group cursor-pointer"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          {(isSidebarOpen || isMobile) && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen text-white overflow-hidden relative">
      {/* Desktop Sidebar (hidden on mobile/tablet) */}
      <aside 
        style={{ width: isSidebarOpen ? 280 : 80 }}
        className="hidden md:flex glass-panel m-4 mr-0 rounded-3xl flex-col relative z-40 overflow-hidden border border-white/10 transition-all duration-300"
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer (visible only on small screens) */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden"
            />
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-[280px] h-full z-50 md:hidden border-r border-white/10 shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-3 md:p-4 relative overflow-hidden">
        {/* Mobile Header with Hamburger */}
        <header className="flex md:hidden items-center justify-between p-4 bg-slate-950/40 border border-white/5 rounded-2xl mb-4 relative z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShieldCheck className="text-white" size={16} />
            </div>
            <span className="font-bold text-base tracking-tight">AuraSales</span>
          </div>
          <button 
            onClick={() => setIsMobileOpen(true)} 
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-gray-400 active:scale-95"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Top Navbar (Search, Time, Notifications) */}
        <TopNavbar />

        {/* Guest/View-Only Banner */}
        {!isAdmin && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center gap-3 text-amber-400 backdrop-blur-md"
          >
            <Eye size={18} />
            <span className="text-xs md:text-sm font-medium">View-Only Mode</span>
          </motion.div>
        )}
        
        {/* Children content area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto pb-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
