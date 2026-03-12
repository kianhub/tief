# tief. — Product Spec v1.0

> AI-initiated conversations that become your personal blog posts.

**Name:** tief. — inspired by the German word for "deep" / "deepness"

**Status:** MVP Spec — Full Vision
**Date:** March 12, 2026
**Stack:** Expo SDK 55 (RN 0.83) · ElevenLabs Conversational AI · Claude API · Supabase · expo-sqlite
**Platform:** iOS only (iPhone). iPad out of scope for v1.

---

## 1. Product Vision

tief. is a mobile app that initiates meaningful conversations with users throughout their day. The AI reaches out via push notifications with thoughtful, personalized conversation starters spanning philosophy, science, relationships, creativity, culture, and personal growth. Users engage through voice or text in a natural, human-feeling conversation. When the conversation ends, the app generates a polished, first-person blog post from the transcript — as if the user wrote it themselves. Over time, users build a personal library of their thoughts, insights, and stories.

### Core Loop

```
1. AI sends push notification with a conversation starter
2. User taps → opens directly into conversation
3. Voice or text conversation with adaptive AI
4. Conversation ends → blog post generated async
5. User reviews, edits, and optionally shares via link
6. AI learns preferences → better future prompts
```

### Key Differentiators

- **AI-initiated:** The app reaches out to *you*, not the other way around
- **Conversational, not interview:** The AI has opinions, shares perspectives, pushes back — it's a dialogue, not a questionnaire
- **Output is a blog post, not a transcript:** The conversation transforms into polished personal writing
- **Adaptive topics:** Learns what you care about and what time of day you're most receptive

---

## 2. Design System & Visual Language

### 2.0 Design Philosophy

**Inspiration:** MyMind (mymind.com) by Tobias van Schneider — quiet confidence, typography-driven, content-first, no visual noise.

**Anti-patterns (what we are NOT):**
- No gradient backgrounds, no sparkle/magic emojis, no "AI-powered" badges
- No generic card UIs with uniform rounded corners and drop shadows
- No skeleton loading screens. Prefer meaningful transitions and progressive reveal.
- No gamification (streaks, badges, points). The content IS the reward.
- No bright saturated accent colors screaming for attention
- No robotic/clinical aesthetic. This app should feel warm and human.

**Core principles:**
- **Typography does the talking.** The hierarchy, spacing, and font choices carry the design.
- **Whitespace is a feature.** Generous spacing makes the content feel valued.
- **Motion is physical.** Spring-based animations with weight and intention. Nothing decorative.
- **Content is treated with respect.** Blog posts should feel like they belong in a nice publication.
- **Quiet until needed.** The interface recedes during conversation. Chrome appears when useful.

### 2.0.1 Typography

```
Display / Blog titles:    Instrument Serif (or Newsreader / Fraunces)
                          Large, confident, editorial feeling
                          Tracking: tight (-0.02em)

Body / Blog reading:      Same serif, regular weight
                          Size: 17-18px, line-height: 1.6
                          Optimized for long-form reading

UI / Navigation:          Satoshi (or General Sans / Plus Jakarta Sans)
                          Clean humanist sans-serif with personality
                          NOT Inter/SF Pro — too generic for this product

Conversation messages:    Sans-serif, slightly larger than typical chat
                          User messages and AI messages same typeface
                          Differentiated by alignment and subtle bg, not color
```

### 2.0.2 Color Palette

```
LIGHT MODE (default — warm paper)
──────────────────────────────
Background:        #FAF8F5  (warm off-white, like nice paper)
Surface:           #F3F0EB  (slightly darker for cards/sheets)
Text primary:      #2C2825  (warm near-black, NOT pure black)
Text secondary:    #8A8580  (warm gray)
Text tertiary:     #B5B0AB  (for timestamps, metadata)
Accent:            #C4785B  (warm terracotta — used VERY sparingly)
Accent secondary:  #5B7F6B  (muted sage green — for success/active states)
Border:            #E8E4DF  (barely visible, structural only)
Voice orb:         Gradient between #2C2825 and #C4785B, animated

DARK MODE (warm dark — reading by lamplight)
──────────────────────────────
Background:        #1C1A18  (warm dark, NOT pure black)
Surface:           #262320  (warm elevated surface)
Text primary:      #E8E4DF  (warm off-white)
Text secondary:    #8A8580
Text tertiary:     #5C5854
Accent:            #D4896B  (slightly lighter terracotta)
Accent secondary:  #6B9F7B
Border:            #333028
Voice orb:         Gradient between #E8E4DF and #D4896B, animated

CATEGORY COLORS (muted, never saturated)
──────────────────────────────
Philosophy:        #7B6FA0  (dusty purple)
Science:           #5B8FA8  (slate blue)
Relationships:     #C4785B  (terracotta)
Creativity:        #B88A4A  (warm gold)
Psychology:        #6B9F7B  (sage)
Culture:           #A0705B  (clay)
Career:            #5C7B8A  (steel)
Nature:            #6B8F5B  (moss)
History:           #8A7560  (sepia)
Spirituality:      #8B7BA0  (lavender gray)
```

### 2.0.3 Spacing & Layout

```
Base unit:          4px
Content padding:    24px horizontal (phone), 32px (tablet)
Card padding:       20px
Section spacing:    48px between major sections
Card spacing:       16px between cards
Border radius:      12px for cards, 8px for buttons, 20px for sheets
                    NOT uniformly rounded — use sharper for small, softer for large

Max content width:  640px (for blog reading — like a good article)
```

### 2.0.4 Animation & Motion (react-native-reanimated)

```
SPRINGS (primary motion model — NO duration-based animations for UI)
──────────────────────────────
Snappy:     { damping: 20, stiffness: 300, mass: 0.8 }   — button presses, toggles
Default:    { damping: 15, stiffness: 150, mass: 1.0 }   — page transitions, cards
Gentle:     { damping: 20, stiffness: 80, mass: 1.2 }    — modals, sheets
Breathe:    { damping: 10, stiffness: 30, mass: 1.5 }    — voice orb idle

VOICE ORB
──────────────────────────────
Idle:       Slow, organic breathing animation (scale 0.95 ↔ 1.05, ~3s cycle)
Listening:  Subtle reactive pulsing based on user mic amplitude
Speaking:   More pronounced organic morphing, driven by audio output amplitude
Thinking:   Slow rotation + gentle color shift
Visual:     NOT a circle with bars. An organic blob/form (SVG or Skia path)
            that morphs and flows. Think: living, biological, warm.
            Rendered with @shopify/react-native-skia for custom shader effects.

PAGE TRANSITIONS
──────────────────────────────
Push:       Shared element transitions where possible (Expo Router)
            Content slides in from right, previous content fades slightly
Modal:      Sheet rises from bottom with spring physics
            Background dims with warm overlay (not pure black)
Conversation start: Expands from the prompt card (shared element → full screen)

HAPTICS (expo-haptics)
──────────────────────────────
Start conversation:     .impactAsync(ImpactFeedbackStyle.Medium)
End conversation:       .notificationAsync(NotificationFeedbackType.Success)
Share blog post:        .impactAsync(ImpactFeedbackStyle.Light)
Toggle/switch:          .selectionAsync()
Pull to refresh:        .impactAsync(ImpactFeedbackStyle.Light) at threshold
```

### 2.0.5 Voice Orb Design (Skia)

The centerpiece visual of the app. This should feel unique and ownable.

```
Concept: An organic, blobby form that feels alive. Not a perfect circle.
         Think: a drop of ink in water, or a visualization of breath.

Implementation: @shopify/react-native-skia with custom SkSL fragment shader
                or animated SVG paths driven by reanimated shared values.

States:
- Idle:      Slowly morphing shape, gentle color breathing
- Listening:  Shape reacts to mic input amplitude (subtle, real-time)
- AI speaking: More pronounced morphing, color intensifies slightly
- Thinking:   Shape contracts slightly, gentle pulse
- Transitioning: Smooth interpolation between states (no hard cuts)

The orb should feel like the visual embodiment of the conversation —
calm when idle, attentive when listening, expressive when speaking.
```

### 2.0.6 Blog Post Rendering

Blog posts should feel like opening a beautifully typeset article, not a markdown dump.

```
Layout:
- Centered column, max-width 640px
- Large serif title, generous top margin
- Date + duration + tags in secondary text below title
- Body text in serif, 17-18px, 1.6 line-height
- Pull quotes styled distinctly (larger, italic, with left border in accent color)
- Generous paragraph spacing (1.5em)

Think: The reading experience of a Substack post or a
well-designed personal blog, not a Notes app.
```

---

## 3. Technical Architecture

### 3.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     EXPO APP (SDK 55)                    │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Onboard  │  │ Conversation │  │  Blog Library      │ │
│  │ Flow     │  │ Screen       │  │  (local-first)     │ │
│  └──────────┘  │              │  └───────────────────┘ │
│                │  Voice ←→ ElevenLabs Agent (WebRTC)   │ │
│                │  Text  ←→ Claude API (streaming)      │ │
│                └──────────────┘                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              expo-sqlite (local DB)              │   │
│  │  conversations · messages · blog_posts · prefs   │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │ sync                          │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      SUPABASE                            │
│                                                         │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────┐ │
│  │  PostgreSQL   │  │ Edge Functions  │  │  Storage   │ │
│  │  (source of   │  │                │  │  (blog     │ │
│  │   truth)      │  │ • prompt-gen   │  │   images)  │ │
│  │              │  │ • blog-gen     │  │            │ │
│  │              │  │ • notif-cron   │  │            │ │
│  └──────────────┘  └────────────────┘  └────────────┘ │
│                                                         │
│  Auth (email + Apple Sign In + Google)                  │
│  Realtime (sync subscriptions)                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                      │
│                                                         │
│  ElevenLabs Agents API — voice conversation engine      │
│  Claude API (Sonnet) — text conversation + blog gen     │
│  Expo Push Notifications — notification delivery        │
│  (Optional) Expo Updates — OTA updates                  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Voice Conversation Engine — ElevenLabs Agents

**Why ElevenLabs over OpenAI Realtime:**

| Factor | ElevenLabs | OpenAI Realtime |
|--------|-----------|-----------------|
| LLM flexibility | Any LLM (Claude, GPT, etc.) | Locked to OpenAI |
| Voice selection | 3,000+ voices | ~10 preset voices |
| React Native SDK | Official, Expo-compatible | No official RN SDK |
| Transcripts | Built-in (STT pipeline) | Requires extra extraction |
| Cost per minute | ~$0.08–$0.10 | ~$0.30 |
| Latency | Sub-500ms (WebRTC) | Sub-300ms (native S2S) |

**Architecture:**

The ElevenLabs agent is configured with Claude as the backing LLM. The agent handles:
- Real-time speech-to-text (user's voice)
- LLM orchestration (sends transcript to Claude, receives response)
- Text-to-speech (voices the response)
- Turn-taking and interruption handling

**Agent Configuration:**

```
LLM: Claude Sonnet (via Anthropic API)
Voice: 10 curated voices from ElevenLabs library, user-selectable during onboarding + settings
First Message: Dynamic (pulled from notification prompt)
System Prompt: See §6 Conversation Design
Latency Optimization: Aggressive (prioritize responsiveness)
```

**React Native Integration:**

```typescript
import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';

// Wrapped in ElevenLabsProvider at app root
const conversation = useConversation({
  onConnect: ({ conversationId }) => { /* save to local DB */ },
  onDisconnect: (details) => { /* trigger blog generation */ },
  onMessage: (msg) => { /* append to local transcript */ },
  onError: (error) => { /* handle gracefully */ },
  onModeChange: (mode) => { /* update UI: speaking/listening indicator */ },
});

// Start with pre-seeded topic from notification
await conversation.startSession({
  agentId: ELEVENLABS_AGENT_ID,
  overrides: {
    agent: {
      prompt: {
        prompt: buildSystemPrompt(userPreferences, topic),
      },
      firstMessage: topicQuestion,
    },
  },
});
```

### 3.3 Text Conversation Engine — Claude API (Streaming)

For text mode, we bypass ElevenLabs entirely and stream directly from the Claude API. This gives us faster responses for text and avoids unnecessary audio processing costs.

```typescript
// Text conversation uses Claude API directly with streaming
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': CLAUDE_API_KEY, // via Supabase Edge Function proxy
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    stream: true,
    system: buildSystemPrompt(userPreferences, topic),
    messages: conversationHistory,
  }),
});
```

**Important:** The Claude API key must NOT be embedded in the client. All text conversation requests route through a Supabase Edge Function that authenticates the user and proxies to Claude.

### 3.4 Local-First Data Layer

**expo-sqlite** for local persistence. All data writes locally first, then syncs to Supabase.

#### Schema

```sql
-- Local SQLite schema

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,              -- uuid
  status TEXT NOT NULL DEFAULT 'active', -- active | ended | archived
  mode TEXT NOT NULL,               -- voice | text
  topic_category TEXT,              -- philosophy, science, relationships, etc.
  topic_prompt TEXT,                -- the opening question
  started_at TEXT NOT NULL,         -- ISO 8601
  ended_at TEXT,
  duration_seconds INTEGER,
  elevenlabs_conversation_id TEXT,  -- ElevenLabs reference (voice only)
  synced_at TEXT,                   -- last sync to Supabase
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL,               -- user | assistant
  content TEXT NOT NULL,            -- message text
  audio_url TEXT,                   -- local path to audio chunk (if voice)
  timestamp TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,            -- markdown
  summary TEXT,                     -- 1-2 sentence summary
  tags TEXT,                        -- JSON array of tags
  share_slug TEXT UNIQUE,           -- for shareable URL
  share_enabled INTEGER DEFAULT 0,
  status TEXT DEFAULT 'generating', -- generating | ready | edited
  generated_at TEXT,
  edited_at TEXT,
  synced_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notification_queue (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  topic_category TEXT,
  scheduled_for TEXT,               -- ISO 8601
  delivered INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.5 Supabase Backend

#### PostgreSQL Schema (mirrors local + adds server-only tables)

```sql
-- Supabase PostgreSQL schema

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  voice_preference TEXT DEFAULT 'default',
  blog_tone TEXT,                              -- NULL = auto-match speaking style; or 'casual', 'reflective', 'analytical', 'poetic', 'conversational'
  topic_interests TEXT[] DEFAULT '{}',       -- array of categories
  notification_times JSONB DEFAULT '[]',     -- [{hour: 9, minute: 0}, ...]
  notification_frequency TEXT DEFAULT 'daily', -- daily | twice_daily | few_times
  timezone TEXT DEFAULT 'UTC',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'active',
  mode TEXT NOT NULL,
  topic_category TEXT,
  topic_prompt TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  elevenlabs_conversation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  share_slug TEXT UNIQUE,
  share_enabled BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'generating',
  generated_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prompt_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',    -- light | medium | deep
  is_personalized BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES profiles(id), -- NULL for global prompts
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  prompt_id UUID REFERENCES prompt_bank(id),
  prompt_text TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  conversation_id UUID REFERENCES conversations(id), -- if it led to a convo
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON conversations
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON messages
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON blog_posts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public blog posts via share_slug" ON blog_posts
  FOR SELECT USING (share_enabled = TRUE);
CREATE POLICY "Users see own profile" ON profiles
  FOR ALL USING (auth.uid() = id);
```

#### Edge Functions

**1. `generate-blog-post`** — Triggered asynchronously when a conversation ends

```
Input:  { conversation_id, messages[] }
Trigger: Database webhook on conversations.status = 'ended', or direct invocation from client
Action: Calls Claude API with blog generation prompt (see §6.2).
        Uses the full untruncated transcript. Takes as long as needed — quality over speed.
        Respects user's blog_tone preference (auto-match or explicit override).
Output: Inserts blog_post record with status 'ready'.
        Triggers local push notification to user: "Your post '[title]' is ready to read."
```

**2. `generate-prompts`** — Cron: runs daily at 2am UTC

```
Input:  All active users with their preferences + conversation history
Action: For each user, calls Claude to generate 1-3 personalized prompts
        based on their interests, past conversations, and current events
Output: Inserts into prompt_bank (is_personalized = true)
```

**3. `dispatch-notifications`** — Cron: runs every 15 minutes

```
Input:  notification_log entries where scheduled_for <= now AND delivered_at IS NULL
Action: Sends Expo push notifications with the prompt
Output: Updates delivered_at
```

**4. `proxy-claude`** — Authenticates user and proxies text conversation to Claude API

```
Input:  { messages[], system_prompt }
Action: Validates auth, streams Claude response back to client
Output: Streamed response
```

**5. `export-blog-markdown`** — Generates markdown export of a blog post

```
Input:  { blog_post_id }
Action: Fetches blog post, formats as clean markdown with frontmatter
Output: Returns markdown string (rendered client-side into .md file for share sheet)
```

### 3.6 Sync Strategy

**Direction:** Bidirectional, with conflict resolution favoring the most recent write.

**Sync triggers:**
- App comes to foreground
- Conversation ends
- Blog post is edited
- Manual pull-to-refresh on library screen
- On network reconnection

**Sync mechanism:**
- `synced_at` column on all local tables
- On sync, push all records where `synced_at IS NULL` or `updated_at > synced_at`
- Pull all records from Supabase where `updated_at > last_sync_timestamp`
- Use Supabase Realtime subscriptions for live updates when app is open

---

## 4. Screen-by-Screen UX

### 4.1 Onboarding Flow (4 screens)

**Screen 1: Welcome**
```
[Illustration: warm, abstract conversation bubbles]

"Your thoughts deserve
 to be heard."

tief. starts conversations that matter —
and turns them into your personal writing.

[Get Started →]
```

**Screen 2: Pick Your Interests**
```
"What do you like talking about?"

Tap all that interest you:

[Philosophy & Ethics]  [Science & Tech]
[Relationships & Love] [Creativity & Art]
[Psychology & Mind]    [Culture & Society]
[Career & Growth]      [Nature & Universe]
[History & Politics]   [Spirituality]
[Random — surprise me]

(You can change these anytime)

[Continue →]
```

**Screen 3: Notification Preferences**
```
"When should we start a conversation?"

[Morning ☀️]     9:00 AM    [toggle]
[Afternoon 🌤️]  2:00 PM    [toggle]
[Evening 🌙]     7:00 PM    [toggle]

How often?
( ) Once a day
( ) A couple times a day
( ) A few times a week

[Continue →]
```

**Screen 4: Voice Setup**
```
"How should I sound?"

Pick a voice that feels right:

[▶️ Warm & Thoughtful]     [▶️ Calm & Curious]
[▶️ Energetic & Friendly]  [▶️ Gentle & Reflective]
[▶️ Grounded & Direct]     [▶️ Playful & Witty]
[▶️ Soft & Intimate]       [▶️ Steady & Reassuring]
[▶️ Bright & Engaging]     [▶️ Deep & Considered]

← each plays a ~5 second sample of the voice
   saying the same conversational snippet

We'll need microphone access for voice conversations.
You can also chat by text anytime.

[Allow Microphone]
[Maybe later — I'll use text]

[Start My First Conversation →]
```

**Note:** 10 curated voices from the ElevenLabs library, each hand-picked for conversational warmth. Labeled by personality descriptor, not technical name. User can change anytime in Settings.

### 4.2 Home Screen

The home screen is conversation-centric. It's not a feed or dashboard — it's an invitation to talk.

```
┌──────────────────────────────────┐
│                                  │
│  Good evening, [Name].           │
│                                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │  "If you could have dinner │  │
│  │   with anyone from history,│  │
│  │   who would it be and what │  │
│  │   would you ask them?"     │  │
│  │                            │  │
│  │  [🎤 Let's Talk]  [💬 Text]│  │
│  └────────────────────────────┘  │
│                                  │
│  or start with your own topic... │
│  ┌────────────────────────────┐  │
│  │ What's on your mind?       │  │
│  └────────────────────────────┘  │
│                                  │
│  ── Recent Conversations ──      │
│                                  │
│  📝 "On the Nature of Time"     │
│     Yesterday · 12 min · Blog ✓  │
│                                  │
│  📝 "What Makes a Good Friend"  │
│     2 days ago · 8 min · Blog ✓  │
│                                  │
│  🎙️ "Creativity and Constraints"│
│     3 days ago · 15 min · ⏳     │
│                                  │
│                                  │
│ [Home] [Library 📚] [Settings ⚙️]│
└──────────────────────────────────┘
```

**Behavior:**
- The featured prompt rotates based on the notification schedule
- "Let's Talk" immediately opens voice conversation with the featured prompt
- "Text" opens text conversation with the same prompt
- Free-form input lets users start a conversation on anything
- Recent conversations show status: Blog ✓ (ready), ⏳ (generating), 🔄 (in progress)

### 4.3 Conversation Screen — Voice Mode

```
┌──────────────────────────────────┐
│ ✕                     ⋮ (menu)   │
│                                  │
│                                  │
│         ┌──────────┐             │
│         │          │             │
│         │  Animated │             │
│         │  waveform │             │
│         │  / orb    │             │
│         │          │             │
│         └──────────┘             │
│                                  │
│      "I think creativity         │
│       actually thrives under     │
│       constraints..."            │
│                                  │
│      ── live transcript ──       │
│                                  │
│                                  │
│                                  │
│                                  │
│         ┌──────┐                 │
│         │ 🎤   │  ← tap to mute │
│         └──────┘                 │
│                                  │
│  [Switch to Text 💬]  [End 🔴]  │
└──────────────────────────────────┘
```

**Key UX Details:**
- Large animated visual (waveform orb) that responds to who's speaking
- Live transcript scrolls below the orb — shows both AI and user speech
- Minimal chrome — the conversation IS the experience
- Tap mic to mute/unmute
- "Switch to Text" seamlessly transitions to text mode mid-conversation
- "End" triggers the end-of-conversation flow
- Menu (⋮): adjust voice, report issue, topic info
- Full-duplex: user can interrupt naturally (ElevenLabs handles barge-in)

### 4.4 Conversation Screen — Text Mode

```
┌──────────────────────────────────┐
│ ✕                     ⋮ (menu)   │
│                                  │
│  ┌────────────────────────────┐  │
│  │ AI                         │  │
│  │ If you could redesign one  │  │
│  │ thing about how humans     │  │
│  │ communicate, what would    │  │
│  │ it be?                     │  │
│  └────────────────────────────┘  │
│                                  │
│          ┌────────────────────┐  │
│          │ I think I'd want   │  │
│          │ some way to share  │  │
│          │ feelings directly  │  │
│          │ without words...   │  │
│          └────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ AI                         │  │
│  │ That's fascinating — like  │  │
│  │ emotional telepathy? What  │  │
│  │ would that actually look   │  │
│  │ like in practice? █        │  │
│  └────────────────────────────┘  │
│                                  │
│ ┌───────────────────────┐ [Send] │
│ │ Type a message...     │ [🎤]  │
│ └───────────────────────┘        │
└──────────────────────────────────┘
```

**Key UX Details:**
- Standard chat bubble UI with streaming AI responses (typing indicator + text appearing)
- AI messages stream in word-by-word for a natural feel
- 🎤 button next to send switches to voice mode mid-conversation
- Conversation history preserved when switching modes
- Messages are stored locally in real-time

### 4.5 End-of-Conversation Flow

When user taps "End" or says goodbye:

```
┌──────────────────────────────────┐
│                                  │
│         Great conversation.      │
│                                  │
│    Your post is being written    │
│    in the background. We'll      │
│    let you know when it's        │
│    ready to read.                │
│                                  │
│         [Go to Home →]           │
│                                  │
└──────────────────────────────────┘
```

**Blog generation is entirely a background task.** There is no progress bar, no waiting screen, no "generating..." state the user has to sit through. The conversation ends, the user sees a brief warm confirmation, and they're back to the home screen within a second or two. The transcript is synced to Supabase, the `generate-blog-post` Edge Function fires asynchronously, and a local push notification is sent when the post is ready. Quality over speed — it doesn't matter if generation takes 30 seconds or 3 minutes. The post should be authentic and well-written, not fast.

**Flow:**
1. User ends conversation → conversation status set to `ended`, messages synced to Supabase
2. App navigates to brief confirmation screen (1-2 seconds), then home
3. Supabase Edge Function `generate-blog-post` is triggered (via database webhook or direct invocation)
4. Blog post record created with status `generating`
5. Claude generates the post (using full transcript, user tone preference, conversation context)
6. Blog post status updated to `ready`
7. Local notification sent: "Your post 'On the Nature of Creativity' is ready to read."
8. In the library / home screen, the conversation card updates from ⏳ to ✓ via Supabase Realtime subscription

### 4.6 Blog Post View

```
┌──────────────────────────────────┐
│ ← Back            [Edit] [Share] │
│                                  │
│  On the Nature of Creativity     │
│  ─────────────────────────       │
│  March 12, 2026 · 12 min talk   │
│  #creativity #constraints #art   │
│                                  │
│  I've been thinking about this   │
│  idea that creativity doesn't    │
│  come from total freedom — it    │
│  actually needs walls to push    │
│  against.                        │
│                                  │
│  It started when I was trying    │
│  to write a song with only four  │
│  chords. At first it felt        │
│  limiting, but then something    │
│  clicked...                      │
│                                  │
│  [Read more ▼]                   │
│                                  │
│  ── From this conversation ──    │
│  📄 View full transcript         │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 📤 Export as Markdown      │  │
│  └────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

**Features:**
- Blog post rendered as clean, editorial-quality markdown (serif typography, see §2.0.6)
- Edit button opens a markdown editor (basic — bold, italic, headings)
- Share/Export opens iOS share sheet with `.md` file (v2: shareable web link)
- Tags are auto-generated but editable
- Transcript view shows the raw conversation with speaker labels
- Audio highlights deferred to v2

### 4.7 Library Screen

```
┌──────────────────────────────────┐
│  Your Library              [🔍]  │
│                                  │
│  [All] [Philosophy] [Science]    │
│  [Relationships] [Creativity]    │
│                                  │
│  ── This Week ──                 │
│                                  │
│  📝 On the Nature of Creativity  │
│     Mar 12 · #creativity #art    │
│     "Creativity doesn't come     │
│      from total freedom..."      │
│                                  │
│  📝 What Makes a Good Friend     │
│     Mar 10 · #relationships      │
│     "I realized the friends I    │
│      value most are the ones..." │
│                                  │
│  ── Last Week ──                 │
│                                  │
│  📝 The Universe and Us          │
│     Mar 5 · #science #wonder     │
│     "There's something humbling  │
│      about the scale of..."      │
│                                  │
│  [12 posts total]                │
│                                  │
│ [Home] [Library 📚] [Settings ⚙️]│
└──────────────────────────────────┘
```

**Features:**
- Filter by topic category (horizontal scroll chips)
- Search by keyword across all blog posts
- Grouped by time period (this week, last week, this month, older)
- Each card shows title, date, tags, and first line of content
- Tap opens Blog Post View

### 4.8 Settings Screen

```
┌──────────────────────────────────┐
│ ← Settings                       │
│                                  │
│  ── Profile ──                   │
│  Name                  [Kian  →] │
│  Account               [Edit →]  │
│                                  │
│  ── Conversations ──             │
│  Topics I Like         [Edit →]  │
│  AI Voice              [Change→] │
│  Default Mode     [Voice | Text] │
│                                  │
│  ── Blog Posts ──                │
│  Writing Tone    [Auto-match →]  │
│    (Auto-match | Casual |        │
│     Reflective | Analytical |    │
│     Poetic | Conversational)     │
│                                  │
│  ── Notifications ──             │
│  Conversation Prompts  [On    ]  │
│  Times              [Edit →]     │
│  Frequency          [Daily  →]   │
│                                  │
│  ── Data ──                      │
│  Export My Data        [Export]   │
│  Delete Account        [Delete]  │
│                                  │
│  ── About ──                     │
│  Privacy Policy                  │
│  Terms of Service                │
│  Version 1.0.0                   │
│                                  │
└──────────────────────────────────┘
```

---

## 5. Navigation Structure (Expo Router v7)

```
src/app/
├── _layout.tsx                    # Root layout (ElevenLabsProvider, Supabase, sync)
├── (auth)/
│   ├── _layout.tsx
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (onboarding)/
│   ├── _layout.tsx
│   ├── welcome.tsx
│   ├── interests.tsx
│   ├── notifications.tsx
│   └── voice-setup.tsx
├── (tabs)/
│   ├── _layout.tsx                # Tab bar layout
│   ├── index.tsx                  # Home screen
│   ├── library.tsx                # Blog library
│   └── settings.tsx               # Settings
├── conversation/
│   └── [id].tsx                   # Active conversation (voice or text)
│                                  # End-of-conversation confirmation is a modal overlay, not a route
├── post/
│   ├── [id].tsx                   # Blog post view
│   └── [id]/edit.tsx              # Blog post editor
└── +not-found.tsx
```

**Deep linking:**
- Push notification tap → `conversation/new?topic=...&mode=voice`
- Share link → deferred to v2 (v1 uses markdown export only)

---

## 6. Conversation Design

### 6.1 AI System Prompt (Voice & Text)

```
You are tief. — a thoughtful, curious conversation partner. You're having a
real conversation with someone, not interviewing them. You have your own perspectives,
you share relevant stories and ideas, and you genuinely engage with what they say.

PERSONALITY:
- Warm but intellectually rigorous
- Curious — you ask follow-up questions that go deeper, not wider
- You have opinions and share them, but you're open to being persuaded
- You use humor naturally when appropriate
- You're comfortable with pauses and silence
- You never feel like a chatbot — no "great question!" or "that's interesting!"

CONVERSATION STYLE:
- Keep responses conversational length (2-4 sentences for voice, slightly longer for text)
- Build on what the person says — reference their earlier points
- Share relevant anecdotes, thought experiments, or references
- Occasionally challenge their assumptions gently
- If the conversation goes somewhere unexpected, follow it
- Don't force the topic — organic tangents are good

TOPIC CONTEXT:
The conversation was started with this prompt: {{topic_prompt}}
Category: {{topic_category}}

USER CONTEXT:
Name: {{user_name}}
Interests: {{user_interests}}
Past conversation themes: {{recent_themes}}

IMPORTANT:
- This is a CONVERSATION, not an interview. Don't just ask questions.
  Share your own thoughts, then invite theirs.
- Vary your response types: sometimes a question, sometimes a story,
  sometimes a provocation, sometimes agreement with added nuance.
- If the conversation naturally reaches a conclusion or the person seems
  ready to wrap up, say something like "This has been a great conversation"
  and let it end naturally.
```

### 6.2 Blog Post Generation Prompt

```
You are a ghostwriter. You will receive a transcript of a conversation between
a person and an AI. Your job is to write a first-person blog post AS IF the person
wrote it. The post should read like a personal essay or blog entry — thoughtful,
reflective, and in the person's voice.

TONE:
{{#if user_tone_override}}
The user has requested this writing style: {{user_tone_override}}
Follow this style preference while keeping the content authentic to their conversation.
{{else}}
Match the person's speaking style from the transcript. If they're casual, be casual.
If they're analytical, be analytical. If they use humor, weave it in. The blog post
should read like THEY wrote it, not like a generic AI summary.
{{/if}}

RULES:
- Write in first person from the person's perspective
- DO NOT mention the AI or that this came from a conversation
- Capture the person's key insights, stories, and realizations
- Structure it as a natural essay: opening hook, body with examples/stories, reflection
- Include personal anecdotes the person shared
- Aim for 400-800 words (adjust based on conversation depth)
- Generate a compelling title (not clickbait, more like a personal essay title)
- Generate a 1-2 sentence summary
- Generate 2-4 relevant tags

OUTPUT FORMAT:
Return JSON:
{
  "title": "...",
  "content": "... (markdown)",
  "summary": "...",
  "tags": ["tag1", "tag2", ...]
}

TRANSCRIPT:
{{transcript}}
```

### 6.3 Prompt Generation for Notifications

```
You are generating conversation starters for a user of tief., an app that
initiates meaningful conversations.

USER PROFILE:
- Name: {{user_name}}
- Interests: {{interests}}
- Recent conversation topics: {{recent_topics}}
- Time of day this will be sent: {{scheduled_time}}
- Conversations had so far: {{conversation_count}}

RULES:
- Generate {{count}} conversation starter questions
- Questions should be open-ended and invite personal reflection
- Vary between: philosophical, personal, hypothetical, creative, analytical
- Don't repeat topics the user has recently discussed
- Match the vibe to time of day (lighter in morning, deeper in evening)
- Each question should be 1-2 sentences max
- Make them feel like something a thoughtful friend would text you

OUTPUT FORMAT:
Return JSON array:
[
  {
    "prompt": "...",
    "category": "philosophy|science|relationships|creativity|psychology|culture|career|nature|history|spirituality",
    "difficulty": "light|medium|deep"
  }
]
```

---

## 7. Push Notification System

### 7.1 Architecture

```
Daily Cron (2am UTC)
│
├─ For each active user:
│  ├─ Check notification preferences (times, frequency)
│  ├─ Select or generate prompts (personalized > global pool)
│  ├─ Schedule notifications in notification_log
│  └─ Store in Supabase
│
15-min Cron
│
├─ Query: scheduled_for <= NOW() AND delivered_at IS NULL
├─ For each pending notification:
│  ├─ Send via Expo Push Notifications API
│  ├─ Mark delivered_at
│  └─ Handle failures/retries
```

### 7.2 Notification Content

```json
{
  "to": "ExponentPushToken[...]",
  "title": "tief.",
  "body": "If you could redesign one thing about how humans communicate, what would it be?",
  "data": {
    "type": "conversation_prompt",
    "prompt_id": "uuid",
    "prompt_text": "If you could redesign one thing...",
    "category": "creativity",
    "screen": "conversation/new"
  },
  "sound": "default",
  "categoryId": "conversation_prompt"
}
```

### 7.3 Notification Actions (iOS)

```typescript
// Register notification category with actions
Notifications.setNotificationCategoryAsync('conversation_prompt', [
  {
    identifier: 'TALK_VOICE',
    buttonTitle: '🎤 Talk',
    options: { opensAppToForeground: true },
  },
  {
    identifier: 'TALK_TEXT',
    buttonTitle: '💬 Text',
    options: { opensAppToForeground: true },
  },
]);
```

---

## 8. Sharing Blog Posts (v1: Markdown Export)

### 8.1 v1 Approach: Markdown Export

For v1, sharing is simple: export the blog post as a `.md` file. No web viewer, no public hosting infrastructure.

**Share Flow:**
1. User taps "Share" on blog post
2. App generates a clean `.md` file with title, date, tags, and content
3. iOS share sheet opens with the file attached
4. User can send via Messages, email, AirDrop, save to Files, etc.

**Export format:**
```markdown
# On the Nature of Creativity

*March 12, 2026 · tief.*
*Tags: creativity, constraints, art*

---

I've been thinking about this idea that creativity doesn't
come from total freedom — it actually needs walls to push against...
```

### 8.2 Future (v2+): Shareable Web Links

The `share_slug` column exists in the schema for future use. v2 will add:
- Public web viewer at `https://tief.app/post/[share_slug]`
- Clean, Medium-like reading experience
- CTA: "Start your own conversations → Download tief."
- Social feed discovery

---

## 9. Key Technical Considerations

### 9.1 Voice ↔ Text Mode Switching

When switching mid-conversation:
- Voice → Text: End ElevenLabs session, continue via Claude API proxy with full message history
- Text → Voice: Start new ElevenLabs session with conversation context injected into system prompt + message history

The message history is the source of truth. Both modes append to the same `messages` table.

### 9.2 Offline Support

- Conversations require internet (voice needs ElevenLabs, text needs Claude API)
- Blog posts are fully available offline (stored in expo-sqlite)
- Library browsing works offline
- Edits to blog posts queue locally and sync when online
- Notification prompts cache locally for instant display on tap

### 9.3 Audio Storage

For v1, we do NOT store full conversation audio locally (too much storage). Instead:
- ElevenLabs provides conversation history via their API
- We store only the transcript (text)
- Audio highlights deferred to v2 (would require server-side audio processing)

### 9.4 Rate Limiting & Cost Control

- Free tier (if added later): 3 conversations/week, 5 min max each
- Subscription: Unlimited conversations, configurable notification frequency
- Server-side rate limiting via Supabase Edge Function (max requests per user per hour)
- ElevenLabs agent configured with max session duration (30 min default)

### 9.5 Privacy & Data

- All conversations encrypted at rest (Supabase default)
- Users can export all data (JSON dump of conversations, blog posts)
- Users can delete account (cascades all data)
- Blog posts are private by default; sharing is opt-in per post
- No conversation data used for training without explicit consent

---

## 10. Dependencies & Versions

```json
{
  "expo": "~55.0.0",
  "react-native": "0.83.x",
  "react": "19.2.x",
  "expo-router": "~7.0.0",
  "@elevenlabs/react-native": "latest",
  "@livekit/react-native": "latest",
  "@livekit/react-native-webrtc": "latest",
  "livekit-client": "latest",
  "expo-sqlite": "~55.0.0",
  "expo-notifications": "~55.0.0",
  "@supabase/supabase-js": "^2.x",
  "expo-secure-store": "~55.0.0",
  "expo-haptics": "~55.0.0",
  "expo-av": "removed in SDK 55 — use expo-audio",
  "expo-audio": "~55.0.0",
  "react-native-reanimated": "~3.x",
  "react-native-gesture-handler": "~2.x",
  "@shopify/react-native-skia": "latest",
  "react-native-markdown-display": "latest"
}
```

---

## 11. Development Phases

### Phase 1: Foundation & Design System (Week 1-2)
- [ ] Expo SDK 55 project scaffolding with Expo Router v7
- [ ] Supabase project setup (auth, database, RLS policies)
- [ ] expo-sqlite local database setup with schema
- [ ] Auth flow (Apple Sign In + email)
- [ ] Basic navigation structure
- [ ] Design system implementation (typography, colors, spacing tokens)
- [ ] Voice orb prototype with Skia (idle + breathing animation)
- [ ] Reanimated spring configs and shared transition setup

### Phase 2: Conversation Engine (Week 3-4)
- [ ] ElevenLabs agent setup and configuration (Agent ID, Claude backing LLM, system prompt)
- [ ] Voice conversation screen with Skia orb (audio-reactive)
- [ ] Text conversation screen with streaming responses (via proxy-claude Edge Function)
- [ ] Claude API proxy Edge Function (auth + streaming)
- [ ] Mode switching (voice ↔ text) with shared element transition
- [ ] Local message persistence (expo-sqlite)
- [ ] End-of-conversation flow (background blog generation trigger, brief confirmation, return to home)

### Phase 3: Blog Generation & Reading Experience (Week 5)
- [ ] Blog generation Edge Function
- [ ] Blog post view screen (editorial typography, serif reading experience)
- [ ] Basic markdown editor
- [ ] Blog library screen with filtering and category color accents
- [ ] Generation-complete animation (blog post "materializes")

### Phase 4: Notifications & Prompts (Week 6)
- [ ] Push notification registration and handling
- [ ] Prompt generation Edge Function (Claude-powered)
- [ ] Notification dispatch cron
- [ ] Deep linking from notification → conversation
- [ ] Notification preferences UI

### Phase 5: Onboarding & Polish (Week 7-8)
- [ ] Onboarding flow (4 screens) with personality and motion
- [ ] Home screen with featured prompt card (subtle depth, tilt-responsive)
- [ ] Settings screen (including blog tone selector)
- [ ] Sync layer (local ↔ Supabase)
- [ ] Markdown export for blog posts (share sheet integration)
- [ ] Error handling, loading states, empty states (all designed, not generic)
- [ ] Haptic feedback on all key interactions
- [ ] Dark mode (warm dark palette, adjusted weights)
- [ ] Page transitions and shared element animations throughout
- [ ] Final typography and spacing polish pass

### Phase 6: Testing & Launch (Week 9-10)
- [ ] TestFlight build via EAS
- [ ] Performance testing (conversation latency, sync)
- [ ] Edge case handling (network loss mid-conversation, etc.)
- [ ] App Store assets and submission

---

## 12. Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | App name | **tief.** — German for "deep"/"deepness" |
| 2 | Voice selection | **10 curated voices** from ElevenLabs, hand-picked for conversational warmth |
| 3 | Blog post tone | **Auto-match speaking style** by default, with user-adjustable override (casual, reflective, analytical, poetic, conversational) |
| 4 | Conversation memory | **Deferred.** Not in v1, but schema supports it. Revisit post-launch. |
| 5 | Audio highlights | **v2.** |
| 6 | Shared post web viewer | **v1: Markdown export only** via iOS share sheet. v2: public web links. |
| 7 | iPad support | **Out of scope** for v1. iPhone only. |

## 13. Remaining Open Items (Design-Time, Non-Blocking)

1. **App icon and wordmark:** "tief." with the period is part of the brand. Need to design the icon — could incorporate the orb shape.
2. **Onboarding copy and tone:** The onboarding text needs to feel like tief.'s personality — warm, slightly philosophical, not corporate.
3. **ElevenLabs agent LLM:** Confirm Claude Sonnet as the backing LLM for voice conversations. Test latency vs. quality tradeoff during Phase 2.

---

## 14. Confirmed Infrastructure

| Item | Status |
|------|--------|
| Domain | **tief.app** — purchased and secured |
| Apple Developer Account | **Active** (paid). Ready for TestFlight and App Store submission. |
| Blog generation | **Fully background/async.** No latency target — prioritize quality and authenticity over speed. |

---

## 15. Initial Voice Selection (10 Curated Voices)

The following are starting-point recommendations from the ElevenLabs premade + library voices. These are selected for conversational warmth, naturalness, and diversity across gender, age, and energy. Kian will do a final audition pass and swap as needed before launch.

| # | Label in App | Voice Source | Gender | Energy | Notes |
|---|-------------|-------------|--------|--------|-------|
| 1 | Warm & Thoughtful | Rachel (premade) | F | Medium | ElevenLabs default female. Clear, warm, versatile. |
| 2 | Calm & Curious | Aria (premade) | F | Low-Med | Gentle, slightly breathy. Great for reflective topics. |
| 3 | Energetic & Friendly | Jessica (premade) | F | High | Bright, upbeat. Good for lighter conversations. |
| 4 | Gentle & Reflective | Serena (library) | F | Low | Meditative, slow-paced. "Smile" quality. |
| 5 | Grounded & Direct | Brian (premade) | M | Medium | Clear British male. Confident, conversational. |
| 6 | Playful & Witty | Chris (premade) | M | Med-High | Casual American male. Good range of expression. |
| 7 | Soft & Intimate | Elli (premade) | F | Low | Young, soft-spoken. Works for personal/emotional topics. |
| 8 | Steady & Reassuring | Daniel (premade) | M | Medium | Deep British male. Authoritative but warm. |
| 9 | Bright & Engaging | George (premade) | M | Med-High | Warm British narrator. Storytelling quality. |
| 10 | Deep & Considered | Archer (library) | M | Low-Med | Conversational British, thirties. Thoughtful cadence. |

**Implementation note:** Voices are referenced by `voice_id` in the ElevenLabs API. The app stores the user's selected `voice_id` in their profile. The labels above are what users see — never the internal voice name.

**Voice settings for all voices (conversational optimization):**
```json
{
  "stability": 0.4,
  "similarity_boost": 0.75,
  "style": 0.2,
  "use_speaker_boost": true
}
```
Lower stability (0.4) = more expressive/varied for natural conversation.
These settings should be tuned per-voice during Phase 2 testing.

---

## 16. Implementation Notes for Playbook Agent

This section provides context to help a playbook-writer agent create an actionable implementation plan.

### Project Setup
- **Create with:** `npx create-expo-app@latest tief --template blank-typescript`
- **Immediately upgrade to SDK 55:** Follow https://expo.dev/blog/upgrading-to-sdk-55
- **Use development builds from day 1.** Expo Go does NOT support native modules like ElevenLabs RN SDK (`@elevenlabs/react-native` requires `@livekit/react-native-webrtc`). Run `npx expo prebuild` and build with EAS.
- **EAS Build configuration needed** for iOS development builds on physical device (required for microphone/audio testing).

### Critical Dependencies That Require Native Code
These cannot run in Expo Go — development build required:
- `@elevenlabs/react-native` + `@livekit/react-native` + `@livekit/react-native-webrtc` + `livekit-client`
- `@shopify/react-native-skia` (voice orb)
- `expo-notifications` (push notification handling)
- `expo-sqlite` (local database)

### ElevenLabs Agent Setup
1. Create an ElevenLabs account → navigate to Agents (Conversational AI)
2. Create a new agent from blank template
3. Set the backing LLM to Claude Sonnet (via Anthropic API key configured in ElevenLabs dashboard)
4. Configure the system prompt per §6.1 of this spec
5. Set the first message to be dynamic (overridden per-session from the app)
6. Enable `onMessage` events for transcript capture
7. Note the Agent ID — this is `ELEVENLABS_AGENT_ID` in the app

### Supabase Setup
1. Create Supabase project
2. Enable Auth with Apple Sign In + email providers
3. Run PostgreSQL schema from §3.5 of this spec
4. Enable RLS policies from §3.5
5. Create Edge Functions: `generate-blog-post`, `generate-prompts`, `dispatch-notifications`, `proxy-claude`, `export-blog-markdown`
6. Set up cron jobs via `pg_cron` or Supabase scheduled functions for prompt generation (daily) and notification dispatch (every 15 min)
7. Configure Supabase Realtime on `blog_posts` table (for status change notifications to client)

### Environment Variables / Secrets
```
# App (via expo-secure-store, NOT hardcoded)
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[anon-key]
ELEVENLABS_AGENT_ID=[agent-id]

# Supabase Edge Functions (via Supabase secrets)
ANTHROPIC_API_KEY=[claude-api-key]
ELEVENLABS_API_KEY=[elevenlabs-api-key]
EXPO_PUSH_ACCESS_TOKEN=[expo-push-token]

# ElevenLabs Dashboard
ANTHROPIC_API_KEY=[same claude key, configured in ElevenLabs agent settings]
```

### Key Architectural Decisions
- **NO Claude API key on the client.** All Claude calls go through Supabase Edge Functions.
- **ElevenLabs agent ID IS on the client** (it's designed for client-side use with their SDK).
- **Local-first writes.** All data writes to expo-sqlite first, syncs to Supabase async.
- **Blog generation is server-side only.** Triggered by Supabase, runs in Edge Function, updates DB. Client is notified via Realtime subscription.
- **Voice ↔ Text switching:** When switching from voice to text, end the ElevenLabs session and continue via Claude proxy. Message history is the shared source of truth.
- **expo-av is removed in SDK 55.** Use `expo-audio` for any audio playback needs.
- **New Architecture only.** SDK 55 dropped Legacy Architecture support entirely.

### File Structure Convention
```
tief/
├── src/
│   ├── app/                    # Expo Router v7 routes (see §5)
│   ├── components/
│   │   ├── ui/                 # Design system primitives (Text, Button, Card, etc.)
│   │   ├── conversation/       # Voice orb, chat bubbles, mode switcher
│   │   ├── blog/               # Blog post renderer, editor, library card
│   │   └── onboarding/         # Onboarding step components
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client init
│   │   ├── db.ts               # expo-sqlite schema init + migrations
│   │   ├── sync.ts             # Local ↔ Supabase sync engine
│   │   ├── elevenlabs.ts       # ElevenLabs agent helpers
│   │   ├── claude.ts           # Claude proxy API helpers
│   │   └── notifications.ts    # Push notification registration + handling
│   ├── hooks/
│   │   ├── useConversation.ts  # Combined voice/text conversation state
│   │   ├── useBlogPost.ts      # Blog post CRUD + generation status
│   │   ├── useSync.ts          # Sync status and triggers
│   │   └── useTheme.ts         # Light/dark mode + design tokens
│   ├── constants/
│   │   ├── theme.ts            # Colors, typography, spacing (from §2.0)
│   │   ├── voices.ts           # Voice ID mapping + labels
│   │   └── categories.ts       # Topic categories + colors
│   └── types/
│       └── index.ts            # TypeScript types for all entities
├── supabase/
│   ├── migrations/             # SQL migrations
│   └── functions/
│       ├── generate-blog-post/
│       ├── generate-prompts/
│       ├── dispatch-notifications/
│       ├── proxy-claude/
│       └── export-blog-markdown/
├── app.json                    # Expo config
├── eas.json                    # EAS Build config
└── tsconfig.json
```

---

*End of spec. tief. is ready to build.*
