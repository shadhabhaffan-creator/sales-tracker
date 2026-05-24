'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {

        localStorage.setItem(
          'user',
          JSON.stringify({
            id: '1',
            username: 'admin',
            role: 'ADMIN',
            fullName: 'Admin'
          })
        );

        toast.success('Welcome back!');
        router.push('/dashboard');

      } else {
        toast.error('Invalid credentials');
      }

      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <motion.div
        initial={{ opacity:0,y:20 }}
        animate={{ opacity:1,y:0 }}
        className="glass-panel w-full max-w-md p-10 rounded-3xl relative z-10"
      >

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/50">
            <ShieldCheck size={32} className="text-white"/>
          </div>

          <h1 className="text-3xl font-bold text-white">
            AuraSales
          </h1>

          <p className="text-gray-400 mt-2">
            Sign in to your dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">

          <div>
            <label className="text-xs text-gray-400 uppercase">
              Username
            </label>

            <input
              required
              className="glass-input w-full h-14"
              placeholder="admin"
              value={username}
              onChange={(e)=>setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase">
              Password
            </label>

            <input
              required
              type="password"
              className="glass-input w-full h-14"
              placeholder="••••••"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            className="glass-button w-full h-14"
          >
            {loading
            ? <Loader2 className="animate-spin mx-auto"/>
            : 'Sign In'}
          </button>

        </form>
      </motion.div>
    </div>
  );
}