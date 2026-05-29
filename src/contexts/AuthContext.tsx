import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import * as AuthApi from '@/lib/supabase-auth';
import type { Database } from '@/lib/supabase.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Profile['role'];

// Minimal user/session types matching what we get from the API
interface AuthUser {
  id: string;
  email: string;
}
interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  session: AuthSession | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isOperator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[FluxCore Auth] Failed to fetch profile:', error.message);
      return null;
    }
    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    if (profile) {
      setState((prev) => ({ ...prev, profile }));
    }
  }, [state.user, fetchProfile]);

  useEffect(() => {
    let cancelled = false;

    // Try to restore session from localStorage
    const storedSession = localStorage.getItem('fluxcore_session');
    if (storedSession) {
      try {
        const session: AuthSession = JSON.parse(storedSession);
        if (session.expires_at > Date.now() / 1000) {
          // Session still valid, try to refresh
          AuthApi.getSession(session.access_token)
            .then((user) => {
              if (!cancelled) {
                const u: AuthUser = { id: user.id, email: user.email };
                setState({ user: u, profile: null, session, loading: false });
                // Fetch profile in background
                fetchProfile(u.id).then((p) => {
                  if (p && !cancelled) setState((prev) => ({ ...prev, profile: p }));
                }).catch(() => {});
              }
            })
            .catch(() => {
              // Token expired, clear
              localStorage.removeItem('fluxcore_session');
              if (!cancelled) setState({ user: null, profile: null, session: null, loading: false });
            });
          return () => { cancelled = true; };
        } else {
          localStorage.removeItem('fluxcore_session');
        }
      } catch {
        localStorage.removeItem('fluxcore_session');
      }
    }

    // No valid stored session, just show login
    if (!cancelled) {
      setState({ user: null, profile: null, session: null, loading: false });
    }

    return () => { cancelled = true; };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await AuthApi.signInWithPassword(email, password);

    const user: AuthUser = { id: data.user.id, email: data.user.email };
    const session: AuthSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user,
    };

    // Store session for persistence
    localStorage.setItem('fluxcore_session', JSON.stringify(session));

    setState({ user, profile: null, session, loading: false });

    // Fetch profile in background
    fetchProfile(user.id).then((profile) => {
      if (profile) setState((prev) => ({ ...prev, profile }));
    }).catch((err) => {
      console.warn('[FluxCore Auth] Could not load profile:', (err as Error).message);
    });
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, role: UserRole) => {
    const data = await AuthApi.signUpWithPassword(email, password);

    if (data.user) {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: fullName,
          slug: `tenant-${data.user.id.slice(0, 8)}`,
          plan: 'pro',
        })
        .select('id')
        .single();

      if (tenantError) {
        console.error('[FluxCore Auth] Failed to create tenant:', tenantError.message);
        throw new Error(`Tenant creation failed: ${tenantError.message}. Please run supabase/schema.sql in Supabase SQL Editor first.`);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          full_name: fullName,
          role,
          tenant_id: tenant.id,
        });

      if (profileError) throw profileError;
    }
  }, []);

  const signOut = useCallback(async () => {
    const token = state.session?.access_token;
    localStorage.removeItem('fluxcore_session');
    setState({ user: null, profile: null, session: null, loading: false });
    if (token) {
      AuthApi.signOut(token).catch(() => {});
    }
  }, [state.session]);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isAdmin: state.profile?.role === 'super_admin',
    isManager: state.profile?.role === 'manager',
    isOperator: state.profile?.role === 'operator',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('[FluxCore] useAuth must be used within an AuthProvider');
  }
  return context;
}