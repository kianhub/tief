import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Rate limit: 60 requests per hour per user
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

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
    // 1. Validate Authorization header and authenticate user
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

    if (authError || !user) {
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders,
      });
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const { messages, system_prompt } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof system_prompt !== 'string' || system_prompt.length === 0) {
      return new Response(
        JSON.stringify({ error: 'system_prompt must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each message has role and content
    for (const msg of messages) {
      if (!msg.role || !msg.content || !['user', 'assistant'].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: 'Each message must have a valid role (user|assistant) and content' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Rate limiting — count user messages in the last hour
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { count, error: countError } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', windowStart);

    if (!countError && count !== null && count >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '3600',
          },
        }
      );
    }

    // 4. Call Claude API with streaming
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        stream: true,
        system: system_prompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text().catch(() => 'Unknown Claude API error');
      console.error(`Claude API error (${claudeResponse.status}): ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Upstream API error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Stream the SSE response back to the client
    const responseHeaders = new Headers({
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Pass through the Claude SSE stream directly
    return new Response(claudeResponse.body, { headers: responseHeaders });
  } catch (error) {
    console.error('proxy-claude error:', error);

    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
