# TIEF-15: Polish, Haptics, States & Testing

> Add haptic feedback throughout, create empty/error/loading states, add spring animations everywhere, set up testing, and do a final TypeScript verification pass.

## Prerequisites
- All previous phases (TIEF-01 through TIEF-14) completed

## Reference
- Product spec §2.0.4 (Animation & Haptics), §2.0.3 (Spacing)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `expo-haptics` for all impact/notification/selection feedback APIs. Look up `react-native-reanimated` for layout animations (`FadeInDown`, `entering`/`exiting`), `withSpring` configs, and `springify()`. Look up `jest-expo` for test preset configuration.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for animation best practices, empty/error state design patterns, and page transition configuration.
- **Skill: `react-native-best-practices:react-native-best-practices`**: Invoke for performance audit — verify animations run on UI thread, no unnecessary re-renders, proper memoization.

---

- [x] **Add haptic feedback to all key interactions throughout the app.** Per spec §2.0.4, add haptics using `expo-haptics`:

Go through every interactive element and add the appropriate haptic:

| Interaction | Haptic | Location |
|---|---|---|
| Start conversation | `impactAsync(ImpactFeedbackStyle.Medium)` | conversation/[id].tsx on start |
| End conversation | `notificationAsync(NotificationFeedbackType.Success)` | EndConversationModal confirm |
| Share blog post | `impactAsync(ImpactFeedbackStyle.Light)` | post/[id].tsx share action |
| Toggle/switch | `selectionAsync()` | Settings toggles, mode switcher, mute button |
| Pull to refresh | `impactAsync(ImpactFeedbackStyle.Light)` | Library pull-to-refresh threshold |
| Tab switch | `selectionAsync()` | Tab bar onPress |
| Button press | `impactAsync(ImpactFeedbackStyle.Light)` | All Button component presses (add to Button.tsx) |
| Chip selection | `selectionAsync()` | Category chips, interest chips |
| Send message | `impactAsync(ImpactFeedbackStyle.Light)` | Text conversation send button |

Create a helper in `src/lib/haptics.ts`:
```typescript
import * as Haptics from 'expo-haptics';

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
};
```

Update the `Button` component to call `haptics.light()` on press by default (can be disabled with a `hapticDisabled` prop).

- [x] **Create designed empty states, error states, and loading states.** These should feel warm and intentional, NOT generic spinners and "Something went wrong" messages.
> Completed: Created `EmptyState`, `ErrorState`, `LoadingState`, and `SyncBanner` components in `src/components/ui/`. Integrated EmptyState into library (no posts + no search results), ErrorState into blog post (not found) and conversation (failed start), LoadingState into blog post (loading + generating), and SyncBanner into library for sync failures. All use spring/fade animations consistent with the design system.

**Create `src/components/ui/EmptyState.tsx`:**
```typescript
interface EmptyStateProps {
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}
```
- Centered vertically with generous padding
- Title in `title` serif, textPrimary
- Message in `body` textSecondary, below title with 12px gap
- Optional action Button below message with 24px gap
- Animate in: fade + translateY with gentle spring

**Specific empty states to add:**
1. Library (no posts): title "No posts yet", message "Start a conversation and your thoughts will appear here.", action "Start a Conversation →"
2. Home (no conversations): show just the prompt card, no recent section (already handled by conditional rendering, but make it graceful)
3. Search (no results): title "Nothing found", message "Try a different search term"

**Create `src/components/ui/ErrorState.tsx`:**
```typescript
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}
```
- Centered with warm styling
- Message in `body` textSecondary
- "Try again" button if `onRetry` provided
- NOT alarming — warm, subtle, helpful

**Add error states for:**
1. Conversation failed to start (network error)
2. Blog post failed to load
3. Sync failed (show subtle banner at top, not a full-screen error)

**Create `src/components/ui/LoadingState.tsx`:**
- Per spec anti-patterns: "No skeleton loading screens. Prefer meaningful transitions and progressive reveal."
- Instead of a spinner: show a subtle breathing animation using the voice orb shape (small, centered, idle state)
- Or: simple text "Loading..." in `body` textTertiary with gentle fade animation
- Keep it minimal

**Add loading states for:**
1. Blog post view while loading from DB (should be near-instant, but handle)
2. Blog post "generating" state: "Your post is being written..." with gentle animation
3. Initial app load (covered by splash screen)

- [x] **Add spring-based animations to all transitions and interactions per spec §2.0.4.** Verify every animated element uses springs (NOT duration-based timing):
> Completed: Converted all duration-based animations to spring physics. Added `slide_from_right` page transitions to root, auth, and onboarding Stack layouts. Updated Card scale to 0.98. Converted ErrorState, SyncBanner, post title, and library search animations from `duration()` to `springify()` with gentle/snappy configs. Added staggered `FadeInDown` with index-based delay to library BlogCard items. Added spring entrance animations (title fade + content slide-in with stagger) to all three onboarding screens (interests, notifications, voice-setup). Updated welcome footer animation to spring. Converted SelectSheet exit animation to spring. Modal overlay fades kept as timing per spec ("opacity 0→0.6, 200ms").

**Button press animation** (already in Button.tsx, verify):
- Scale 0.97 on press, spring back with `snappy` config

**Card press animation** (in Card.tsx, PromptCard.tsx, BlogCard.tsx):
- Scale 0.98 on press, spring back with `snappy` config

**Page transitions** (Expo Router):
In the root `_layout.tsx` and group layouts, configure screen animations:
```typescript
<Stack screenOptions={{
  animation: 'slide_from_right',
  animationDuration: 250,
  // For modals:
  presentation: 'modal',
}} />
```

For the conversation start: consider a shared element transition from the prompt card to the full-screen conversation (if Expo Router supports it in v7). If not, use a simple push animation.

**Modal animations** (EndConversationModal, SelectSheet):
- Overlay: fade in (opacity 0→0.6, 200ms)
- Content: slide up + spring with `gentle` config
- Dismiss: reverse

**List item animations:**
- Blog cards in library: stagger fade-in on load using `FadeInDown` with delay per index:
  ```typescript
  entering={FadeInDown.delay(index * 50).springify().damping(20).stiffness(200)}
  ```

**Onboarding transitions:**
- Each screen slides in with spring physics
- Elements on each screen fade + slide in with staggered timing

- [x] **Set up Jest testing framework and write unit tests.** Configure Jest with React Native preset:
> Completed: Installed jest@29, jest-expo@55, babel-preset-expo, and @types/jest. Created jest.config.js with jest-expo preset and `@/` path alias. Wrote 70 unit tests across 5 test suites: db-helpers (mock SQLite — conversations, messages, blog posts, preferences), time-utils (getGreeting with fake timers, formatDuration, formatRelativeTime), prompt-builder (placeholder filling, section validation, empty fields), theme (color palettes, typography variants, spring configs, spacing, radii), and text-utils (slugify, parseTags/stringifyTags round-trip). All 70 tests pass.

**Install test dependencies:**
```bash
npm install -D jest @testing-library/react-native @testing-library/jest-native jest-expo @types/jest
```

**Configure `jest.config.js`:**
```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterSetup: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*|@elevenlabs/.*|@shopify/.*|@livekit/.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**Write the following test files:**

**`src/lib/__tests__/db-helpers.test.ts`:**
- Mock expo-sqlite
- Test `insertConversation` creates a record
- Test `getRecentConversations` returns ordered results
- Test `insertMessage` and `getMessagesByConversation`
- Test `insertBlogPost`, `getBlogPost`, `getAllBlogPosts` with category filter
- Test `setPreference` and `getPreference`
- Test `searchBlogPosts` with matching and non-matching queries

**`src/lib/__tests__/time-utils.test.ts`:**
- Test `getGreeting` returns correct greeting for different hours
- Test `formatDuration` for various second values (30s, 90s, 3600s)
- Test `formatRelativeTime` for recent and older dates

**`src/lib/__tests__/prompt-builder.test.ts`:**
- Test `buildSystemPrompt` fills all placeholders correctly
- Test with empty/missing optional fields
- Test prompt includes all required sections (personality, style, context)

**`src/constants/__tests__/theme.test.ts`:**
- Test light and dark palettes have all required color keys
- Test typography scale has all required variants
- Test spring configs have correct shape (damping, stiffness, mass)

**`src/lib/__tests__/text-utils.test.ts`:**
- Test `slugify` converts titles to valid slugs
- Test `parseTags` and `stringifyTags` round-trip correctly

Run `npx jest` and verify all tests pass. Fix any failures.

- [x] **Final TypeScript, lint, and build verification.** Run through these checks:
> Completed: All 8 checks pass. Fixed tsconfig.json to exclude Supabase Edge Functions (Deno runtime) from tsc. Fixed 16 oxlint errors: 1 eqeqeq (`!=` → `!==`), 1 aria-role false positive (component prop), 14 exhaustive-deps (fixed dependency arrays and added disable comments for intentional patterns like Reanimated shared values). Removed `newArchEnabled` from app.json (default in SDK 52+). Memoized `currentInterests` in settings.tsx to prevent re-render loop. Zero TS errors, zero lint errors, 70/70 tests pass, expo-doctor 17/17, no hardcoded API keys, all routes verified, .gitignore complete.

1. `npx tsc --noEmit` — Zero TypeScript errors across the entire project
2. `npm run lint` — Zero oxlint errors (warnings are acceptable). Fix any errors found. Run `npm run lint:fix` first to auto-fix what it can.
3. `npx expo doctor` — No dependency issues
4. `npx jest` — All tests pass
5. Verify all imports resolve correctly (no circular dependencies — `import/no-cycle` is enforced by oxlint)
6. Verify all files referenced in the route structure exist
7. Check that no API keys are hardcoded (all use Config constants or env vars)
8. Verify `.gitignore` includes: `.env`, `.env.local`, `node_modules/`, `ios/`, `android/`, `.expo/`

If any TypeScript errors exist, fix them. Common issues:
- Missing type imports
- Incompatible hook return types
- Missing optional chaining on nullable fields
- expo-sqlite API type mismatches (SDK 55 uses new synchronous API)

After all checks pass, the codebase is ready for the user to:
1. Complete the steps in `/useractions/` (set up external services)
2. Fill in environment variables
3. Build a development client with EAS
4. Test on a physical device
