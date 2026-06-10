'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PUBLIC_PATHS = ['/login', '/reset-password'];

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
  logout: () => Promise<void>;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

  const fetchProfile = async (userId: string, email: string | undefined): Promise<User | null> => {
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('User')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.warn('Profile not found, falling back to auth metadata:', profileError);
        return {
          id: userId,
          username: email?.split('@')[0] || 'user',
          fullName: email?.split('@')[0] || 'System User',
          role: 'ADMIN',
          permissions: {}
        };
      }

      if (userProfile.status !== 'ACTIVE') {
        console.warn('User status is inactive:', userProfile.status);
        await supabase.auth.signOut();
        return null;
      }

      const { data: userPerms } = await supabase
        .from('Permission')
        .select('*')
        .eq('userId', userId)
        .single();

      const permissionsMap: Record<string, boolean> = {};
      if (userPerms) {
        Object.keys(userPerms).forEach(key => {
          if (typeof userPerms[key] === 'boolean') {
            permissionsMap[key] = userPerms[key];
          }
        });
      }

      return {
        id: userProfile.id,
        username: userProfile.username,
        fullName: userProfile.fullName || 'System User',
        role: userProfile.role || 'VIEWER',
        permissions: permissionsMap
      };
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety net: never spin forever if Supabase is unreachable
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    const isPublicPath = () => PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p));

    const syncSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const profile = await fetchProfile(session.user.id, session.user.email);
        if (mounted) {
          setUser(profile);
          setLoading(false);
        }
      } catch (err) {
        console.error('Sync session error:', err);
        if (mounted) setLoading(false);
      }
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session) {
        setLoading(true);
        const profile = await fetchProfile(session.user.id, session.user.email);
        setUser(profile);
        setLoading(false);
        // Only redirect away from login after successful sign-in
        if (isPublicPath()) {
          router.push('/dashboard');
        }
      } else {
        setUser(null);
        setLoading(false);
        // Only redirect to login if on a protected route
        if (!isPublicPath()) {
          router.push('/login');
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [router]);

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
    router.push('/login');
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const hasPermission = (permission: string) => {
    if (isAdmin) return true;
    return !!user?.permissions?.[permission];
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, isAdmin, hasPermission }}>
      {/* Never block public pages (login, reset-password) with the session spinner */}
      {loading && !isPublicPath ? (
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
