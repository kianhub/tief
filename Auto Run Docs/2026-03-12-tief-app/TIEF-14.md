# TIEF-14: Settings Screen & Sync Layer

> Create the settings screen with all preference sections, and implement the bidirectional sync engine between expo-sqlite and Supabase.

## Prerequisites
- TIEF-12 completed (blog post editing), TIEF-13 completed (notifications registered)

## Reference
- Product spec §4.8 (Settings Screen), §3.6 (Sync Strategy)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `@supabase/supabase-js` for Realtime subscriptions (`channel`, `on('postgres_changes')`, `subscribe`). Look up `@react-native-community/netinfo` for connectivity detection. Look up `expo-sharing` for data export.
- **Skill: `expo-app-design:native-data-fetching`**: Invoke for sync engine patterns, conflict resolution strategies, Realtime subscription lifecycle, and offline queue handling.
- **Skill: `expo-app-design:building-native-ui`**: Reference for settings screen patterns, Switch components, and bottom sheet modals.

---

- [ ] **Create the settings screen at `src/app/(tabs)/settings.tsx`.** Replace the placeholder with the full settings screen per spec §4.8:

**Layout** — `ScrollView` with sections:

1. **Profile section:**
   - "Profile" section header in `uiSmall` secondary, uppercase
   - Name row: "Name" label, current name value, chevron → navigates to edit
   - Account row: "Account" label, email display, "Edit →" → navigates to account details
   - Each row: 52px height, flexDirection row, justify space-between, bottom border

2. **Conversations section:**
   - "Topics I Like" → opens a modal/screen with the interests picker (reuse onboarding interests UI)
   - "AI Voice" → opens voice selection (reuse onboarding voice-setup UI)
   - "Default Mode" → segmented control: Voice | Text (toggle between them)

3. **Blog Posts section:**
   - "Writing Tone" → opens a selector sheet with options: Auto-match (default), Casual, Reflective, Analytical, Poetic, Conversational
   - Show current selection as value text

4. **Notifications section:**
   - "Conversation Prompts" → toggle Switch (on/off)
   - "Times" → opens time configuration (reuse onboarding notification times)
   - "Frequency" → opens frequency selector (Daily, Couple times a day, Few times a week)

5. **Data section:**
   - "Export My Data" → triggers data export (see below)
   - "Delete Account" → shows destructive confirmation modal

6. **About section:**
   - "Privacy Policy" → opens URL in browser (placeholder URL for now)
   - "Terms of Service" → opens URL in browser
   - "Version 1.0.0" — static text in textTertiary

**Settings row component** — Create `src/components/ui/SettingsRow.tsx`:
```typescript
interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;  // For Switch, segmented control, etc.
  destructive?: boolean;           // Red text for delete
}
```
- Pressable row with label left, value/chevron right
- 52px height, horizontal padding 24px
- Bottom border in theme border color
- When `destructive`: label in terracotta/red color

**Preference persistence:**
- All changes save immediately to local DB via `setPreference()`
- Also update Supabase profile via `updateProfile()`
- Use `useAuth().refreshProfile()` after updates

**Data export:**
- Fetch all conversations, messages, and blog posts from local DB
- Create a JSON object with all data
- Write to temp file, share via `expo-sharing`

**Delete account:**
- Show a confirmation modal: "This will permanently delete all your data. This cannot be undone."
- Require typing "DELETE" to confirm
- On confirm: call `supabase.rpc('delete_user_data', { user_id })` or a dedicated edge function
- Then `signOut()`, navigate to auth

**Selector sheets/modals** — For tone, frequency, etc.:
- Create a reusable `SelectSheet` component at `src/components/ui/SelectSheet.tsx`:
  ```typescript
  interface SelectSheetProps<T> {
    visible: boolean;
    title: string;
    options: Array<{ label: string; value: T; description?: string }>;
    selected: T;
    onSelect: (value: T) => void;
    onClose: () => void;
  }
  ```
- Modal that slides up from bottom with `gentle` spring
- Warm overlay background
- List of options with radio indicators
- Currently selected option highlighted

- [ ] **Create the sync engine at `src/lib/sync.ts`.** Bidirectional sync between expo-sqlite and Supabase per spec §3.6:

```typescript
import { supabase } from './supabase';
import type { Conversation, Message, BlogPost } from '@/types';

interface SyncResult {
  pushed: { conversations: number; messages: number; blogPosts: number };
  pulled: { conversations: number; messages: number; blogPosts: number };
  errors: string[];
}
```

**Core sync function:**
```typescript
export async function syncAll(db: SQLiteDatabase, userId: string): Promise<SyncResult> {
  const result: SyncResult = { pushed: {...}, pulled: {...}, errors: [] };

  // 1. PUSH: Upload local changes to Supabase
  await pushConversations(db, userId, result);
  await pushMessages(db, userId, result);
  await pushBlogPosts(db, userId, result);

  // 2. PULL: Download remote changes to local DB
  await pullConversations(db, userId, result);
  await pullMessages(db, userId, result);
  await pullBlogPosts(db, userId, result);

  // 3. Update last sync timestamp
  setPreference(db, 'last_sync_at', new Date().toISOString());

  return result;
}
```

**Push implementation (for each entity):**
1. Query local DB for records where `synced_at IS NULL` (never synced) or `updated_at > synced_at` (modified since last sync)
2. Upsert to Supabase (use `supabase.from(table).upsert()`)
3. On success, update `synced_at` in local DB to `NOW()`
4. On failure, add error to result (don't fail the whole sync)

**Pull implementation:**
1. Get `last_sync_at` from preferences
2. Query Supabase for records where `updated_at > last_sync_at` (or all if first sync)
3. For each record:
   - Check if it exists locally
   - If not, insert locally
   - If yes, compare timestamps — most recent write wins (spec §3.6: "conflict resolution favoring the most recent write")
   - Update `synced_at` locally

**Sync triggers** (per spec §3.6, integrate these into the app):
- App comes to foreground → `AppState` listener in root layout, call `syncAll`
- Conversation ends → already handled in end-conversation flow
- Blog post edited → already handled in editor save
- Network reconnection → use `NetInfo` from `@react-native-community/netinfo` (install it), sync on reconnect

**Supabase Realtime subscriptions:**
```typescript
export function subscribeToBlogUpdates(userId: string, onUpdate: (post: BlogPost) => void) {
  return supabase
    .channel('blog-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'blog_posts',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      onUpdate(payload.new as BlogPost);
    })
    .subscribe();
}
```

When a blog post status changes from 'generating' to 'ready' on the server, the Realtime subscription notifies the client, which:
1. Updates the local DB record
2. Triggers a re-render in the library/home screen (the blog status indicator changes from ⏳ to ✓)

- [ ] **Create `useSync` hook at `src/hooks/useSync.ts` and integrate into the app.**

```typescript
interface UseSyncReturn {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncNow: () => Promise<void>;
  error: string | null;
}
```

Implementation:
1. Track sync state (syncing, lastSyncAt, error)
2. `syncNow` calls `syncAll(db, userId)`, updates state
3. Set up Realtime subscriptions on mount (for blog post updates)
4. Set up AppState listener: sync when app comes to foreground (but not more than once per 60 seconds)
5. Clean up subscriptions on unmount

**Integrate in root layout:**
```typescript
// In _layout.tsx, after auth is resolved:
const { syncNow } = useSync();

useEffect(() => {
  if (user && profile?.onboarding_completed) {
    syncNow(); // Initial sync on app start
  }
}, [user]);
```

**Add pull-to-refresh to library screen:**
```typescript
<ScrollView
  refreshControl={
    <RefreshControl refreshing={isSyncing} onRefresh={syncNow} />
  }
>
```

Add haptic feedback at pull threshold: `impactAsync(Light)`.

Install `@react-native-community/netinfo` if not already: `npx expo install @react-native-community/netinfo`. Verify no TypeScript errors.
