---
type: reference
title: ElevenLabs Conversational AI Setup
created: 2026-03-12
tags:
  - setup
  - elevenlabs
  - voice
related:
  - '[[01-supabase-setup]]'
  - '[[04-environment-variables]]'
---

# ElevenLabs Conversational AI Setup

ElevenLabs powers the voice conversation experience in tief. The Conversational AI agent handles real-time voice synthesis and speech-to-text, backed by Claude Sonnet as the language model. Users hear natural, expressive voices and the agent captures full transcripts for blog post generation.

---

## Steps

- [ ] **1. Create an ElevenLabs account**
  - Go to https://elevenlabs.io and sign up
  - You'll need a plan that supports Conversational AI (check current pricing for API access)

- [ ] **2. Create a Conversational AI agent**
  - Navigate to **Conversational AI → Agents** in the ElevenLabs dashboard
  - Click **Create new agent**
  - Select the **blank template** (do not use a pre-built template)
  - Name it something like `tief-conversation-agent`

- [ ] **3. Set the backing LLM to Claude Sonnet**
  - In the agent settings, find the LLM configuration section
  - Select **Claude Sonnet** (via Anthropic) as the backing model
  - You'll need to provide your **Anthropic API key** in the ElevenLabs dashboard
    - Get your API key from https://console.anthropic.com → API Keys
    - Paste it into the ElevenLabs LLM configuration

- [ ] **4. Configure the system prompt**
  - In the agent's system prompt field, paste the prompt from `tief-product-spec.md` §6.1
  - The system prompt defines the AI personality: warm, intellectually rigorous, curious, opinionated but open-minded
  - Template variables (`{{topic_prompt}}`, `{{topic_category}}`, `{{user_name}}`, etc.) will be overridden per-session from the app at runtime
  - Set this as the default prompt — the app will customize it dynamically for each conversation

- [ ] **5. Enable `onMessage` events for transcript capture**
  - In the agent's webhook/event configuration, enable the `onMessage` event
  - This sends each message (both user and AI) to the app in real-time
  - The app uses these events to build the conversation transcript, which is later used for blog post generation
  - Configure the event payload to include: role (user/assistant), content, and timestamp

- [ ] **6. Note the Agent ID**
  - Find the **Agent ID** in the agent settings or overview page
  - Copy this value — it becomes `EXPO_PUBLIC_ELEVENLABS_AGENT_ID` in your environment variables
  - See [[04-environment-variables]] for where to set this

- [ ] **7. Audition and select 10 voices**
  - Navigate to **Voices** in the ElevenLabs dashboard
  - The product spec (§15) recommends these starting voices:

  | # | Label in App | Voice Name | Gender | Energy |
  |---|-------------|-----------|--------|--------|
  | 1 | Warm & Thoughtful | Rachel (premade) | F | Medium |
  | 2 | Calm & Curious | Aria (premade) | F | Low-Med |
  | 3 | Energetic & Friendly | Jessica (premade) | F | High |
  | 4 | Gentle & Reflective | Serena (library) | F | Low |
  | 5 | Grounded & Direct | Brian (premade) | M | Medium |
  | 6 | Playful & Witty | Chris (premade) | M | Med-High |
  | 7 | Soft & Intimate | Elli (premade) | F | Low |
  | 8 | Steady & Reassuring | Daniel (premade) | M | Medium |
  | 9 | Bright & Engaging | George (premade) | M | Med-High |
  | 10 | Deep & Considered | Archer (library) | M | Low-Med |

  - Listen to each voice with sample text that sounds like a tief. conversation
  - Swap out any voices that don't feel right — these are starting recommendations
  - Note each voice's `voice_id` from the ElevenLabs dashboard — you'll need these when building the voice selection UI

- [ ] **8. Configure voice settings for conversational optimization**
  - Apply these settings to all selected voices:
    ```json
    {
      "stability": 0.4,
      "similarity_boost": 0.75,
      "style": 0.2,
      "use_speaker_boost": true
    }
    ```
  - **Why these values:**
    - `stability: 0.4` — Lower stability means more expressive and varied output, which sounds more natural in conversation
    - `similarity_boost: 0.75` — Keeps the voice recognizable while allowing emotional range
    - `style: 0.2` — Light style exaggeration for conversational warmth
    - `use_speaker_boost: true` — Enhances clarity for mobile playback
  - These settings should be tuned per-voice during testing (Phase 2) — some voices may sound better with slightly different values
