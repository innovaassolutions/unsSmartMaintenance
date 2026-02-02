"use client"
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// TimescaleDB User type
interface TimescaleUser {
  id: string;
  email: string;
  role: 'factory_manager' | 'production_manager' | 'maintenance_technician' | 'executive';
  full_name: string;
  created_at: Date;
  last_login: Date | null;
}

interface TimescaleSession {
  user: TimescaleUser;
  token: string;
  expires_at: Date;
}

interface AuthContextType {
  user: TimescaleUser | null;
  session: TimescaleSession | null;
  isLoading: boolean;
  signUp: (email: string, password: string, role: string, fullName: string) => Promise<{ error?: any }>;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<{ error?: any }>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function TimescaleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TimescaleUser | null>(null);
  const [session, setSession] = useState<TimescaleSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const checkExistingSession = () => {
      try {
        const savedSession = localStorage.getItem('timescale_session');
        if (savedSession) {
          const parsedSession = JSON.parse(savedSession);
          const expiresAt = new Date(parsedSession.expires_at);

          if (expiresAt > new Date()) {
            setSession(parsedSession);
            setUser(parsedSession.user);
          } else {
            localStorage.removeItem('timescale_session');
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        localStorage.removeItem('timescale_session');
      }
      setIsLoading(false);
    };

    checkExistingSession();
  }, []);

  const signUp = async (email: string, password: string, role: string, fullName: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, full_name: fullName })
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Signup failed' };
      }

      // Auto sign in after successful signup
      return await signIn(email, password);
    } catch (error) {
      return { error: 'Network error during signup' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Sign in failed' };
      }

      const newSession: TimescaleSession = {
        user: data.user,
        token: data.token,
        expires_at: new Date(data.expires_at)
      };

      setSession(newSession);
      setUser(data.user);
      localStorage.setItem('timescale_session', JSON.stringify(newSession));

      return { error: null };
    } catch (error) {
      return { error: 'Network error during sign in' };
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setSession(null);
      localStorage.removeItem('timescale_session');
      return { error: null };
    } catch (error) {
      return { error: 'Error during sign out' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Password reset failed' };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Network error during password reset' };
    }
  };

  const value = {
    user,
    session,
    isLoading,
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
    throw new Error('useAuth must be used within a TimescaleAuthProvider');
  }
  return context;
}