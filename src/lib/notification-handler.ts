import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { startFromNotification } from './conversation-starter';
import type { ConversationMode, TopicCategory } from '@/types';

/**
 * Shared handler for processing a notification response (tap / action).
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
) {
  const data = response.notification.request.content.data;
  const actionId = response.actionIdentifier;

  if (data?.type === 'conversation_prompt') {
    const mode: ConversationMode =
      actionId === 'TALK_TEXT' ? 'text' : 'voice'; // Default to voice
    startFromNotification({
      prompt_text: data.prompt_text as string,
      category: data.category as TopicCategory | undefined,
      preferred_mode: mode,
    });
  } else if (data?.type === 'blog_ready') {
    router.push(`/post/${data.blog_post_id}`);
  }
}

/**
 * Listen for notification taps (app was in background or killed).
 */
export function setupNotificationResponseListener() {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );
  return subscription;
}

/**
 * Listen for notifications received while the app is in the foreground.
 * The default handler (setupNotificationHandler) already shows the system alert,
 * so this is mainly for logging / future in-app banner support.
 */
export function setupNotificationReceivedListener() {
  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data;
      console.log('Notification received in foreground:', data);
    },
  );
  return subscription;
}
