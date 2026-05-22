'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthState } from '../types/auth';
import api from '../lib/api';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  city?: string;
  postcode?: string;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        setState({ user: res.data, accessToken: null, isAuthenticated: true, isLoading: false });
      } catch {
        setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setState({ user: res.data.user, accessToken: null, isAuthenticated: true, isLoading: false });
    router.push(`/${locale}/dashboard`);
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    setState({ user: res.data.user, accessToken: null, isAuthenticated: true, isLoading: false });
    router.push(`/${locale}/dashboard`);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      // L'API supprime les tokens Redis et clear les cookies côté serveur
      await api.post('/auth/logout');
    } catch {
      // On déconnecte quand même côté client
    } finally {
      setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      router.push(`/${locale}/auth/login`);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
