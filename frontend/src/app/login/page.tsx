'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/components/UserContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Temporary login bypass
      if (username === 'admin' && password === 'admin123') {
        login('temp-token', {
          id: '1',
          username: 'admin',
          role: 'ADMIN',
          fullName: 'Admin',
          permissions: []
        });

        toast.success('Welcome back!');
        window.location.href = '/dashboard';
        return;
      }

      toast.error('Invalid credentials');
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md p-10 rounded-3xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/50">
            <ShieldCheck size={32} className="text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white tracking-tight">
            AuraSales
          </h1>

          <p className="text-gray-400 mt-2">
            Sign in to your dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold ml-1">
              Username
            </label>

            <input
              required
              className="glass-input w-full h-14"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold ml-1">
              Password
            </label>

            <input
              required
              type="password"
              className="glass-input w-full h-14"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            className="glass-button w-full h-14 text-lg font-bold mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}