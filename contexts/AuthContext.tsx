import createContextHook from '@nkzw/create-context-hook';
import { useMemo } from 'react';

const mockUser = {
  id: 'mock-user-id',
  email: 'user@moviq.app',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

export const [AuthProvider, useAuth] = createContextHook(() => {

  const signInWithEmail = async (email: string, password: string) => {
    console.log('[Auth] Mock sign in with email:', email);
    return { user: mockUser, session: null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    console.log('[Auth] Mock sign up with email:', email);
    return { user: mockUser, session: null };
  };

  const signInWithGoogle = async () => {
    console.log('[Auth] Mock sign in with Google');
    return { user: mockUser, session: null, url: null };
  };

  const signInWithApple = async () => {
    console.log('[Auth] Mock sign in with Apple');
    return { user: mockUser, session: null, url: null };
  };

  const signOut = async () => {
    console.log('[Auth] Mock sign out');
  };

  const resetPassword = async (email: string) => {
    console.log('[Auth] Mock reset password for:', email);
  };

  const updatePassword = async (newPassword: string) => {
    console.log('[Auth] Mock update password');
  };

  return useMemo(() => ({
    session: null,
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    updatePassword,
  }), []);
});
