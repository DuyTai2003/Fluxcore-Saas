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
    const AUTH_TIMEOUT_MS = 8000;

    const initAuth = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AUTH_TIMEOUT')), AUTH_TIMEOUT_MS)
          ),
        ]);

        const session = sessionResult.data.session;
        const user = session?.user ?? null;
        let profile: Profile | null = null;
        if (user) {
          try {
            profile = await fetchProfile(user.id);
          } catch (err) {
            console.warn('[FluxCore Auth] Could not load profile (may need to run seed SQL):', (err as Error).message);
          }
        }
        if (!cancelled) {
          setState({ user, profile, session, loading: false });
        }
      } catch (err) {
        console.warn('[FluxCore Auth] Supabase unreachable, starting in offline mode:', (err as Error).message);
        if (!cancelled) {
          setState({ user: null, profile: null, session: null, loading: false });
        }
      }
    };

    initAuth();

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

    if (data.user) {
      let profile: Profile | null = null;
      try {
        profile = await fetchProfile(data.user.id);
      } catch (err) {
        console.warn('[FluxCore Auth] Could not load profile on sign in:', (err as Error).message);
      }
      setState({
        user: data.user,
        profile,
        session: data.session,
        loading: false,
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
      const tenantSlug = `tenant-${data.user.id.slice(0, 8)}`;

      try {
        await supabase.rpc('create_tenant_and_profile', {
          p_user_id: data.user.id,
          p_email: email,
          p_full_name: fullName,
          p_role: role,
          p_tenant_name: fullName,
          p_tenant_slug: tenantSlug,
        });
      } catch (_rpcErr) {
        const { data: existingTenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle();

        if (existingTenant) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email,
              full_name: fullName,
              role,
              tenant_id: existingTenant.id,
            });

          if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`);
        } else {
          throw _rpcErr instanceof Error ? _rpcErr : new Error('Tenant creation failed. Please run the updated schema.sql in Supabase SQL Editor.');
        }
      }
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