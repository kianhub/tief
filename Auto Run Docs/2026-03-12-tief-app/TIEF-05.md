# TIEF-05: Tab Navigation & Onboarding Flow

> Implement tab layout with custom tab bar, onboarding 4-screen flow, and onboarding state persistence.

## Prerequisites
- TIEF-04 completed (auth flow, root layout with providers)

## Reference
- Product spec §4.1 (Onboarding), §5 (Navigation structure)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `expo-router` for `Tabs` component API, custom tab bar styling, `screenOptions`, and `tabBarButton`. Look up `expo-haptics` for `selectionAsync`. Look up `expo-audio` for `Audio.requestPermissionsAsync`.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for native tab bar customization, onboarding flow patterns, and screen transition animations.

---

- [x] **Create tab layout with custom tab bar at `src/app/(tabs)/_layout.tsx`.** Implement a warm, minimal tab bar:

The tab bar should use the `Tabs` component from `expo-router`:
```typescript
import { Tabs } from 'expo-router';
```

Three tabs per spec §4.2:
1. `index` — "Home" tab (house icon)
2. `library` — "Library" tab (book icon)
3. `settings` — "Settings" tab (gear icon)

Custom tab bar styling:
- Background: theme surface color with slight transparency
- No border on top — use a very subtle shadow or no separator (clean look)
- Icons: use simple SF Symbols or unicode icons. When active, use `textPrimary` color. When inactive, use `textTertiary` color.
- Labels: sans-serif `caption` size, same color logic as icons
- Active indicator: subtle dot below the icon (accent color, 4px circle), NOT a highlight background
- Tab bar height: 54px (content) + safe area bottom inset
- Add haptic feedback (`selectionAsync()`) on tab press via `tabBarButton` or listeners

Use `screenOptions` to set `headerShown: false` (each screen manages its own header), `tabBarStyle` for custom styling.

Also create placeholder screens so the app renders:
- `src/app/(tabs)/index.tsx` — Simple "Home" placeholder with ThemedView + ThemedText
- `src/app/(tabs)/library.tsx` — Simple "Library" placeholder
- `src/app/(tabs)/settings.tsx` — Simple "Settings" placeholder

The `(tabs)/_layout.tsx` should check `useAuth().isOnboarded` — if not onboarded, `<Redirect href="/(onboarding)/welcome" />`.

Verify tabs render and switching works. `npx tsc --noEmit` should pass.

- [ ] **Create onboarding layout and first two screens.**

**`src/app/(onboarding)/_layout.tsx`:**
- Stack navigator with `headerShown: false`
- Check `useAuth()` — if not authenticated, redirect to `/(auth)/sign-in`. If already onboarded, redirect to `/(tabs)`.
- Wrap in ThemedView with background color

**`src/app/(onboarding)/welcome.tsx`** per spec §4.1 Screen 1:
- Large vertical layout with generous top margin (30% from top)
- Display serif typography: "Your thoughts deserve\nto be heard."
- Below in body text: "tief. starts conversations that matter — and turns them into your personal writing."
- Large primary Button at bottom: "Get Started →"
- Button navigates to `interests`
- Gentle fade-in animation on mount using reanimated (opacity 0→1, translateY 20→0, gentle spring)
- Minimal — NO illustrations for MVP, just beautiful typography and whitespace

**`src/app/(onboarding)/interests.tsx`** per spec §4.1 Screen 2:
- Title in serif: "What do you like talking about?"
- Subtitle: "Tap all that interest you:"
- Grid of Chip components (from UI primitives) for all 10 categories from `src/constants/categories.ts` plus "Random — surprise me"
- Use category colors when selected, neutral when not
- Multi-select — maintain a `Set<TopicCategory>` state
- Require at least 1 selection to proceed
- Bottom: "You can change these anytime" in caption text
- Primary Button: "Continue →" → navigates to `notifications`
- Store selected interests in component state (persisted in next phase)

- [ ] **Create remaining onboarding screens and persist onboarding data.**

**`src/app/(onboarding)/notifications.tsx`** per spec §4.1 Screen 3:
- Title in serif: "When should we start a conversation?"
- Three time slot rows, each with:
  - Label ("Morning", "Afternoon", "Evening") with small icon/emoji
  - Time display (9:00 AM, 2:00 PM, 7:00 PM) — static for v1
  - Toggle switch (use RN `Switch` with accent color)
- Section: "How often?" with radio button group:
  - "Once a day" (value: 'daily')
  - "A couple times a day" (value: 'twice_daily')
  - "A few times a week" (value: 'few_times')
- Radio buttons: custom — circle outline, filled circle when selected (accent color)
- Primary Button: "Continue →" → navigates to `voice-setup`

**`src/app/(onboarding)/voice-setup.tsx`** per spec §4.1 Screen 4:
- Title in serif: "How should I sound?"
- Subtitle: "Pick a voice that feels right:"
- Grid/list of 10 voice options from `src/constants/voices.ts`
- Each voice option: Card with voice label, brief description, and a play button (▶)
- Play button triggers a short audio sample — for MVP, just log the press (actual audio requires ElevenLabs setup). Show a visual indicator that this will work once configured.
- Single select — highlight selected card with accent border
- Default selection: first voice
- Below voices: "We'll need microphone access for voice conversations. You can also chat by text anytime."
- Two buttons:
  - "Allow Microphone" — requests mic permission via `expo-audio` or `Audio.requestPermissionsAsync()`
  - "Maybe later — I'll use text" (secondary/ghost button)
- Primary Button at bottom: "Start My First Conversation →"

**On final button press (voice-setup):**
1. Gather all onboarding data: interests (from previous screen — pass via route params or a shared state/context), notification prefs, selected voice
2. Save to local DB via `setPreference()`: `'topic_interests'` (JSON array), `'notification_times'` (JSON), `'notification_frequency'`, `'voice_preference'` (voice ID), `'default_mode'` (voice or text based on mic permission)
3. Update Supabase profile: `updateProfile(userId, { topic_interests, notification_times, notification_frequency, voice_preference, onboarding_completed: true })`
4. The `isOnboarded` flag will update, and the routing guard will redirect to `/(tabs)`

Create a simple `OnboardingContext` (in `src/lib/onboarding-context.tsx`) that holds accumulated onboarding state across the 4 screens, so data flows forward without route params. Provide it in the `(onboarding)/_layout.tsx`. The context stores: `interests`, `notificationTimes`, `notificationFrequency`, `selectedVoiceId`, `defaultMode`.

Verify onboarding flow navigates correctly through all 4 screens and the final submit writes data. `npx tsc --noEmit` should pass.
