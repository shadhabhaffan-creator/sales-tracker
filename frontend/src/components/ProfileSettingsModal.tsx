'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Loader2, ShieldCheck, Check } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';
import { toast } from 'sonner';

export default function ProfileSettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user } = useUser();
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);
    try {
      await fetchWithAuth('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ username, password }),
      });
      toast.success('Profile updated successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.9, opacity: 0, y: 20 }} 
          className="glass-panel w-full max-w-lg rounded-2xl relative z-10 shadow-2xl border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 flex items-center justify-between border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">Profile Settings</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-0.5">Manage your account</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500/20 rounded-xl transition-all text-gray-400 hover:text-rose-400">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input w-full pl-12 font-bold text-white" 
                  placeholder="Username" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pl-12 font-bold text-white" 
                  placeholder="Leave blank to keep current" 
                />
              </div>
            </div>

            {password && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-input w-full pl-12 font-bold text-white" 
                    placeholder="Confirm your new password" 
                  />
                </div>
              </div>
            )}

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    <Check size={20} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
