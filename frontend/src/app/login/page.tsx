'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // ── Forgot password flow ──────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message || 'Failed to send reset email.');
      } else {
        setResetSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ── Sign-in flow ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login')) {
          toast.error('Invalid email or password. Please try again.');
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          toast.error('Please verify your email address before signing in.');
        } else {
          toast.error(error.message);
        }
      } else if (data.session) {
        toast.success('Welcome back!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render: reset-sent confirmation ──────────────────────────────────────
  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel w-full max-w-md p-10 rounded-3xl text-center"
        >
          <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Check your inbox</h1>
          <p className="text-gray-400 mb-8">
            We sent a password reset link to&nbsp;
            <span className="text-cyan-400 font-medium">{email}</span>.
            Follow the link to create a new password.
          </p>
          <button
            onClick={() => { setForgotMode(false); setResetSent(false); }}
            className="glass-button w-full h-12"
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Render: forgot-password form ─────────────────────────────────────────
  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel w-full max-w-md p-10 rounded-3xl"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white">Reset Password</h1>
            <p className="text-gray-400 mt-2">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-6" autoComplete="off">
            <input
              required
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="glass-input w-full h-14"
            />

            <button
              disabled={loading}
              className="glass-button w-full h-14 flex items-center justify-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-center text-sm text-gray-400 hover:text-cyan-400 transition-colors"
            >
              ← Back to Sign In
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── Render: main login form ───────────────────────────────────────────────
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
          <h1 className="text-3xl font-bold text-white">AuraSales</h1>
          <p className="text-gray-400 mt-2">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
          {/* Email */}
          <input
            required
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="glass-input w-full h-14"
          />

          {/* Password with show/hide toggle */}
          <div className="relative">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="glass-input w-full h-14 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Forgot password link */}
          <div className="text-right -mt-2">
            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <button
            disabled={loading}
            className="glass-button w-full h-14 flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}