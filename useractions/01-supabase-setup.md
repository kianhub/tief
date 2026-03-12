---
type: reference
title: Supabase Project Setup
created: 2026-03-12
tags:
  - setup
  - supabase
  - backend
related:
  - '[[02-elevenlabs-setup]]'
  - '[[04-environment-variables]]'
---

# Supabase Project Setup

Supabase provides the entire backend for tief.: authentication (email + Apple Sign In), PostgreSQL database with Row Level Security, Edge Functions for AI processing and notifications, Realtime subscriptions for live blog post status updates, and scheduled jobs via pg_cron.

Complete each step in order. The schema and RLS policies are defined in `tief-product-spec.md` §3.5.

---

## Steps

- [ ] **1. Create a Supabase project**
  - Go to https://supabase.com/dashboard
  - Click "New Project"
  - Choose your organization (or create one)
  - Set project name: `tief` (or your preferred name)
  - Set a strong database password — save it somewhere secure
  - Choose the region closest to your primary user base
  - Click "Create new project" and wait for provisioning to complete

- [ ] **2. Note your project credentials**
  - Go to **Settings → API** in the Supabase dashboard
  - Copy the **Project URL** (e.g. `https://xxxx.supabase.co`) — this becomes `EXPO_PUBLIC_SUPABASE_URL`
  - Copy the **anon public** key — this becomes `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - Save both values; you'll add them to your `.env` file later (see [[04-environment-variables]])

- [ ] **3. Enable Auth providers**
  - Go to **Authentication → Providers**
  - **Email** should be enabled by default — verify it is
  - **Apple Sign In:**
    - Toggle Apple provider to enabled
    - You will need your Apple Developer credentials (see [[03-apple-and-eas-setup]])
    - Fill in the Service ID, Team ID, Key ID, and private key from your Apple Developer account
    - Save the configuration

- [ ] **4. Run the PostgreSQL schema**
  - Go to **SQL Editor** in the Supabase dashboard
  - Open `tief-product-spec.md` §3.5 and copy the full SQL schema
  - The schema creates these tables: `profiles`, `conversations`, `messages`, `blog_posts`, `prompt_bank`, `notification_log`
  - Paste the SQL into the editor and click **Run**
  - Verify all tables appear under **Table Editor**
  - Add the `expo_push_token` column to the `profiles` table (required for push notifications):
    ```sql
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
    ```

- [ ] **5. Enable RLS policies**
  - The RLS policies are included at the bottom of the §3.5 schema SQL
  - If you ran the full SQL block, they should already be applied
  - Verify by going to **Authentication → Policies** and confirming policies exist for: `conversations`, `messages`, `blog_posts`, `profiles`
  - Each table should have a "Users see own data" policy (`auth.uid() = user_id` or `auth.uid() = id`)
  - `blog_posts` should also have a "Public blog posts via share_slug" policy for `SELECT` where `share_enabled = TRUE`

- [ ] **6. Create Edge Functions**
  - Install the Supabase CLI if you haven't: `npm install -g supabase`
  - Link your project: `supabase link --project-ref <your-project-ref>`
  - The project already has stub directories under `supabase/functions/`. Create each function:
    - `supabase functions deploy generate-blog-post` — generates a blog post from a conversation transcript using Claude API
    - `supabase functions deploy proxy-claude` — authenticates users and proxies text conversations to Claude API
    - `supabase functions deploy generate-prompts` — generates personalized conversation starters daily
    - `supabase functions deploy dispatch-notifications` — sends Expo push notifications for scheduled prompts
    - `supabase functions deploy export-blog-markdown` — exports a blog post as clean markdown with frontmatter
  - Note: function implementations will be built in later phases; this step creates the function stubs

- [ ] **7. Set Edge Function secrets**
  - Run the following commands to set secrets your Edge Functions will need:
    ```bash
    supabase secrets set ANTHROPIC_API_KEY=your-anthropic-api-key
    supabase secrets set ELEVENLABS_API_KEY=your-elevenlabs-api-key
    supabase secrets set EXPO_PUSH_ACCESS_TOKEN=your-expo-push-access-token
    ```
  - `ANTHROPIC_API_KEY`: Get from https://console.anthropic.com → API Keys
  - `ELEVENLABS_API_KEY`: Get from https://elevenlabs.io → Profile → API Key
  - `EXPO_PUSH_ACCESS_TOKEN`: Get from https://expo.dev → Access Tokens (needed for sending push notifications)

- [ ] **8. Enable Realtime on the `blog_posts` table**
  - Go to **Database → Replication** in the Supabase dashboard
  - Under "Realtime", find the `blog_posts` table and enable it
  - This allows the app to subscribe to status changes (e.g. `generating` → `ready`) and show real-time updates to the user

- [ ] **9. Set up pg_cron scheduled jobs**
  - Go to **SQL Editor** and run:
    ```sql
    -- Generate personalized prompts daily at 2am UTC
    SELECT cron.schedule(
      'generate-prompts',
      '0 2 * * *',
      $$SELECT net.http_post(
        url := '<your-supabase-url>/functions/v1/generate-prompts',
        headers := '{"Authorization": "Bearer <your-service-role-key>"}'::jsonb
      )$$
    );

    -- Dispatch notifications every 15 minutes
    SELECT cron.schedule(
      'dispatch-notifications',
      '*/15 * * * *',
      $$SELECT net.http_post(
        url := '<your-supabase-url>/functions/v1/dispatch-notifications',
        headers := '{"Authorization": "Bearer <your-service-role-key>"}'::jsonb
      )$$
    );
    ```
  - Replace `<your-supabase-url>` with your Project URL
  - Replace `<your-service-role-key>` with the `service_role` key from **Settings → API** (NOT the anon key)
  - Verify jobs are scheduled: `SELECT * FROM cron.job;`
