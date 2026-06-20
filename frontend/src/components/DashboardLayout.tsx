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
  Boxes,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import TopNavbar from '@/components/TopNavbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout, isAdmin, hasPermission } = useUser();

  const menuGroups = [
    {
      title: 'Analytics',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: BarChart3, label: 'Reports', href: '/reports', permission: 'accessAnalytics' },
      ]
    },
    {
      title: 'Sales & Revenue',
      items: [
        { icon: ShoppingCart, label: 'Sales', href: '/sales', permission: 'changeSalesStatus' },
        { icon: Banknote, label: 'Settlements', href: '/settlements', permission: 'viewRevenue' },
        { icon: Users, label: 'Customers', href: '/customers' },
        { icon: Wallet, label: 'Outstanding Payments', href: '/outstanding-payments' },
      ]
    },
    {
      title: 'Inventory & Logistics',
      items: [
        { icon: Package, label: 'Products', href: '/products' },
        { icon: Boxes, label: 'Bulk Inventory', href: '/inventory' },
        { icon: ShoppingBag, label: 'Purchases', href: '/purchases' },
        { icon: Truck, label: 'Suppliers', href: '/suppliers' },
        { icon: Warehouse, label: 'Warehouses', href: '/warehouses' },
      ]
    },
    {
      title: 'Administration',
      items: [
        { icon: Receipt, label: 'Expenses', href: '/expenses' },
        { icon: ShieldCheck, label: 'Employees', href: '/employees', permission: ['manageTeamMembers', 'createEmployeeAccounts'] },
        { icon: Settings, label: 'Settings', href: '/settings', permission: 'accessSettings' },
      ]
    }
  ];

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!item.permission) return true;
      if (Array.isArray(item.permission)) {
        return item.permission.some(p => hasPermission(p));
      }
      return hasPermission(item.permission);
    })
  })).filter(group => group.items.length > 0);

  // ─── Sidebar Glass Styles ────────────────────────────────────────────────
  const sidebarStyle: React.CSSProperties = {
    background: 'rgba(8, 25, 70, 0.45)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.25)',
  };

  // ─── Desktop Sidebar ─────────────────────────────────────────────────────
  const DesktopSidebar = () => (
    <aside
      style={{
        ...sidebarStyle,
        width: isCollapsed ? 80 : 280,
      }}
      className="hidden lg:flex flex-col h-[calc(100vh-2rem)] sticky top-4 shrink-0 rounded-2xl m-4 mr-0 z-40 transition-all duration-300 ease-in-out overflow-hidden relative pt-[28px] pb-[28px] px-4"
    >
      {/* Glass top reflection line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent pointer-events-none rounded-t-2xl" />

      {/* Expand floating button — only when collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute top-[40px] -right-3 w-6 h-6 bg-cyan-500 hover:bg-cyan-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 cursor-pointer border border-cyan-400 z-50 transition-all duration-200 active:scale-95"
          title="Expand sidebar"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Header */}
      <div
        className={`flex items-center shrink-0 rounded-xl mb-4 relative ${isCollapsed ? 'w-12 h-12 justify-center p-0 mx-auto' : 'w-full px-3 py-3 justify-between'}`}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : 'flex-1'}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
            <ShieldCheck className="text-white" size={18} />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg tracking-tight text-white truncate">AuraSales</span>
          )}
        </div>
        {/* Collapse toggle — only visible inside header when expanded */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0 ml-1"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 py-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>

        {filteredGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {/* Section label */}
            {!isCollapsed ? (
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40 select-none">
                {group.title}
              </div>
            ) : (
              <div className="mx-2 my-2 h-px bg-white/8" />
            )}

            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} className="block mb-0.5 group/item">
                  <div
                    title={isCollapsed ? item.label : undefined}
                    className={`
                      relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer
                      ${isCollapsed ? 'justify-center' : ''}
                      ${isActive
                        ? ''
                        : 'text-gray-400 hover:text-white'
                      }
                    `}
                    style={isActive ? {
                      background: 'rgba(0, 220, 255, 0.10)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(0, 220, 255, 0.25)',
                      borderLeft: '3px solid #00DFFF',
                    } : {
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        const el = e.currentTarget;
                        el.style.background = 'rgba(255,255,255,0.04)';
                        el.style.backdropFilter = 'blur(10px)';
                        el.style.transform = 'translateX(2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        const el = e.currentTarget;
                        el.style.background = '';
                        el.style.backdropFilter = '';
                        el.style.transform = '';
                      }
                    }}
                  >
                    <Icon
                      size={22}
                      className={`shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'text-gray-500 group-hover/item:text-white'}`}
                    />
                    {!isCollapsed && (
                      <span
                        className={`text-[14px] font-medium truncate ${isActive ? 'text-white' : ''}`}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — Sign Out */}
      <div
        className="pt-4 shrink-0 mt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer group ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={22} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
          {!isCollapsed && <span className="text-[14px] font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );

  // ─── Mobile Sidebar Drawer ────────────────────────────────────────────────
  const MobileSidebar = () => (
    <AnimatePresence>
      {isMobileOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 bottom-0 left-0 w-[280px] h-full z-50 lg:hidden flex flex-col pt-[28px] pb-[28px] px-4"
            style={sidebarStyle}
          >
            {/* Glass reflection */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent pointer-events-none" />

            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-3 shrink-0 rounded-xl mb-4"
              style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <ShieldCheck className="text-white" size={18} />
                </div>
                <span className="font-bold text-lg tracking-tight text-white">AuraSales</span>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Nav */}
            <nav
              className="flex-1 py-1 overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              <style>{`.mobile-nav::-webkit-scrollbar { display: none; }`}</style>
              {filteredGroups.map((group) => (
                <div key={group.title} className="mb-4">
                  <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40 select-none">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} className="block mb-0.5" onClick={() => setIsMobileOpen(false)}>
                        <div
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/4'}`}
                          style={isActive ? {
                            background: 'rgba(0, 220, 255, 0.10)',
                            border: '1px solid rgba(0, 220, 255, 0.25)',
                            borderLeft: '3px solid #00DFFF',
                          } : { border: '1px solid transparent' }}
                        >
                          <Icon size={22} className={`shrink-0 ${isActive ? 'text-cyan-400' : ''}`} />
                          <span className="text-[14px] font-medium">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div className="pt-4 shrink-0 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => { setIsMobileOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <LogOut size={22} className="shrink-0" />
                <span className="text-[14px] font-medium">Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex h-screen text-white overflow-hidden relative">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Mobile Drawer */}
      <MobileSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-3 md:p-4 relative overflow-hidden min-w-0">
        {/* Mobile Header — only on small screens, no hamburger on desktop */}
        <header className="flex lg:hidden items-center justify-between p-4 bg-white/5 border border-white/8 rounded-2xl mb-4 relative z-30 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShieldCheck className="text-white" size={15} />
            </div>
            <span className="font-bold text-base tracking-tight">AuraSales</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/8 text-gray-400 active:scale-95 cursor-pointer"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Top Navbar */}
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
        <div className="flex-1 overflow-y-auto scrollbar-hide min-w-0">
          <div className="max-w-7xl mx-auto pb-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
