'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/components/UserContext';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useUser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (username === 'admin' && password === 'admin123') {

        login('temp-token', {
          id: '1',
          username: 'admin',
          role: 'ADMIN',
          fullName: 'Admin',
          permissions: {} // fixed
        });

        toast.success('Welcome back!');

        setTimeout(() => {
          router.push('/dashboard');
        }, 500);

      } else {
        toast.error('Invalid credentials');
      }

    } catch {
      toast.error('Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md p-10 rounded-3xl"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>

          <h1 className="text-3xl font-bold text-white">
            AuraSales
          </h1>

          <p className="text-gray-400 mt-2">
            Sign in to your dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">

          <input
            required
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="glass-input w-full h-14"
          />

          <input
            required
            type="password"
            placeholder="admin123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input w-full h-14"
          />

          <button
            disabled={loading}
            className="glass-button w-full h-14"
          >
            {loading
              ? <Loader2 className="animate-spin" />
              : 'Sign In'}
          </button>

        </form>
      </motion.div>
    </div>
  );
}