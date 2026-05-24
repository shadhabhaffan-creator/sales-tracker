'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/services/api';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  permissions?: Record<string, boolean>;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  login: (token: string, user: User) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await fetchWithAuth('/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const hasPermission = (permission: string) => {
    if (isAdmin) return true;
    return !!user?.permissions?.[permission];
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, isAdmin, hasPermission, login }}>
      {loading ? (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-cyan-500/5 blur-[100px] rounded-full scale-150 animate-pulse" />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-widest uppercase">AuraSales</h2>
              <p className="text-cyan-500/60 text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Syncing Session...</p>
            </div>
          </div>
        </div>
      ) : children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
