"use client"
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Demo User type
interface DemoUser {
  id: string;
  email: string;
  role: 'factory_manager' | 'production_manager' | 'maintenance_technician' | 'executive';
  full_name: string;
  demo: boolean;
}

interface DemoSession {
  user: DemoUser;
  token: string;
  expires_at: Date;
}

interface AuthContextType {
  user: DemoUser | null;
  session: DemoSession | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<{ error?: any }>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
  demoLogin: (role: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auto-login as factory manager for demo
    const autoLogin = async () => {
      try {
        await demoLogin('factory_manager');
      } catch (error) {
        console.error('Auto login failed:', error);
      }
      setIsLoading(false);
    };

    autoLogin();
  }, []);

  const demoLogin = async (role: string) => {
    try {
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Demo login failed' };
      }

      const newSession: DemoSession = {
        user: { ...data.user, demo: true },
        token: data.token,
        expires_at: new Date(data.expires_at)
      };

      setSession(newSession);
      setUser(newSession.user);

      return { error: null };
    } catch (error) {
      return { error: 'Network error during demo login' };
    }
  };

  const signUp = async (email: string, password: string) => {
    // For demo purposes, redirect to demo login
    return await demoLogin('factory_manager');
  };

  const signIn = async (email: string, password: string) => {
    // For demo purposes, redirect to demo login
    return await demoLogin('factory_manager');
  };

  const signOut = async () => {
    try {
      setUser(null);
      setSession(null);
      // Auto re-login for demo
      await demoLogin('factory_manager');
      return { error: null };
    } catch (error) {
      return { error: 'Error during sign out' };
    }
  };

  const resetPassword = async (email: string) => {
    // For demo purposes, always succeed
    return { error: null };
  };

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    demoLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a DemoAuthProvider');
  }
  return context;
}