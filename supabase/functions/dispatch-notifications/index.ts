import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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

    const expoPushAccessToken = Deno.env.get('EXPO_PUSH_ACCESS_TOKEN');
    if (!expoPushAccessToken) {
      console.error('EXPO_PUSH_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query pending notifications: scheduled_for <= NOW() AND delivered_at IS NULL
    const { data: pendingNotifications, error: queryError } = await supabaseAdmin
      .from('notification_log')
      .select('*')
      .lte('scheduled_for', new Date().toISOString())
      .is('delivered_at', null);

    if (queryError) {
      console.error('Failed to fetch pending notifications:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ dispatched: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let dispatched = 0;
    let failed = 0;

    for (const notification of pendingNotifications) {
      try {
        // Get user's Expo push token from their profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('expo_push_token')
          .eq('id', notification.user_id)
          .single();

        const pushToken = profile?.expo_push_token;

        if (!pushToken) {
          console.warn(`No push token for user ${notification.user_id}, skipping`);
          failed++;
          continue;
        }

        // Send via Expo Push Notifications API
        const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${expoPushAccessToken}`,
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

        if (!pushResponse.ok) {
          const errorText = await pushResponse.text().catch(() => 'Unknown push error');
          console.error(`Push API error for notification ${notification.id}: ${errorText}`);
          failed++;
          continue;
        }

        const pushResult = await pushResponse.json();
        const ticketData = pushResult?.data;

        // Check for device-level errors (invalid/expired token)
        if (ticketData?.status === 'error') {
          console.error(`Push ticket error for notification ${notification.id}:`, ticketData);

          // If token is invalid, clear it from profile so we stop retrying
          if (
            ticketData.details?.error === 'DeviceNotRegistered' ||
            ticketData.details?.error === 'InvalidCredentials'
          ) {
            await supabaseAdmin
              .from('profiles')
              .update({ expo_push_token: null })
              .eq('id', notification.user_id);
          }

          // Mark as delivered to prevent infinite retries on bad tokens
          await supabaseAdmin
            .from('notification_log')
            .update({ delivered_at: new Date().toISOString() })
            .eq('id', notification.id);
          failed++;
          continue;
        }

        // Success — mark as delivered
        await supabaseAdmin
          .from('notification_log')
          .update({ delivered_at: new Date().toISOString() })
          .eq('id', notification.id);
        dispatched++;
      } catch (notifError) {
        console.error(`Error dispatching notification ${notification.id}:`, notifError);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ dispatched, failed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('dispatch-notifications error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
