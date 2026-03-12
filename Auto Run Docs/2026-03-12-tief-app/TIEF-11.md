# TIEF-11: Supabase Edge Functions

> Create all 5 Supabase Edge Functions: proxy-claude, generate-blog-post, generate-prompts, dispatch-notifications, export-blog-markdown.

## Prerequisites
- TIEF-10 completed (conversation flow calls these functions)

## Reference
- Product spec §3.5 (Edge Functions), §6.2 (Blog Generation Prompt), §6.3 (Prompt Generation)

## Note
- Edge Functions are written in TypeScript/Deno for Supabase
- They run server-side — API keys are accessed via `Deno.env.get()`
- Each function lives in `supabase/functions/<name>/index.ts`
- User must deploy these after setting up Supabase (see `/useractions/01-supabase-setup.md`)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `supabase` for Edge Function patterns (Deno serve, CORS headers, auth verification, `createClient` in Deno). Look up Anthropic Claude API for `/v1/messages` request format, streaming SSE, and model IDs.
- **Skill: `claude-api`**: Invoke for correct Claude API message format, model selection, streaming response handling, and system prompt best practices.

---

- [x] **Create `supabase/functions/proxy-claude/index.ts` — Authenticated Claude API proxy with streaming.** This edge function authenticates the user and streams Claude API responses back:

```typescript
// Deno edge function
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

**Request:** POST with body `{ messages: Array<{role, content}>, system_prompt: string }`
**Auth:** Bearer token in Authorization header (Supabase JWT)

**Implementation:**
1. Validate Authorization header — extract JWT, verify with Supabase:
   ```typescript
   const supabase = createClient(
     Deno.env.get('SUPABASE_URL')!,
     Deno.env.get('SUPABASE_ANON_KEY')!,
     { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
   );
   const { data: { user }, error } = await supabase.auth.getUser();
   if (error || !user) return new Response('Unauthorized', { status: 401 });
   ```
2. Parse request body, validate messages array and system_prompt
3. Call Claude API with streaming:
   ```typescript
   const response = await fetch('https://api.anthropic.com/v1/messages', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
       'anthropic-version': '2023-06-01',
     },
     body: JSON.stringify({
       model: 'claude-sonnet-4-20250514',
       max_tokens: 1024,
       stream: true,
       system: system_prompt,
       messages: messages,
     }),
   });
   ```
4. Stream the response back to the client (pass through the SSE stream)
5. Handle errors: invalid request (400), auth failure (401), Claude API error (502)

**Rate limiting:** Basic per-user rate limit — check a counter in the DB. For MVP, allow 60 requests per hour per user. If exceeded, return 429.

Add CORS headers for the Expo client.

- [x] **Create `supabase/functions/generate-blog-post/index.ts` — Blog post generation from conversation transcript.** Per spec §3.5 Edge Function #1:

**Request:** POST with body `{ conversation_id: string }`
**Auth:** Bearer token OR service role key (can be triggered by webhook)

**Implementation:**
1. Authenticate the request
2. Fetch the conversation and all its messages from the DB:
   ```typescript
   const { data: conversation } = await supabase
     .from('conversations').select('*').eq('id', conversation_id).single();
   const { data: messages } = await supabase
     .from('messages').select('*').eq('conversation_id', conversation_id).order('timestamp');
   ```
3. Fetch the user's profile for tone preference:
   ```typescript
   const { data: profile } = await supabase
     .from('profiles').select('*').eq('id', conversation.user_id).single();
   ```
4. Build the transcript string from messages: `"User: ...\nAI: ...\n"`
5. Build the blog generation prompt per spec §6.2 — include the full template with:
   - Tone handling: if `profile.blog_tone` is set and not 'auto', use the override. Otherwise auto-match.
   - Full transcript
   - All rules about first-person writing, no mention of AI, 400-800 words
   - JSON output format: `{ title, content, summary, tags }`
6. Call Claude API (non-streaming, we want the full response):
   ```typescript
   const response = await fetch('https://api.anthropic.com/v1/messages', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
       'anthropic-version': '2023-06-01',
     },
     body: JSON.stringify({
       model: 'claude-sonnet-4-20250514',
       max_tokens: 4096,
       system: blogGenerationPrompt,
       messages: [{ role: 'user', content: `Here is the conversation transcript:\n\n${transcript}` }],
     }),
   });
   ```
7. Parse the JSON response from Claude (extract from the text response, handle potential JSON parsing issues)
8. Create blog_post record:
   ```typescript
   await supabase.from('blog_posts').insert({
     id: crypto.randomUUID(),
     conversation_id,
     user_id: conversation.user_id,
     title: parsed.title,
     content: parsed.content,
     summary: parsed.summary,
     tags: parsed.tags,
     status: 'ready',
     generated_at: new Date().toISOString(),
   });
   ```
9. Optionally send a push notification that the post is ready (call dispatch helper or insert into notification queue)
10. Return success response

**Error handling:** If Claude API fails, set blog status to 'generating' still (can be retried). Log the error.

- [x] **Create `supabase/functions/generate-prompts/index.ts` — Daily personalized prompt generation.** Per spec §3.5 Edge Function #2:

This runs as a daily cron job. It generates conversation starter prompts for each active user.

**Implementation:**
1. This function is called by pg_cron or Supabase scheduled function (no auth needed — use service role)
2. Fetch all active users (profiles where onboarding_completed = true):
   ```typescript
   const { data: users } = await supabaseAdmin.from('profiles').select('*').eq('onboarding_completed', true);
   ```
3. For each user:
   a. Fetch their recent conversation topics (last 10 conversations)
   b. Build the prompt generation prompt per spec §6.3
   c. Call Claude API to generate 1-3 prompts
   d. Parse the JSON array response
   e. Insert into `prompt_bank` table with `is_personalized = true` and `user_id`
4. Also schedule notifications based on user preferences:
   - For each generated prompt, create a `notification_log` entry with `scheduled_for` based on user's timezone and notification_times
5. Return summary: `{ users_processed, prompts_generated }`

Use `supabaseAdmin` (service role client) since this is a server-to-server function.

- [ ] **Create `supabase/functions/dispatch-notifications/index.ts` and `supabase/functions/export-blog-markdown/index.ts`.**

**`dispatch-notifications/index.ts`** per spec §3.5 Edge Function #3:
- Runs every 15 minutes via cron
- Query: `notification_log WHERE scheduled_for <= NOW() AND delivered_at IS NULL`
- For each pending notification:
  1. Get user's Expo push token from their profile (add `expo_push_token` field to profiles — note: update the type definition and add a task in useractions to add this column)
  2. Send via Expo Push Notifications API:
     ```typescript
     await fetch('https://exp.host/--/api/v2/push/send', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${Deno.env.get('EXPO_PUSH_ACCESS_TOKEN')}`,
       },
       body: JSON.stringify({
         to: pushToken,
         title: 'tief.',
         body: notification.prompt_text,
         data: {
           type: 'conversation_prompt',
           prompt_id: notification.prompt_id,
           prompt_text: notification.prompt_text,
           category: notification.category || 'random',
           screen: 'conversation/new',
         },
         sound: 'default',
         categoryId: 'conversation_prompt',
       }),
     });
     ```
  3. Update `delivered_at = NOW()` on the notification_log entry
  4. Handle failures (invalid tokens, expired tokens) — mark as failed, don't retry indefinitely
- Return summary: `{ dispatched, failed }`

**`export-blog-markdown/index.ts`** per spec §3.5 Edge Function #5:
- Request: POST `{ blog_post_id: string }` with auth
- Authenticate user, verify they own the blog post
- Fetch blog post from DB
- Format as clean markdown with frontmatter per spec §8.1:
  ```markdown
  # {title}

  *{date} · tief.*
  *Tags: {tags joined by comma}*

  ---

  {content}
  ```
- Return the markdown string with `Content-Type: text/markdown`

Also update `/useractions/01-supabase-setup.md` to include: add `expo_push_token TEXT` column to profiles table.

Verify all edge functions have valid TypeScript/Deno syntax. Each function should be self-contained in its own directory with an `index.ts` file.
