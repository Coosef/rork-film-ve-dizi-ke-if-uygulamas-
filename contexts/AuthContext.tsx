import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] Auth state changed:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Signing in with email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('[Auth] Sign in error:', error);
      throw error;
    }
    
    console.log('[Auth] Sign in successful:', data.user?.email);
    return data;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Signing up with email:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('[Auth] Sign up error:', error);
      throw error;
    }
    
    console.log('[Auth] Sign up successful:', data.user?.email);
    return data;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    console.log('[Auth] Signing in with Google');
    
    if (Platform.OS === 'web') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) {
        console.error('[Auth] Google sign in error:', error);
        throw error;
      }
      
      return data;
    } else {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'moviq://auth/callback',
        },
      });
      
      if (error) {
        console.error('[Auth] Google sign in error:', error);
        throw error;
      }
      
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'moviq://auth/callback'
        );
        
        if (result.type === 'success') {
          const url = result.url;
          const params = new URL(url).searchParams;
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
      
      return data;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    console.log('[Auth] Signing in with Apple');
    
    if (Platform.OS === 'web') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) {
        console.error('[Auth] Apple sign in error:', error);
        throw error;
      }
      
      return data;
    } else {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'moviq://auth/callback',
        },
      });
      
      if (error) {
        console.error('[Auth] Apple sign in error:', error);
        throw error;
      }
      
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'moviq://auth/callback'
        );
        
        if (result.type === 'success') {
          const url = result.url;
          const params = new URL(url).searchParams;
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
      
      return data;
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }
    
    console.log('[Auth] Sign out successful');
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('[Auth] Resetting password for:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Platform.OS === 'web' ? window.location.origin : 'moviq://auth/reset-password',
    });
    
    if (error) {
      console.error('[Auth] Reset password error:', error);
      throw error;
    }
    
    console.log('[Auth] Reset password email sent');
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    console.log('[Auth] Updating password');
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) {
      console.error('[Auth] Update password error:', error);
      throw error;
    }
    
    console.log('[Auth] Password updated successfully');
  }, []);

  return useMemo(() => ({
    session,
    user,
    isLoading,
    isAuthenticated: !!user,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    updatePassword,
  }), [session, user, isLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signOut, resetPassword, updatePassword]);
});
