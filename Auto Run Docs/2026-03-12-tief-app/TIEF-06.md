# TIEF-06: Home Screen

> Implement the home screen with time-based greeting, featured prompt card, free-form topic input, and recent conversations list.

## Prerequisites
- TIEF-05 completed (tabs render, onboarding persists data)

## Reference
- Product spec §4.2 (Home Screen)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `expo-router` for `useFocusEffect`, `router.push` navigation. Look up `date-fns` for `formatDistanceToNow` and relative time formatting.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for component composition patterns, ScrollView best practices, and layout guidance.

---

- [x] **Create the home screen at `src/app/(tabs)/index.tsx`.** Replace the placeholder with the full home screen per spec §4.2:

**Layout (ScrollView):**
1. **Greeting** — Top section with generous top padding (64px + safe area)
   - "Good morning/afternoon/evening, [Name]." in `title` serif typography
   - Determine greeting based on current hour: morning (5-11), afternoon (12-16), evening (17-4)
   - Get name from `useAuth().profile?.display_name` or "there" as fallback
   - Animate in on mount: fade + slight translateY with `gentle` spring

2. **Featured Prompt Card** — The centerpiece. Create a `PromptCard` component (see next task).

3. **Free-form Input** — Below the card:
   - "or start with your own topic..." in `caption` secondary text
   - TextInput component: "What's on your mind?" placeholder
   - On submit, navigate to `conversation/new?topic={text}&mode=text`

4. **Recent Conversations** — Section below with divider:
   - "Recent Conversations" section header in `uiSmall` secondary text
   - List of recent conversations (see next task)
   - Show up to 5 most recent, with "See all →" link to library if more exist

**Data loading:**
- Use `useDatabase()` to get db instance
- Call `getConversationsWithBlogStatus(db, 5)` for recent conversations
- Call `getPreference(db, 'featured_prompt')` or generate a default prompt
- Use `useFocusEffect` from expo-router to refresh data when screen comes into focus

- [x] **Create `PromptCard` component at `src/components/conversation/PromptCard.tsx` and `RecentConversations` component at `src/components/conversation/RecentConversations.tsx`.**

**`PromptCard.tsx`:**
- Props: `prompt: string`, `category?: TopicCategory`, `onVoice: () => void`, `onText: () => void`
- Card component with slightly elevated feel (surface bg, subtle border)
- Prompt text in `body` serif typography, centered, with generous padding (32px vertical)
- If category provided, show small Chip at top with category color
- Two buttons at bottom, side by side:
  - "Let's Talk" (primary button with mic icon) → calls `onVoice`
  - "Text" (secondary button with chat icon) → calls `onText`
- Press animation on the whole card (subtle scale 0.98 on press)
- When `onVoice` is pressed: navigate to `conversation/new?topic=${prompt}&mode=voice&category=${category}`
- When `onText` is pressed: navigate to `conversation/new?topic=${prompt}&mode=text&category=${category}`

**`RecentConversations.tsx`:**
- Props: `conversations: Array<Conversation & { blog_status: BlogPostStatus | null }>`, `onPress: (id: string) => void`
- FlatList of conversation items (no virtualization needed for 5 items — just map)
- Each item shows:
  - Blog post title if available, or topic_prompt as fallback, or "Untitled Conversation"
  - Metadata line: relative time (use `date-fns` `formatDistanceToNow`), duration (format as "X min"), blog status indicator
  - Blog status: "Blog ✓" (accent secondary/sage color) if `ready`, "⏳" if `generating`, nothing if null
  - Mode indicator: small icon (mic for voice, chat bubble for text)
- Tap navigates to blog post view if blog is ready, or conversation if still active
- Style: minimal list items with bottom border separator (theme border color), 16px vertical padding each

Also create a helper `src/lib/time-utils.ts`:
- `getGreeting(): string` — returns "Good morning", "Good afternoon", or "Good evening"
- `formatDuration(seconds: number): string` — returns "X min" or "X hr Y min"
- `formatRelativeTime(isoDate: string): string` — wraps date-fns formatDistanceToNow with "ago" suffix

Verify the home screen renders with placeholder/empty data. `npx tsc --noEmit` should pass.
