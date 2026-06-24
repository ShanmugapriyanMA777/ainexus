import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isMockClient } from '../services/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isDemo: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor auth state changes
  useEffect(() => {
    const checkSession = async () => {
      const isSandboxActive = localStorage.getItem('ai-nexus-mock-db:sandbox-session-active') === 'true';
      if (isSandboxActive) {
        setUser({
          id: 'mock-user-123',
          full_name: 'Alex Developer',
          email: 'alex@nexus.ai',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
          is_admin: true,
          created_at: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchAndSetProfile(session.user.id);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      const isSandboxActive = localStorage.getItem('ai-nexus-mock-db:sandbox-session-active') === 'true';
      if (isSandboxActive) return;

      console.log('Auth state change event:', event);
      if (session?.user) {
        await fetchAndSetProfile(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAndSetProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Fallback profile if profile record not immediately available (e.g. schema trigger delays)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || 'New User',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            is_admin: false,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        setUser(data);
      }
    } catch (err) {
      console.error('Error in fetchAndSetProfile:', err);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) return { error };

      // In custom mock, profile creation is synchronous. For standard Supabase, it relies on trigger,
      // but let's proactively insert a profile row if not in mock to ensure reliability.
      if (!isMockClient && data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          email: email,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`,
          is_admin: false,
        });
        if (profileError) console.error('Error creating profile manually:', profileError);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    // Intercept sandbox login credentials
    if (email === 'alex@nexus.ai' && password === 'sandbox') {
      localStorage.setItem('ai-nexus-mock-db:sandbox-session-active', 'true');
      setUser({
        id: 'mock-user-123',
        full_name: 'Alex Developer',
        email: 'alex@nexus.ai',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
        is_admin: true,
        created_at: new Date().toISOString(),
      });
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    const wasSandbox = localStorage.getItem('ai-nexus-mock-db:sandbox-session-active') === 'true';
    localStorage.removeItem('ai-nexus-mock-db:sandbox-session-active');
    
    if (wasSandbox) {
      setUser(null);
      // Reload page and direct to login
      window.location.href = '/auth';
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('User not logged in') };
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (!error) {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
      }
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo: isMockClient,
        signUp,
        signIn,
        signInWithOAuth,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
