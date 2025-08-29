'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../api/client';

interface User {
  id: string;
  email: string;
  name?: string;
  is_active: boolean;
  created_at: string;
  last_seen_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  signout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('vault_token');
    const storedUser = localStorage.getItem('vault_user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        // Clear invalid stored data
        localStorage.removeItem('vault_token');
        localStorage.removeItem('vault_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const signin = async (email: string, password: string) => {
    try {
      const response = await apiClient.signin({ email, password });
      
      // Store token and user data
      localStorage.setItem('vault_token', response.access_token);
      localStorage.setItem('vault_user', JSON.stringify(response.user));
      
      setToken(response.access_token);
      setUser(response.user);
      
      // Redirect to dashboard
      router.push('/');
    } catch (error: any) {
      throw new Error(error.message || 'Sign in failed');
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    try {
      const response = await apiClient.signup({ email, password, name });
      
      // Store token and user data
      localStorage.setItem('vault_token', response.access_token);
      localStorage.setItem('vault_user', JSON.stringify(response.user));
      
      setToken(response.access_token);
      setUser(response.user);
      
      // Redirect to dashboard
      router.push('/');
    } catch (error: any) {
      throw new Error(error.message || 'Sign up failed');
    }
  };

  const signout = () => {
    // Clear stored data
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user');
    
    setToken(null);
    setUser(null);
    
    // Redirect to signin
    router.push('/auth/signin');
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        signin,
        signup,
        signout,
        isAuthenticated,
      }}
    >
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