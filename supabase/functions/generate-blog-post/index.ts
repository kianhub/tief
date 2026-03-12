import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function buildBlogPrompt(
  transcript: string,
  blogTone: string | null
): string {
  const toneSection =
    blogTone && blogTone !== 'auto'
      ? `The user has requested this writing style: ${blogTone}\nFollow this style preference while keeping the content authentic to their conversation.`
      : `Match the person's speaking style from the transcript. If they're casual, be casual.\nIf they're analytical, be analytical. If they use humor, weave it in. The blog post\nshould read like THEY wrote it, not like a generic AI summary.`;

  return `You are a ghostwriter. You will receive a transcript of a conversation between
a person and an AI. Your job is to write a first-person blog post AS IF the person
wrote it. The post should read like a personal essay or blog entry — thoughtful,
reflective, and in the person's voice.

TONE:
${toneSection}

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
Return JSON only, no other text:
{
  "title": "...",
  "content": "... (markdown)",
  "summary": "...",
  "tags": ["tag1", "tag2", ...]
}`;
}

function buildTranscript(
  messages: Array<{ role: string; content: string }>
): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');
}

function extractJson(text: string): Record<string, unknown> | null {
  // Try parsing the whole text as JSON first
  try {
    return JSON.parse(text);
  } catch {
    // Look for JSON block in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
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
    // 1. Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Missing Authorization header', {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Also accept service role key for webhook triggers
    const isServiceRole =
      authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;

    if (!isServiceRole && (authError || !user)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders,
      });
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const { conversation_id } = body;

    if (!conversation_id || typeof conversation_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'conversation_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use service role client for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 3. Fetch the conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify ownership if authenticated as user (not service role)
    if (user && conversation.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Fetch all messages for the conversation
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('timestamp');

    if (msgError || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages found for conversation' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Fetch the user's profile for tone preference
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', conversation.user_id)
      .single();

    const blogTone = profile?.blog_tone ?? null;

    // 6. Build transcript and prompt
    const transcript = buildTranscript(messages);
    const blogGenerationPrompt = buildBlogPrompt(transcript, blogTone);

    // 7. Call Claude API (non-streaming)
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
          max_tokens: 4096,
          system: blogGenerationPrompt,
          messages: [
            {
              role: 'user',
              content: `Here is the conversation transcript:\n\n${transcript}`,
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
        `Claude API error (${claudeResponse.status}): ${errorText}`
      );
      return new Response(
        JSON.stringify({ error: 'Blog generation failed — upstream API error' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 8. Parse Claude's response
    const claudeData = await claudeResponse.json();
    const responseText =
      claudeData.content?.[0]?.type === 'text'
        ? claudeData.content[0].text
        : '';

    const parsed = extractJson(responseText);

    if (
      !parsed ||
      typeof parsed.title !== 'string' ||
      typeof parsed.content !== 'string'
    ) {
      console.error('Failed to parse blog JSON from Claude response:', responseText);
      return new Response(
        JSON.stringify({
          error: 'Blog generation failed — could not parse response',
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 9. Insert blog_post record
    const blogPostId = crypto.randomUUID();
    const { error: insertError } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        id: blogPostId,
        conversation_id,
        user_id: conversation.user_id,
        title: parsed.title,
        content: parsed.content,
        summary: parsed.summary || null,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        status: 'ready',
        generated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to insert blog post:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save blog post' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 10. Return success
    return new Response(
      JSON.stringify({
        blog_post_id: blogPostId,
        title: parsed.title,
        status: 'ready',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('generate-blog-post error:', error);

    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
