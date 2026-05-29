import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Profile['role'];

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      let profile: Profile | null = null;
      if (user) {
        try {
          profile = await fetchProfile(user.id);
        } catch (err) {
          console.warn('[FluxCore Auth] Could not load profile:', (err as Error).message);
        }
      }
      if (!cancelled) {
        setState({ user, profile, session, loading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        let profile: Profile | null = null;
        if (user) {
          try {
            profile = await fetchProfile(user.id);
          } catch (err) {
            console.warn('[FluxCore Auth] Could not load profile:', (err as Error).message);
          }
        }
        if (!cancelled) {
          setState({ user, profile, session, loading: false });
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Set loading=false immediately so AuthGuard navigates right away
    if (data.user) {
      setState({
        user: data.user,
        profile: null,
        session: data.session,
        loading: false,
      });

      // Fetch profile in background
      fetchProfile(data.user.id).then((profile) => {
        if (profile) {
          setState((prev) => ({ ...prev, profile }));
        }
      }).catch((err) => {
        console.warn('[FluxCore Auth] Could not load profile:', (err as Error).message);
      });
    }
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw error;

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
    await supabase.auth.signOut();
    setState({ user: null, profile: null, session: null, loading: false });
  }, []);

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