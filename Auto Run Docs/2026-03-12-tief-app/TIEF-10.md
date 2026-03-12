# TIEF-10: Conversation Route, End Flow & Blog Trigger

> Create the unified conversation/[id] route that renders voice or text, mode switching, end-of-conversation confirmation, and blog generation trigger.

## Prerequisites
- TIEF-08 and TIEF-09 completed (voice and text conversation UIs)

## Reference
- Product spec §4.3-4.5 (Conversation screens, End flow), §9.1 (Mode switching)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `expo-router` for `useLocalSearchParams`, dynamic routes `[id]`, `router.replace`, and back navigation handling. Look up `@supabase/supabase-js` for `functions.invoke` and `from().upsert()`.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for modal patterns, cross-fade transitions, and navigation guard implementation.
- **Skill: `expo-app-design:native-data-fetching`**: Reference for Supabase function invocation and batch upsert patterns.

---

- [x] **Create the conversation route at `src/app/conversation/[id].tsx`.** This is the unified conversation screen that renders either voice or text mode:

> Completed: Route parses params, initializes new/existing conversations, renders voice/text with cross-fade mode switching (200ms), back navigation guard (beforeRemove + BackHandler), ElevenLabs adapter wired via ref, StatusBar switches light/auto per mode, haptic on start. Added `resumeConversation` to useConversation hook. Added ElevenLabsProvider to root layout. Inline EndConfirmationOverlay serves as placeholder until task 2.

```typescript
// Route params: conversation/[id]
// For new conversations: conversation/new?topic=...&mode=voice|text&category=...
// For resuming: conversation/[uuid] (loads from DB)
```

**Implementation:**

1. **Parse route params** using `useLocalSearchParams()` from expo-router:
   - `id`: 'new' or an existing conversation UUID
   - `topic`: the conversation starter text (for new conversations)
   - `mode`: 'voice' or 'text'
   - `category`: TopicCategory (optional)

2. **Initialize the conversation:**
   - If `id === 'new'`: call `startConversation({ mode, topicPrompt: topic, topicCategory: category })`
   - If `id !== 'new'`: load existing conversation from DB, resume (only if status is 'active')

3. **Render based on mode:**
   ```tsx
   {mode === 'voice' ? (
     <VoiceConversationView
       conversationId={conversationId}
       messages={messages}
       isAISpeaking={isAISpeaking}
       isUserSpeaking={isUserSpeaking}
       amplitude={voiceAmplitude}
       isMuted={isMuted}
       duration={duration}
       onToggleMute={toggleMute}
       onSwitchToText={() => switchMode('text')}
       onEnd={() => setShowEndModal(true)}
     />
   ) : (
     <TextConversationView
       conversationId={conversationId}
       messages={messages}
       currentStreamingText={currentStreamingText}
       onSendMessage={sendTextMessage}
       onSwitchToVoice={() => switchMode('voice')}
       onEnd={() => setShowEndModal(true)}
       duration={duration}
     />
   )}
   ```

4. **Mode switching animation:**
   - Wrap both views in `Animated.View`
   - On switch: current view fades out (opacity 1→0, 200ms), new view fades in (opacity 0→1, 200ms)
   - Or use a cross-fade transition

5. **Back navigation guard:**
   - Override hardware back / swipe-back: show confirmation "End this conversation?" if conversation is active
   - If conversation is ended, allow normal back navigation

6. **ElevenLabs Provider:**
   - The voice conversation needs `ElevenLabsProvider` or the `useConversation` hook from `@elevenlabs/react-native`
   - If ElevenLabs is used at component level: wrap the voice view in a component that manages the ElevenLabs hook
   - Pass callbacks (onMessage, onConnect, onDisconnect, onModeChange) up to our useConversation hook

7. **Status bar:** Set to light content (white) for voice mode dark background, auto for text mode.

Use `expo-haptics` `impactAsync(Medium)` when conversation starts.

- [x] **Create the end-of-conversation modal and blog generation trigger.** Create `src/components/conversation/EndConversationModal.tsx`:

> Completed: Created `EndConversationModal` component with warm semi-transparent overlay (light/dark adaptive), `gentle` spring card animation (translateY + scale), serif "Great conversation." title, body text about background blog generation, "Go to Home →" primary button, and "Keep talking" ghost link. Updated `endConversation()` in `useConversation` hook to: sync conversation to Supabase with `upsert`, create local `blog_posts` record with status `'generating'`, and fire-and-forget invoke `generate-blog-post` edge function. Replaced inline `EndConfirmationOverlay` placeholder in `[id].tsx` with the new modal. `npx tsc --noEmit` passes.

Per spec §4.5 — this is a warm confirmation, NOT a standard alert dialog:

```typescript
interface EndConversationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Design:**
- Modal overlay: warm semi-transparent background (`rgba(44, 40, 37, 0.6)` light mode, `rgba(28, 26, 24, 0.8)` dark mode)
- Centered card with `gentle` spring animation (slides up from center with spring)
- Content:
  - "Great conversation." in `title` serif
  - "Your post is being written in the background. We'll let you know when it's ready to read." in `body` secondary text
  - Primary Button: "Go to Home →"
  - Ghost link below: "Keep talking" (cancels the end)
- On confirm:
  1. Call `endConversation()` from the hook
  2. Haptic: `notificationAsync(NotificationFeedbackType.Success)`
  3. Navigate to home: `router.replace('/(tabs)')`

**Blog generation trigger flow (inside `endConversation()`):**
1. Update conversation status to 'ended' in local DB
2. Sync all messages to Supabase:
   ```typescript
   // Batch insert messages
   const { error } = await supabase.from('messages').upsert(
     messages.map(m => ({ ...m, user_id: userId }))
   );
   // Update conversation in Supabase
   await supabase.from('conversations').upsert({
     ...conversation, user_id: userId, status: 'ended'
   });
   ```
3. Create a blog_post record locally with status 'generating'
4. Invoke the blog generation edge function:
   ```typescript
   await supabase.functions.invoke('generate-blog-post', {
     body: { conversation_id: conversationId }
   });
   ```
   This is fire-and-forget — don't await the blog generation itself.
5. Subscribe to blog post status changes via Supabase Realtime (handled in sync layer)

- [ ] **Create conversation initiation flow helpers.** Create `src/lib/conversation-starter.ts`:

This module handles the different ways a conversation can be started:

**`startFromPrompt(topic, category, mode)`** — Called from home screen prompt card:
1. Generate UUID for conversation
2. Navigate to `conversation/${uuid}?topic=${topic}&mode=${mode}&category=${category}`

**`startFromCustomTopic(topic, mode)`** — Called from home screen free-form input:
1. Generate UUID
2. Navigate similarly, category defaults to 'random'

**`startFromNotification(data)`** — Called from push notification handler:
1. Parse notification data (prompt_text, category, preferred mode)
2. Navigate to conversation

**`resumeConversation(conversationId)`** — Load from DB and navigate:
1. Get conversation from DB
2. Navigate to `conversation/${conversationId}` (no extra params, loaded from DB)

Each function uses `router.push()` from expo-router. Export all functions.

Also update the home screen `PromptCard` and free-form input to use these helpers.

Verify the full conversation lifecycle works: start → messages → end → confirmation → home. `npx tsc --noEmit` should pass.
