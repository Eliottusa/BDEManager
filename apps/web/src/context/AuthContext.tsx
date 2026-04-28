'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState } from '../types/auth';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER: User = {
  id: 'mock-id-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      const isMockEnabled = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
      const token = localStorage.getItem('accessToken');

      if (isMockEnabled) {
        // Force mock session if enabled
        setState({
          user: MOCK_USER,
          accessToken: 'mock-token',
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      if (!token) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // In a real scenario, you might have a /me endpoint
        // const res = await api.get('/auth/me');
        // For now, let's assume if token exists, we are "authenticated"
        // and would normally fetch the user profile.
        setState({
          user: null, // Should be fetched from API
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        localStorage.removeItem('accessToken');
        setState({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      localStorage.setItem('accessToken', 'mock-token');
      setState({
        user: MOCK_USER,
        accessToken: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
      });
      router.push('/dashboard');
      return;
    }

    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, user } = res.data;
      localStorage.setItem('accessToken', accessToken);
      setState({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
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
