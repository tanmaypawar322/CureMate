'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ApiClient, User } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: { email: string; password: string; phone?: string; abhaId?: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const data = await ApiClient.getMe();
      setUser(data);
      return data;
    } catch (_e) {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await ApiClient.login({ email, password: pass });
    setUser(res.user);
  };

  const signup = async (data: { email: string; password: string; phone?: string; abhaId?: string }) => {
    const res = await ApiClient.signup(data);
    setUser(res.user);
  };

  const logout = () => {
    ApiClient.clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
