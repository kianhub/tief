import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { User, Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';

import { supabase, getProfile } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isOnboarded: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchOrCreateProfile(userId: string, displayName?: string): Promise<Profile | null> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      display_name: displayName ?? null,
      voice_preference: 'alloy',
      notification_frequency: 'daily',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      onboarding_completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create profile:', error);
    return null;
  }
  return data as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const p = await getProfile(userId);
    setProfile(p);
  }, []);

  // Restore session on mount and listen for auth changes
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          const p = await fetchOrCreateProfile(data.session.user.id);
          if (mounted) setProfile(p);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const p = await fetchOrCreateProfile(newSession.user.id);
        if (mounted) setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;

    // If user was immediately confirmed, create profile
    if (data.user) {
      const p = await fetchOrCreateProfile(data.user.id, displayName);
      setProfile(p);
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token returned from Apple');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;
  }, []);

  const handleSignOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [user, loadProfile]);

  const isOnboarded = profile?.onboarding_completed ?? false;

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      session,
      isLoading,
      isOnboarded,
      signInWithEmail,
      signUpWithEmail,
      signInWithApple,
      signOut: handleSignOut,
      refreshProfile,
    }),
    [user, profile, session, isLoading, isOnboarded, signInWithEmail, signUpWithEmail, signInWithApple, handleSignOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
