# TIEF-09: Text Conversation — Streaming Chat UI

> Build the text conversation screen with streaming Claude responses, chat bubbles, and the message input.

## Prerequisites
- TIEF-07 completed (Claude helpers, useConversation hook)

## Reference
- Product spec §4.4 (Text Conversation Screen), §3.3 (Claude Text Streaming)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `react-native-reanimated` for layout animations (`FadeInDown.springify()`, `entering`/`exiting` props). Look up `react-native` for `FlatList`, `KeyboardAvoidingView` patterns.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for chat UI patterns, keyboard handling, and FlatList optimization.
- **Skill: `expo-app-design:native-data-fetching`**: Reference for streaming response handling and AbortController usage.

---

- [x] **Create chat bubble components at `src/components/conversation/ChatBubble.tsx`.** Two visual styles: user messages and AI messages.

Per spec §2.0.1: "Differentiated by alignment and subtle bg, not color." Same typeface for both.

```typescript
interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;  // Show typing cursor at end
  timestamp?: string;
}
```

**User message bubble:**
- Right-aligned (alignSelf: 'flex-end')
- Background: theme surface color
- Border radius: 16px top-left, 16px top-right, 4px bottom-right, 16px bottom-left (rounded except sender corner)
- Max width: 80% of container
- Text: `chat` typography, textPrimary color
- Padding: 12px horizontal, 10px vertical

**AI message bubble:**
- Left-aligned (alignSelf: 'flex-start')
- Background: transparent (or very subtle — just 2-3% darker than background)
- No visible border, or very subtle border (theme border color)
- Same border radius pattern but mirrored: 16px all except 4px bottom-left
- Max width: 80% of container
- Text: same `chat` typography
- Padding: same

**Streaming indicator:**
- When `isStreaming` is true, show a blinking cursor character "▊" at the end of content
- Cursor blinks with opacity animation (0 ↔ 1, 530ms cycle)
- Use reanimated `withRepeat(withTiming(...))`

**Timestamp:**
- Below the bubble, in `caption` textTertiary
- Only show if provided, right-aligned for user, left-aligned for AI
- Format: "2:34 PM" using date-fns

**Animation on appear:**
- Each new bubble fades in + slides up slightly (opacity 0→1, translateY 8→0, snappy spring)
- Use `Animated.View` with `entering` prop from reanimated layout animations: `FadeInDown.springify().damping(20).stiffness(300)`

- [x] **Create the text conversation UI at `src/components/conversation/TextConversationView.tsx`.** ✅ Built with top bar (✕, duration, ⋮ menu with "End Conversation"), FlatList message list with ChatBubble rendering + streaming footer, inline MessageInput with send/voice buttons, KeyboardAvoidingView, and menu overlay. `npx tsc --noEmit` passes.

Per spec §4.4:

```typescript
interface TextConversationViewProps {
  conversationId: string;
  messages: Message[];
  currentStreamingText: string;
  onSendMessage: (text: string) => void;
  onSwitchToVoice: () => void;
  onEnd: () => void;
  duration: number;
}
```

**Layout:**

1. **Top bar** — Same as voice (✕ close, ⋮ menu), but also show duration

2. **Message list** — Main content area, `FlatList` (inverted: false):
   - Renders `ChatBubble` for each message in `messages`
   - If `currentStreamingText` is non-empty, render an additional AI ChatBubble with `isStreaming={true}` at the bottom
   - Auto-scroll to bottom when new messages arrive (use `ref.scrollToEnd()`)
   - `contentContainerStyle`: generous padding (24px horizontal, 16px between messages)
   - `keyboardDismissMode: 'interactive'` for natural keyboard interaction
   - Empty state: show the first AI message (the topic prompt) with a welcome feel

3. **Input bar** — Fixed at bottom (above keyboard):
   - `KeyboardAvoidingView` or handle keyboard with reanimated keyboard hooks
   - Left: TextInput flex-grow, placeholder "Type a message...", multi-line (max 4 lines)
   - Right side, two buttons:
     - Send button (accent color, arrow-up icon) — appears only when input has text
     - Voice button (🎤 icon, ghost) — calls `onSwitchToVoice`
   - Background: surface color
   - Top border: subtle theme border
   - Safe area padding at bottom

4. **Bottom controls overlay** — "End" button:
   - Position this in the top bar menu or as a small link, not as prominent as in voice mode
   - Could be in the ⋮ menu: tap opens a small sheet with "End Conversation" option

**Keyboard handling:**
- Use `KeyboardAvoidingView` with `behavior="padding"` on iOS
- Or better: use `react-native-keyboard-controller` if available, or just the built-in `KeyboardAvoidingView`
- Input bar should smoothly move up with keyboard

**Send flow:**
1. User types and taps send
2. Clear input immediately
3. Call `onSendMessage(text)`
4. Message appears in list (from messages state update)
5. AI streaming response starts appearing

- [ ] **Create a `MessageInput` component at `src/components/conversation/MessageInput.tsx`.** Extract the input bar for reusability:

```typescript
interface MessageInputProps {
  onSend: (text: string) => void;
  onVoicePress: () => void;
  placeholder?: string;
  disabled?: boolean;
}
```

Implementation:
- `TextInput` with `multiline`, `maxLength: 2000`
- Track text state locally
- Send button: only visible when text is non-empty (animate in/out with `FadeIn`/`FadeOut`)
- On send: call `onSend(text)`, clear local state, add haptic `impactAsync(Light)`
- Voice button: always visible on the right, calls `onVoicePress`
- Submit on enter key (when not shift+enter for multiline): actually, for mobile, just use the send button
- Disabled state: reduce opacity, disable input

Verify the text conversation view renders with mock messages. `npx tsc --noEmit` should pass.
