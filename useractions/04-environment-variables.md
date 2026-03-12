---
type: reference
title: Environment Variables Configuration
created: 2026-03-12
tags:
  - setup
  - environment
  - configuration
related:
  - '[[01-supabase-setup]]'
  - '[[02-elevenlabs-setup]]'
  - '[[03-apple-and-eas-setup]]'
---

# Environment Variables Configuration

tief. uses environment variables to configure connections to external services. Client-side variables use the `EXPO_PUBLIC_` prefix so Expo bundles them into the app. Server-side secrets are set on Supabase Edge Functions and never included in the app bundle.

**Security note:** Never commit `.env` to version control. The `.gitignore` already excludes `.env` and `.env.local`. Only `.env.example` (with placeholder values) is tracked.

---

## Steps

- [ ] **1. Copy the example environment file**
  - From the project root, run:
    ```bash
    cp .env.example .env
    ```
  - This creates your local `.env` file from the tracked template

- [ ] **2. Set `EXPO_PUBLIC_SUPABASE_URL`**
  - Open your `.env` file
  - Set the value to your Supabase project URL
  - Find this in the Supabase dashboard: **Settings → API → Project URL**
  - Format: `https://xxxxxxxxxxxx.supabase.co`
  - Example:
    ```
    EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
    ```

- [ ] **3. Set `EXPO_PUBLIC_SUPABASE_ANON_KEY`**
  - Set the value to your Supabase anon (public) key
  - Find this in the Supabase dashboard: **Settings → API → Project API keys → anon public**
  - This is a long JWT string starting with `eyJ...`
  - Example:
    ```
    EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```

- [ ] **4. Set `EXPO_PUBLIC_ELEVENLABS_AGENT_ID`**
  - Set the value to your ElevenLabs Conversational AI agent ID
  - Find this in the ElevenLabs dashboard: **Conversational AI → Agents → your agent → Settings**
  - See [[02-elevenlabs-setup]] for creating the agent
  - Example:
    ```
    EXPO_PUBLIC_ELEVENLABS_AGENT_ID=abcdef1234567890
    ```

- [ ] **5. Set Supabase Edge Function secrets**
  - These are NOT in your `.env` file — they're set on the Supabase platform and used only by Edge Functions running on the server.
  - Run each command from the project root (requires Supabase CLI and a linked project):
    ```bash
    # Claude API key for blog post generation and text conversation proxy
    supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

    # ElevenLabs API key for voice management (if needed server-side)
    supabase secrets set ELEVENLABS_API_KEY=xi-...

    # Expo push token for sending push notifications from Edge Functions
    supabase secrets set EXPO_PUSH_ACCESS_TOKEN=...
    ```
  - **Where to get each key:**
    - `ANTHROPIC_API_KEY`: https://console.anthropic.com → API Keys
    - `ELEVENLABS_API_KEY`: https://elevenlabs.io → Profile → API Key
    - `EXPO_PUSH_ACCESS_TOKEN`: https://expo.dev → Account Settings → Access Tokens → Create token

- [ ] **6. Verify your configuration**
  - Your final `.env` file should look like:
    ```
    EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    EXPO_PUBLIC_ELEVENLABS_AGENT_ID=your-agent-id
    ```
  - The app reads these via `src/constants/config.ts`, which falls back to placeholder values if variables are missing
  - Start the dev server to verify: `npx expo start --dev-client`
  - If you see `__SUPABASE_URL__` or similar placeholders in app logs, the environment variables are not being loaded — double-check your `.env` file exists at the project root

> **Reminder:** NEVER commit `.env` — it is gitignored. Only `.env.example` is tracked in version control.
