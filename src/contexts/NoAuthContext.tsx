'use client';
import React, { createContext, useContext, ReactNode } from 'react';

// Simple user without authentication
interface SimpleUser {
  id: string;
  email: string;
  role: string;
  full_name: string;
}

interface SimpleSession {
  user: SimpleUser;
  token: string;
}

interface AuthContextType {
  user: SimpleUser | null;
  session: SimpleSession | null;
  isLoading: boolean;
  signUp: (_email: string, _password: string) => Promise<{ error?: unknown }>;
  signIn: (_email: string, _password: string) => Promise<{ error?: unknown }>;
  signOut: () => Promise<{ error?: unknown }>;
  resetPassword: (_email: string) => Promise<{ error?: unknown }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function NoAuthProvider({ children }: { children: ReactNode }) {
  // Always logged in as factory manager for demo
  const user: SimpleUser = {
    id: 'demo-user-123',
    email: 'demo@factory.com',
    role: 'factory_manager',
    full_name: 'Demo Factory Manager',
  };

  const session: SimpleSession = {
    user,
    token: 'demo-token',
  };

  const signUp = async (_email: string, _password: string) => {
    return { error: null };
  };

  const signIn = async (_email: string, _password: string) => {
    return { error: null };
  };

  const signOut = async () => {
    return { error: null };
  };

  const resetPassword = async (_email: string) => {
    return { error: null };
  };

  const value = {
    user,
    session,
    isLoading: false,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a NoAuthProvider');
  }
  return context;
}
