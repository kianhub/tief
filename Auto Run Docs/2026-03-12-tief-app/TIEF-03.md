# TIEF-03: Data Layer — Types, SQLite, Supabase Client

> Define all TypeScript types, implement local SQLite database with full schema, create CRUD helpers, and initialize Supabase client.

## Prerequisites
- TIEF-02 completed (theme and constants exist)

## Reference
- Product spec §3.4 (Local SQLite schema), §3.5 (Supabase PostgreSQL schema)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `expo-sqlite` for the SDK 55 synchronous API (`openDatabaseSync`, `execSync`, `getAllSync`, `runSync`). Look up `@supabase/supabase-js` for client initialization and auth storage adapter patterns.
- **Skill: `expo-app-design:native-data-fetching`**: Invoke for data fetching patterns, Supabase client setup, and offline-first data strategies.

---

- [x] **Create TypeScript types for all entities in `src/types/index.ts`.** *(Completed: all entity interfaces, union types, composite helpers, and `parseTags`/`stringifyTags` utilities defined. `TopicCategory` re-exported from `@/constants/categories`. No TS errors.)* Define interfaces matching both the local SQLite schema and the Supabase schema. All `id` fields are `string` (UUIDs). All timestamps are ISO 8601 strings locally. Include:

```typescript
// Conversation status
export type ConversationStatus = 'active' | 'ended' | 'archived';
export type ConversationMode = 'voice' | 'text';
export type MessageRole = 'user' | 'assistant';
export type BlogPostStatus = 'generating' | 'ready' | 'edited';
export type BlogTone = 'auto' | 'casual' | 'reflective' | 'analytical' | 'poetic' | 'conversational';
export type NotificationFrequency = 'daily' | 'twice_daily' | 'few_times';
export type PromptDifficulty = 'light' | 'medium' | 'deep';
export type TopicCategory = /* import from categories */;

export interface Conversation {
  id: string;
  status: ConversationStatus;
  mode: ConversationMode;
  topic_category: TopicCategory | null;
  topic_prompt: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  elevenlabs_conversation_id: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  audio_url: string | null;
  timestamp: string;
  synced_at: string | null;
}

export interface BlogPost {
  id: string;
  conversation_id: string;
  title: string;
  content: string;  // markdown
  summary: string | null;
  tags: string;     // JSON array string locally
  share_slug: string | null;
  share_enabled: number; // 0 or 1 (SQLite boolean)
  status: BlogPostStatus;
  generated_at: string | null;
  edited_at: string | null;
  synced_at: string | null;
}

export interface UserPreference {
  key: string;
  value: string;
  updated_at: string;
}

export interface NotificationQueueItem {
  id: string;
  prompt: string;
  topic_category: TopicCategory | null;
  scheduled_for: string | null;
  delivered: number;
  opened: number;
  created_at: string;
}

// Supabase-specific types (for sync)
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  voice_preference: string;
  blog_tone: BlogTone | null;
  topic_interests: TopicCategory[];
  notification_times: Array<{ hour: number; minute: number }>;
  notification_frequency: NotificationFrequency;
  timezone: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptBankItem {
  id: string;
  category: TopicCategory;
  prompt: string;
  difficulty: PromptDifficulty;
  is_personalized: boolean;
  user_id: string | null;
  used_count: number;
  created_at: string;
}
```

Also export helper types: `ConversationWithBlogPost` (Conversation & { blog_post?: BlogPost }), `MessageWithConversation`, etc. Export a `parseTags` helper function that converts a JSON string to `string[]` and a `stringifyTags` helper that does the reverse.

- [x] **Create expo-sqlite database initialization and migration runner in `src/lib/db.ts`.** *(Completed: `getDatabase()`, `runMigrations()`, and `initDatabase()` implemented using sync API. Migration v1 creates all 5 tables with foreign keys, indexes, WAL mode, and foreign key enforcement. No TS errors.)* Use the `expo-sqlite` synchronous API (SDK 55 uses the new API):

```typescript
import * as SQLite from 'expo-sqlite';
```

Create a `getDatabase()` function that opens (or creates) the database named `'tief.db'`. Use `SQLite.openDatabaseSync('tief.db')`.

Create a `runMigrations(db)` function that:
1. Creates a `_migrations` table if not exists: `(id INTEGER PRIMARY KEY, version INTEGER UNIQUE, applied_at TEXT)`
2. Checks which migrations have been applied
3. Runs any pending migrations in order

Define migrations as an array. Migration v1 creates all tables from spec §3.4:
- `conversations` table with all columns
- `messages` table with foreign key
- `blog_posts` table with foreign key
- `user_preferences` table
- `notification_queue` table
- Add indexes: `CREATE INDEX idx_messages_conversation ON messages(conversation_id)`, `CREATE INDEX idx_blog_posts_conversation ON blog_posts(conversation_id)`, `CREATE INDEX idx_conversations_status ON conversations(status)`

Create an `initDatabase()` function that calls `getDatabase()` then `runMigrations()` and returns the db instance.

Export the db instance and init function. Use `execSync` for DDL statements and `runSync`/`getFirstSync`/`getAllSync` for DML.

- [x] **Create database CRUD helpers in `src/lib/db-helpers.ts`.** *(Completed: all CRUD helpers for conversations, messages, blog posts, and preferences implemented with parameterized queries, try/catch error handling, and correct type signatures. No TS errors.)* These are pure functions that take a database instance and perform operations. Group by entity:

**Conversations:**
- `insertConversation(db, conversation: Omit<Conversation, 'created_at'>): void`
- `updateConversation(db, id: string, updates: Partial<Conversation>): void`
- `getConversation(db, id: string): Conversation | null`
- `getRecentConversations(db, limit?: number): Conversation[]` — ordered by `started_at DESC`
- `getConversationsWithBlogStatus(db, limit?: number): Array<Conversation & { blog_status: BlogPostStatus | null }>` — JOIN with blog_posts

**Messages:**
- `insertMessage(db, message: Message): void`
- `getMessagesByConversation(db, conversationId: string): Message[]` — ordered by `timestamp ASC`
- `getUnsyncedMessages(db): Message[]` — where `synced_at IS NULL`

**Blog Posts:**
- `insertBlogPost(db, post: BlogPost): void`
- `updateBlogPost(db, id: string, updates: Partial<BlogPost>): void`
- `getBlogPost(db, id: string): BlogPost | null`
- `getBlogPostByConversation(db, conversationId: string): BlogPost | null`
- `getAllBlogPosts(db, category?: TopicCategory): BlogPost[]` — ordered by `generated_at DESC`, optional category filter
- `searchBlogPosts(db, query: string): BlogPost[]` — search title and content with LIKE

**Preferences:**
- `setPreference(db, key: string, value: string): void` — INSERT OR REPLACE
- `getPreference(db, key: string): string | null`
- `getAllPreferences(db): Record<string, string>`

All functions should use parameterized queries to prevent SQL injection. Use `try/catch` and log errors with `console.error`. Verify no TypeScript errors.

- [x] **Create Supabase client initialization in `src/lib/supabase.ts`.** *(Completed: Supabase client with SecureStore auth adapter, `getCurrentUser()`, `getProfile()`, and `updateProfile()` helpers. No TS errors.)* Initialize the Supabase client with auth persistence via `expo-secure-store`:

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@/constants/config';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

Also create helper functions:
- `getCurrentUser()` — returns the current auth user or null
- `getProfile(userId: string)` — fetches from profiles table
- `updateProfile(userId: string, updates: Partial<Profile>)` — updates profiles table

Export the client and helpers. Verify no TypeScript errors with `npx tsc --noEmit`.
