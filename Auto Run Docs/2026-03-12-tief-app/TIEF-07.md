# TIEF-07: Conversation Engine — Hooks & Helpers

> Build the core conversation engine: ElevenLabs voice helpers, Claude text helpers, and the unified useConversation hook.

## Prerequisites
- TIEF-06 completed (home screen with navigation to conversation)

## Reference
- Product spec §3.2 (ElevenLabs Agent), §3.3 (Claude Text), §6.1 (System Prompt), §9.1 (Mode Switching)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `@elevenlabs/react-native` for the Conversational AI SDK (useConversation hook, session config, onMessage events, overrides). Look up Anthropic Claude API for `/v1/messages` streaming format and SSE parsing.
- **Skill: `claude-api`**: Invoke for correct Claude API message format, streaming patterns, and system prompt usage.
- **Skill: `expo-app-design:native-data-fetching`**: Invoke for SSE/streaming fetch patterns, AbortController usage, and error handling in React Native.

---

- [x] **Create ElevenLabs helper module at `src/lib/elevenlabs.ts`.** This module wraps the ElevenLabs SDK for voice conversation management:

```typescript
import { Config } from '@/constants/config';
```

Functions to implement:

**`buildSystemPrompt(params)`** — Constructs the full system prompt per spec §6.1:
```typescript
interface PromptParams {
  topicPrompt: string;
  topicCategory: string;
  userName: string;
  userInterests: string[];
  recentThemes: string[];
}
```
Returns the complete system prompt string with all `{{placeholders}}` filled in. Use the exact prompt template from spec §6.1 — personality, conversation style, topic context, user context, and the important rules about being conversational (not an interview).

**`buildSessionConfig(params)`** — Returns the ElevenLabs session override config:
```typescript
interface SessionConfig {
  agentId: string;
  overrides: {
    agent: {
      prompt: { prompt: string };
      firstMessage: string;
    };
  };
}
```
Returns config object with `Config.ELEVENLABS_AGENT_ID`, the built system prompt, and the topic prompt as `firstMessage`.

**`extractTranscriptFromEvents(events)`** — Utility to collect `onMessage` events into a structured transcript array of `{ role, content, timestamp }`.

Export all functions. Add JSDoc comments explaining the ElevenLabs integration pattern.

- [ ] **Create Claude API proxy helper module at `src/lib/claude.ts`.** This module handles text conversation with Claude via the Supabase proxy edge function:

```typescript
import { supabase } from './supabase';
import type { Message } from '@/types';
```

**`streamMessage(params)`** — Sends a message and streams the response:
```typescript
interface StreamParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemPrompt: string;
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}
```

Implementation:
1. Get the current session token: `const { data: { session } } = await supabase.auth.getSession()`
2. Call the Supabase edge function `proxy-claude` with auth header:
   ```typescript
   const response = await fetch(`${Config.SUPABASE_URL}/functions/v1/proxy-claude`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${session?.access_token}`,
     },
     body: JSON.stringify({ messages, system_prompt: systemPrompt }),
     signal,
   });
   ```
3. Read the response as a readable stream (SSE format)
4. Parse each SSE chunk: look for `data:` lines, extract text deltas
5. Call `onChunk` with each text delta (for streaming display)
6. Accumulate the full text, call `onComplete` when stream ends
7. Handle errors: network failures, auth errors, stream interruptions

**`buildConversationHistory(messages: Message[])`** — Converts local message records to Claude API format `{ role, content }[]`. Filter out any system messages.

**`buildTextSystemPrompt(params: PromptParams)`** — Reuses the same prompt template from elevenlabs.ts. Extract the shared `buildSystemPrompt` into a common module (`src/lib/prompt-builder.ts`) and import it in both `elevenlabs.ts` and `claude.ts`.

- [ ] **Create the unified `useConversation` hook at `src/hooks/useConversation.ts`.** This is the central state machine for conversations:

```typescript
type ConversationPhase = 'idle' | 'starting' | 'active' | 'ending' | 'ended';

interface UseConversationReturn {
  // State
  phase: ConversationPhase;
  mode: ConversationMode;
  conversationId: string | null;
  messages: Message[];
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  currentStreamingText: string;  // For text mode: partial AI response
  error: string | null;

  // Actions
  startConversation: (params: StartParams) => Promise<void>;
  sendTextMessage: (text: string) => Promise<void>;
  switchMode: (newMode: ConversationMode) => Promise<void>;
  endConversation: () => Promise<void>;
  toggleMute: () => void;

  // Voice-specific
  isMuted: boolean;
  voiceAmplitude: number;  // 0-1, for orb animation

  // Metadata
  duration: number;  // seconds since start, updates every second
  topicPrompt: string | null;
  topicCategory: TopicCategory | null;
}

interface StartParams {
  mode: ConversationMode;
  topicPrompt: string;
  topicCategory?: TopicCategory;
}
```

Implementation details:

**Starting a conversation:**
1. Generate a UUID for conversation ID
2. Insert conversation record into local DB (status: 'active')
3. Build system prompt using user profile data
4. If voice mode: use the ElevenLabs `useConversation` SDK hook to start session
5. If text mode: send first message via Claude proxy (the topic prompt as first AI message)
6. Set phase to 'active'

**Sending a text message (text mode only):**
1. Create message record (role: 'user') and save to local DB
2. Add to messages state
3. Call `streamMessage` with conversation history
4. As chunks arrive, update `currentStreamingText`
5. When complete, create message record (role: 'assistant') and save to local DB
6. Clear `currentStreamingText`

**Mode switching (spec §9.1):**
1. If voice → text: End ElevenLabs session (conversation.endSession()), switch mode state to 'text'
2. If text → voice: Build session config with full message history in system prompt, start ElevenLabs session, switch mode state to 'voice'
3. All messages persist in the same conversation — mode is just how the UI renders

**Ending a conversation:**
1. If voice: end ElevenLabs session
2. If text: abort any in-flight stream
3. Update conversation record: status = 'ended', ended_at = now, duration_seconds
4. Set phase to 'ending' (shows confirmation modal)
5. Sync messages to Supabase (batch insert)
6. Trigger blog generation (call Supabase edge function or rely on DB webhook)
7. Set phase to 'ended'

**Duration timer:**
- Use `useRef` with `setInterval` every 1000ms while phase is 'active'
- Clean up on unmount or when conversation ends

**Voice amplitude:**
- From ElevenLabs SDK events — expose as a shared value for reanimated (or just a number state)

Note: The ElevenLabs `useConversation` hook from `@elevenlabs/react-native` must be called at the component level, not inside this custom hook. The architecture should be: `useConversation` (our hook) manages state and DB, and takes the ElevenLabs conversation object as an optional parameter when in voice mode. Alternatively, create separate `useVoiceConversation` and `useTextConversation` hooks that the unified hook coordinates.

Choose the cleanest architecture. The key requirement: one source of truth for messages, seamless mode switching, all messages persisted to SQLite.

Verify no TypeScript errors. Test that the hook can be instantiated without crashing.
