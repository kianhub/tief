import type { SQLiteDatabase } from 'expo-sqlite';
import { supabase } from './supabase';
import {
  getPreference,
  setPreference,
  insertConversation,
  updateConversation,
  getConversation,
  insertMessage,
  updateBlogPost,
  getBlogPost,
  insertBlogPost,
} from './db-helpers';
import type { Conversation, Message, BlogPost } from '@/types';
import { parseTags, stringifyTags } from '@/types';

// --- Types ---

export interface SyncResult {
  pushed: { conversations: number; messages: number; blogPosts: number };
  pulled: { conversations: number; messages: number; blogPosts: number };
  errors: string[];
}

// --- Local queries for unsynced data ---

function getUnsyncedConversations(db: SQLiteDatabase): Conversation[] {
  return db.getAllSync<Conversation>(
    "SELECT * FROM conversations WHERE synced_at IS NULL AND status = 'ended'"
  );
}

function getUnsyncedMessages(db: SQLiteDatabase): Message[] {
  return db.getAllSync<Message>(
    'SELECT * FROM messages WHERE synced_at IS NULL'
  );
}

function getUnsyncedBlogPosts(db: SQLiteDatabase): BlogPost[] {
  return db.getAllSync<BlogPost>(
    'SELECT * FROM blog_posts WHERE synced_at IS NULL'
  );
}

// --- Push: local → Supabase ---

async function pushConversations(
  db: SQLiteDatabase,
  userId: string,
  result: SyncResult
): Promise<void> {
  const unsynced = getUnsyncedConversations(db);
  if (unsynced.length === 0) return;

  try {
    const { error } = await supabase.from('conversations').upsert(
      unsynced.map((c) => ({
        id: c.id,
        user_id: userId,
        status: c.status,
        mode: c.mode,
        topic_category: c.topic_category,
        topic_prompt: c.topic_prompt,
        started_at: c.started_at,
        ended_at: c.ended_at,
        duration_seconds: c.duration_seconds,
      })),
      { onConflict: 'id' }
    );

    if (error) {
      result.errors.push(`Push conversations: ${error.message}`);
      return;
    }

    const syncedAt = new Date().toISOString();
    for (const c of unsynced) {
      updateConversation(db, c.id, { synced_at: syncedAt });
    }
    result.pushed.conversations = unsynced.length;
  } catch (err) {
    result.errors.push(
      `Push conversations: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function pushMessages(
  db: SQLiteDatabase,
  _userId: string,
  result: SyncResult
): Promise<void> {
  const unsynced = getUnsyncedMessages(db);
  if (unsynced.length === 0) return;

  try {
    const { error } = await supabase.from('messages').upsert(
      unsynced.map((m) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        role: m.role,
        content: m.content,
        audio_url: m.audio_url,
        timestamp: m.timestamp,
      })),
      { onConflict: 'id' }
    );

    if (error) {
      result.errors.push(`Push messages: ${error.message}`);
      return;
    }

    const syncedAt = new Date().toISOString();
    const placeholders = unsynced.map(() => '?').join(',');
    db.runSync(
      `UPDATE messages SET synced_at = ? WHERE id IN (${placeholders})`,
      [syncedAt, ...unsynced.map((m) => m.id)]
    );
    result.pushed.messages = unsynced.length;
  } catch (err) {
    result.errors.push(
      `Push messages: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function pushBlogPosts(
  db: SQLiteDatabase,
  userId: string,
  result: SyncResult
): Promise<void> {
  const unsynced = getUnsyncedBlogPosts(db);
  // Only push posts that have actual content (skip 'generating' placeholders)
  const pushable = unsynced.filter((p) => p.status !== 'generating');
  if (pushable.length === 0) return;

  try {
    const { error } = await supabase.from('blog_posts').upsert(
      pushable.map((p) => ({
        id: p.id,
        conversation_id: p.conversation_id,
        user_id: userId,
        title: p.title,
        content: p.content,
        summary: p.summary,
        tags: parseTags(p.tags),
        share_slug: p.share_slug,
        share_enabled: p.share_enabled === 1,
        status: p.status,
        generated_at: p.generated_at,
        edited_at: p.edited_at,
      })),
      { onConflict: 'id' }
    );

    if (error) {
      result.errors.push(`Push blog posts: ${error.message}`);
      return;
    }

    const syncedAt = new Date().toISOString();
    for (const p of pushable) {
      updateBlogPost(db, p.id, { synced_at: syncedAt });
    }
    result.pushed.blogPosts = pushable.length;
  } catch (err) {
    result.errors.push(
      `Push blog posts: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// --- Pull: Supabase → local ---

async function pullConversations(
  db: SQLiteDatabase,
  userId: string,
  lastSyncAt: string | null,
  result: SyncResult
): Promise<void> {
  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId);

    if (lastSyncAt) {
      query = query.gt('updated_at', lastSyncAt);
    }

    const { data, error } = await query;
    if (error) {
      result.errors.push(`Pull conversations: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) return;

    const syncedAt = new Date().toISOString();
    for (const remote of data) {
      const local = getConversation(db, remote.id);

      if (!local) {
        insertConversation(db, {
          id: remote.id,
          status: remote.status,
          mode: remote.mode,
          topic_category: remote.topic_category,
          topic_prompt: remote.topic_prompt,
          started_at: remote.started_at,
          ended_at: remote.ended_at,
          duration_seconds: remote.duration_seconds,
          elevenlabs_conversation_id: null,
          synced_at: syncedAt,
        });
        result.pulled.conversations++;
      } else {
        // Conflict resolution: most recent write wins
        const remoteTs = remote.updated_at || remote.ended_at || remote.started_at;
        const localTs = local.ended_at || local.started_at;
        if (remoteTs > localTs) {
          updateConversation(db, remote.id, {
            status: remote.status,
            mode: remote.mode,
            topic_category: remote.topic_category,
            topic_prompt: remote.topic_prompt,
            ended_at: remote.ended_at,
            duration_seconds: remote.duration_seconds,
            synced_at: syncedAt,
          });
          result.pulled.conversations++;
        }
      }
    }
  } catch (err) {
    result.errors.push(
      `Pull conversations: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function pullMessages(
  db: SQLiteDatabase,
  userId: string,
  lastSyncAt: string | null,
  result: SyncResult
): Promise<void> {
  try {
    // Messages don't have user_id — join through conversations
    let query = supabase
      .from('messages')
      .select('*, conversations!inner(user_id)')
      .eq('conversations.user_id', userId);

    if (lastSyncAt) {
      query = query.gt('timestamp', lastSyncAt);
    }

    const { data, error } = await query;
    if (error) {
      result.errors.push(`Pull messages: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) return;

    const syncedAt = new Date().toISOString();
    for (const remote of data) {
      const existing = db.getFirstSync<Message>(
        'SELECT * FROM messages WHERE id = ?',
        [remote.id]
      );

      if (!existing) {
        insertMessage(db, {
          id: remote.id,
          conversation_id: remote.conversation_id,
          role: remote.role,
          content: remote.content,
          audio_url: remote.audio_url,
          timestamp: remote.timestamp,
          synced_at: syncedAt,
        });
        result.pulled.messages++;
      }
      // Messages are immutable once created — no conflict resolution needed
    }
  } catch (err) {
    result.errors.push(
      `Pull messages: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function pullBlogPosts(
  db: SQLiteDatabase,
  userId: string,
  lastSyncAt: string | null,
  result: SyncResult
): Promise<void> {
  try {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('user_id', userId);

    if (lastSyncAt) {
      query = query.gt('updated_at', lastSyncAt);
    }

    const { data, error } = await query;
    if (error) {
      result.errors.push(`Pull blog posts: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) return;

    const syncedAt = new Date().toISOString();
    for (const remote of data) {
      const local = getBlogPost(db, remote.id);

      // Convert Supabase format → local SQLite format
      const localData: Omit<BlogPost, 'id'> = {
        conversation_id: remote.conversation_id,
        title: remote.title,
        content: remote.content,
        summary: remote.summary ?? null,
        tags: stringifyTags(
          Array.isArray(remote.tags) ? remote.tags : []
        ),
        share_slug: remote.share_slug ?? null,
        share_enabled: remote.share_enabled ? 1 : 0,
        status: remote.status,
        generated_at: remote.generated_at ?? null,
        edited_at: remote.edited_at ?? null,
        synced_at: syncedAt,
      };

      if (!local) {
        insertBlogPost(db, { id: remote.id, ...localData });
        result.pulled.blogPosts++;
      } else {
        // Key case: blog post moved from 'generating' to 'ready' on server
        // or remote edit is newer than local
        const remoteTs = remote.updated_at || remote.edited_at || remote.generated_at;
        const localTs = local.edited_at || local.generated_at;

        const remoteIsNewer = remoteTs && localTs && remoteTs > localTs;
        const localIsPlaceholder = local.status === 'generating' && remote.status === 'ready';

        if (localIsPlaceholder || remoteIsNewer) {
          updateBlogPost(db, remote.id, localData);
          result.pulled.blogPosts++;
        }
      }
    }
  } catch (err) {
    result.errors.push(
      `Pull blog posts: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// --- Core sync ---

export async function syncAll(
  db: SQLiteDatabase,
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: { conversations: 0, messages: 0, blogPosts: 0 },
    pulled: { conversations: 0, messages: 0, blogPosts: 0 },
    errors: [],
  };

  const lastSyncAt = getPreference(db, 'last_sync_at');

  // 1. PUSH: Upload local changes to Supabase
  await pushConversations(db, userId, result);
  await pushMessages(db, userId, result);
  await pushBlogPosts(db, userId, result);

  // 2. PULL: Download remote changes to local DB
  await pullConversations(db, userId, lastSyncAt, result);
  await pullMessages(db, userId, lastSyncAt, result);
  await pullBlogPosts(db, userId, lastSyncAt, result);

  // 3. Update last sync timestamp
  setPreference(db, 'last_sync_at', new Date().toISOString());

  return result;
}

// --- Supabase Realtime subscriptions ---

export function subscribeToBlogUpdates(
  userId: string,
  onUpdate: (post: BlogPost) => void
) {
  return supabase
    .channel('blog-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'blog_posts',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const remote = payload.new as Record<string, unknown>;
        // Convert Supabase format → local BlogPost format
        const post: BlogPost = {
          id: remote.id as string,
          conversation_id: remote.conversation_id as string,
          title: remote.title as string,
          content: remote.content as string,
          summary: (remote.summary as string) ?? null,
          tags: stringifyTags(
            Array.isArray(remote.tags) ? (remote.tags as string[]) : []
          ),
          share_slug: (remote.share_slug as string) ?? null,
          share_enabled: remote.share_enabled ? 1 : 0,
          status: remote.status as BlogPost['status'],
          generated_at: (remote.generated_at as string) ?? null,
          edited_at: (remote.edited_at as string) ?? null,
          synced_at: new Date().toISOString(),
        };
        onUpdate(post);
      }
    )
    .subscribe();
}
