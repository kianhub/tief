import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PROMPTS_PER_USER = 3;

interface PromptResult {
  prompt: string;
  category: string;
  difficulty: 'light' | 'medium' | 'deep';
}

function buildPromptGenerationPrompt(
  userName: string | null,
  interests: string[],
  recentTopics: string[],
  scheduledTime: string,
  conversationCount: number,
  count: number
): string {
  return `You are generating conversation starters for a user of tief., an app that
initiates meaningful conversations.

USER PROFILE:
- Name: ${userName ?? 'Unknown'}
- Interests: ${interests.length > 0 ? interests.join(', ') : 'not specified'}
- Recent conversation topics: ${recentTopics.length > 0 ? recentTopics.join(', ') : 'none yet'}
- Time of day this will be sent: ${scheduledTime}
- Conversations had so far: ${conversationCount}

RULES:
- Generate ${count} conversation starter questions
- Questions should be open-ended and invite personal reflection
- Vary between: philosophical, personal, hypothetical, creative, analytical
- Don't repeat topics the user has recently discussed
- Match the vibe to time of day (lighter in morning, deeper in evening)
- Each question should be 1-2 sentences max
- Make them feel like something a thoughtful friend would text you

OUTPUT FORMAT:
Return JSON array only, no other text:
[
  {
    "prompt": "...",
    "category": "philosophy|science|relationships|creativity|psychology|culture|career|nature|history|spirituality",
    "difficulty": "light|medium|deep"
  }
]`;
}

function extractJsonArray(text: string): PromptResult[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function getScheduledTimeLabel(hour: number): string {
  if (hour < 6) return 'late night';
  if (hour < 10) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 18) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // This function is called by pg_cron — use service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch all active users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('onboarding_completed', true);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ users_processed: 0, prompts_generated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalPromptsGenerated = 0;

    // 2. Process each user
    for (const user of users) {
      try {
        // Fetch recent conversation topics (last 10)
        const { data: recentConversations } = await supabaseAdmin
          .from('conversations')
          .select('topic_category, topic_prompt')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(10);

        const recentTopics: string[] = (recentConversations ?? [])
          .map((c: { topic_prompt: string | null; topic_category: string | null }) =>
            c.topic_prompt || c.topic_category
          )
          .filter((t: string | null): t is string => !!t);

        // Count total conversations
        const { count: conversationCount } = await supabaseAdmin
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Determine scheduled time from user's notification preferences
        const notificationTimes: Array<{ hour: number; minute: number }> =
          user.notification_times ?? [];
        const firstTime = notificationTimes[0] ?? { hour: 9, minute: 0 };
        const scheduledTime = getScheduledTimeLabel(firstTime.hour);

        // Build the prompt
        const interests: string[] = user.topic_interests ?? [];
        const systemPrompt = buildPromptGenerationPrompt(
          user.display_name,
          interests,
          recentTopics,
          scheduledTime,
          conversationCount ?? 0,
          PROMPTS_PER_USER
        );

        // Call Claude API (non-streaming)
        const claudeResponse = await fetch(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicApiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1024,
              system: systemPrompt,
              messages: [
                {
                  role: 'user',
                  content:
                    'Generate personalized conversation starters for this user.',
                },
              ],
            }),
          }
        );

        if (!claudeResponse.ok) {
          const errorText = await claudeResponse
            .text()
            .catch(() => 'Unknown Claude API error');
          console.error(
            `Claude API error for user ${user.id} (${claudeResponse.status}): ${errorText}`
          );
          continue;
        }

        const claudeData = await claudeResponse.json();
        const responseText =
          claudeData.content?.[0]?.type === 'text'
            ? claudeData.content[0].text
            : '';

        const prompts = extractJsonArray(responseText);
        if (!prompts || prompts.length === 0) {
          console.error(
            `Failed to parse prompts for user ${user.id}:`,
            responseText
          );
          continue;
        }

        // Insert prompts into prompt_bank
        const promptInserts = prompts.map((p) => ({
          id: crypto.randomUUID(),
          category: p.category,
          prompt: p.prompt,
          difficulty: p.difficulty,
          is_personalized: true,
          user_id: user.id,
          used_count: 0,
        }));

        const { data: insertedPrompts, error: insertError } =
          await supabaseAdmin
            .from('prompt_bank')
            .insert(promptInserts)
            .select('id, prompt, category');

        if (insertError) {
          console.error(
            `Failed to insert prompts for user ${user.id}:`,
            insertError
          );
          continue;
        }

        totalPromptsGenerated += insertedPrompts?.length ?? 0;

        // Schedule notifications based on user preferences
        if (insertedPrompts && notificationTimes.length > 0) {
          const now = new Date();
          // Schedule for today (or tomorrow if times have passed)
          const userTz = user.timezone || 'UTC';

          const notificationInserts = [];
          for (
            let i = 0;
            i < Math.min(insertedPrompts.length, notificationTimes.length);
            i++
          ) {
            const time = notificationTimes[i];
            const prompt = insertedPrompts[i];

            // Build scheduled_for timestamp in user's timezone
            const scheduled = new Date(
              now.toLocaleString('en-US', { timeZone: userTz })
            );
            scheduled.setHours(time.hour, time.minute, 0, 0);

            // If this time has already passed today, schedule for tomorrow
            const nowInTz = new Date(
              now.toLocaleString('en-US', { timeZone: userTz })
            );
            if (scheduled <= nowInTz) {
              scheduled.setDate(scheduled.getDate() + 1);
            }

            notificationInserts.push({
              id: crypto.randomUUID(),
              user_id: user.id,
              prompt_id: prompt.id,
              prompt_text: prompt.prompt,
              scheduled_for: scheduled.toISOString(),
            });
          }

          if (notificationInserts.length > 0) {
            const { error: notifError } = await supabaseAdmin
              .from('notification_log')
              .insert(notificationInserts);

            if (notifError) {
              console.error(
                `Failed to schedule notifications for user ${user.id}:`,
                notifError
              );
            }
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        users_processed: users.length,
        prompts_generated: totalPromptsGenerated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('generate-prompts error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
