import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { useAuth } from '@/lib/auth-context';
import { useDatabase } from '@/lib/db-context';
import { syncAll, subscribeToBlogUpdates } from '@/lib/sync';
import { updateBlogPost } from '@/lib/db-helpers';

const SYNC_THROTTLE_MS = 60_000; // Don't sync more than once per 60s

export interface UseSyncReturn {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncNow: () => Promise<void>;
  error: string | null;
}

const SyncContext = createContext<UseSyncReturn | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isOnboarded } = useAuth();
  const db = useDatabase();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);
  const syncInProgressRef = useRef(false);

  const syncNow = useCallback(async () => {
    if (!user || !isOnboarded || syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncAll(db, user.id);
      setLastSyncAt(new Date().toISOString());
      lastSyncTimestampRef.current = Date.now();

      if (result.errors.length > 0) {
        setError(result.errors.join('; '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, [db, user, isOnboarded]);

  // Throttled sync — respects 60s cooldown
  const syncThrottled = useCallback(async () => {
    if (Date.now() - lastSyncTimestampRef.current < SYNC_THROTTLE_MS) return;
    await syncNow();
  }, [syncNow]);

  // Initial sync on mount when user is ready
  const hasInitialSynced = useRef(false);
  useEffect(() => {
    if (user && isOnboarded && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      syncNow();
    }
  }, [user, isOnboarded, syncNow]);

  // AppState listener: sync when app comes to foreground
  useEffect(() => {
    if (!user || !isOnboarded) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncThrottled();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user, isOnboarded, syncThrottled]);

  // NetInfo listener: sync on network reconnection
  useEffect(() => {
    if (!user || !isOnboarded) return;

    let wasConnected = true;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? false;
      if (!wasConnected && isConnected) {
        syncThrottled();
      }
      wasConnected = isConnected;
    });

    return unsubscribe;
  }, [user, isOnboarded, syncThrottled]);

  // Realtime subscription for blog post updates (generating → ready)
  useEffect(() => {
    if (!user || !isOnboarded) return;

    const channel = subscribeToBlogUpdates(user.id, (post) => {
      updateBlogPost(db, post.id, {
        title: post.title,
        content: post.content,
        summary: post.summary,
        tags: post.tags,
        share_slug: post.share_slug,
        share_enabled: post.share_enabled,
        status: post.status,
        generated_at: post.generated_at,
        edited_at: post.edited_at,
        synced_at: post.synced_at,
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [db, user, isOnboarded]);

  const value = useMemo<UseSyncReturn>(
    () => ({ isSyncing, lastSyncAt, syncNow, error }),
    [isSyncing, lastSyncAt, syncNow, error],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): UseSyncReturn {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return ctx;
}
