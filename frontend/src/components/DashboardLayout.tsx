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
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import TopNavbar from '@/components/TopNavbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { user, logout, isAdmin, hasPermission } = useUser();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: ShoppingCart, label: 'Sales', href: '/sales', permission: 'changeSalesStatus' },
    { icon: Users, label: 'Customers', href: '/customers' },
    { icon: Banknote, label: 'Settlements', href: '/settlements', permission: 'viewRevenue' },
    { icon: Package, label: 'Products', href: '/products' },
    { icon: ShoppingBag, label: 'Purchases', href: '/purchases' },
    { icon: Truck, label: 'Suppliers', href: '/suppliers' },
    { icon: Wallet, label: 'Outstanding Payments', href: '/outstanding-payments' },
    { icon: Warehouse, label: 'Warehouses', href: '/warehouses' },
    { icon: Receipt, label: 'Expenses', href: '/expenses' },
    { icon: BarChart3, label: 'Reports', href: '/reports', permission: 'accessAnalytics' },
    { icon: ShieldCheck, label: 'Employees', href: '/employees', permission: ['manageTeamMembers', 'createEmployeeAccounts'] },
    { icon: Settings, label: 'Settings', href: '/settings', permission: 'accessSettings' },
  ];

  // Filter menu items by user permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.permission) return true;
    if (Array.isArray(item.permission)) {
      return item.permission.some(p => hasPermission(p));
    }
    return hasPermission(item.permission);
  });

  return (
    <div className="flex h-screen text-white overflow-hidden relative">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="glass-panel m-4 mr-0 rounded-3xl flex flex-col relative z-50 overflow-hidden border border-white/10"
      >
        <div className="p-6 flex items-center justify-between">
          <div className={`flex items-center gap-3 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <ShieldCheck className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">AuraSales</span>
          </div>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
          {filteredMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className={`
                  flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group
                  ${isActive ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30' : 'hover:bg-white/5 text-gray-400'}
                `}>
                  <item.icon size={20} className={isActive ? 'text-white' : 'group-hover:text-white group-hover:scale-110 transition-transform'} />
                  {isSidebarOpen && <span className="font-medium tracking-wide">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all group cursor-pointer">
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 relative overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar />

        {/* Guest Banner */}
        {!isAdmin && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center gap-3 text-amber-400 backdrop-blur-md"
          >
            <Eye size={18} />
            <span className="text-sm font-medium">View-Only Mode: You don't have permission to modify data.</span>
          </motion.div>
        )}
        
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto pb-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
