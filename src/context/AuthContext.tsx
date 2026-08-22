import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, Role } from '../lib/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (params: { email: string; password: string; name: string; role: Role }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Failed to load profile', error);
      return null;
    }
    return data as Profile | null;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      (async () => {
        if (session?.user) {
          const profile = await loadProfile(session.user.id);
          if (!mounted) return;
          setState({ session, user: session.user, profile, loading: false });
        } else {
          setState({ session: null, user: null, profile: null, loading: false });
        }
      })();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const profile = await loadProfile(session.user.id);
          if (!mounted) return;
          setState({ session, user: session.user, profile, loading: false });
        } else {
          setState({ session: null, user: null, profile: null, loading: false });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async ({ email, password, name, role }: { email: string; password: string; name: string; role: Role }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          requested_role: role,
        },
      },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Sign up failed. Please try again.' };
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await loadProfile(state.user.id);
    setState((s) => ({ ...s, profile }));
  }, [state.user, loadProfile]);

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// This hook shares the context intentionally; it is not a renderable component export.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
