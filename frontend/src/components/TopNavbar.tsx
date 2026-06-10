'use client';

import { useState, useEffect } from 'react';
import { Search, Bell, Moon, Sun, User, LogOut, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/components/UserContext';
import { useTheme } from '@/components/ThemeContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ProfileSettingsModal from './ProfileSettingsModal';

export default function TopNavbar() {
  const { user, logout } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="flex items-center justify-between mb-4 sm:mb-6 relative z-40 gap-3">
      {/* Global Search */}
      <div className="relative group max-w-[130px] xxs:max-w-[180px] xs:max-w-[240px] sm:max-w-md w-full">
        <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-cyan-400 transition-colors">
          <Search size={16} />
        </div>
        <input 
          type="text" 
          placeholder="Search..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-2 sm:py-3 pl-9 sm:pl-12 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:bg-white/10 transition-all placeholder:text-gray-500 text-white"
        />
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Date & Time */}
        <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 text-gray-400 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} className="text-cyan-400" />
            <span>{format(currentTime, 'EEE, MMM dd')}</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-indigo-400" />
            <span>{format(currentTime, 'HH:mm:ss')}</span>
          </div>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all relative text-gray-400 hover:text-white"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-gray-900" />
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-72 glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-50 p-6 text-center"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <Bell className="text-gray-500" size={24} />
                  </div>
                  <h3 className="font-bold text-white mb-1">No Notifications</h3>
                  <p className="text-xs text-gray-500 font-medium">You&apos;re all caught up! We&apos;ll notify you when something important happens.</p>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={() => {
            toggleTheme();
            toast.info(`Switched to ${isDark ? 'Light' : 'Dark'} Mode`, { duration: 1000 });
          }}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-gray-400 hover:text-white"
        >
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Profile */}
        <div className="relative">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 p-1.5 pr-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20">
              {user?.username?.[0].toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold leading-none">{user?.username}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5 tracking-tighter">{user?.role}</p>
            </div>
          </button>

          <AnimatePresence>
            {showProfile && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-56 glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-50"
                >
                  <div className="p-4 border-b border-white/5">
                    <p className="text-xs font-medium text-gray-400">Signed in as</p>
                    <p className="text-sm font-bold truncate">{user?.username}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => { setIsProfileModalOpen(true); setShowProfile(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <User size={16} />
                      <span>Profile Settings</span>
                    </button>
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:bg-rose-400/5 rounded-xl transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ProfileSettingsModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </nav>
  );
}
