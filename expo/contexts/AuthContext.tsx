import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState } from 'react';
import { supabase, getRedirectUrl } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log('[Auth] Initial session:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((error) => {
        console.error('[Auth] Failed to get session:', error);
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] Auth state changed:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return useMemo(() => {
    const signInWithEmail = async (email: string, password: string) => {
      console.log('[Auth] Sign in with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    };

    const signUpWithEmail = async (email: string, password: string) => {
      console.log('[Auth] Sign up with email:', email);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    };

    const signInWithGoogle = async () => {
      console.log('[Auth] Sign in with Google');
      
      if (Platform.OS === 'web') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: getRedirectUrl(),
          },
        });
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
          skipBrowserRedirect: true,
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, getRedirectUrl());
        
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const access_token = url.searchParams.get('access_token');
          const refresh_token = url.searchParams.get('refresh_token');
          
          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
          }
        }
      }
      
      return data;
    };

    const signInWithApple = async () => {
      console.log('[Auth] Sign in with Apple');
      
      if (Platform.OS === 'web') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: getRedirectUrl(),
          },
        });
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: getRedirectUrl(),
          skipBrowserRedirect: true,
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, getRedirectUrl());
        
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const access_token = url.searchParams.get('access_token');
          const refresh_token = url.searchParams.get('refresh_token');
          
          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
          }
        }
      }
      
      return data;
    };

    const signOut = async () => {
      console.log('[Auth] Sign out');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    };

    const resetPassword = async (email: string) => {
      console.log('[Auth] Reset password for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    };

    const updatePassword = async (newPassword: string) => {
      console.log('[Auth] Update password');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    };

    return {
      session,
      user,
      isLoading,
      isAuthenticated: !!session,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithApple,
      signOut,
      resetPassword,
      updatePassword,
    };
  }, [session, user, isLoading]);
});
