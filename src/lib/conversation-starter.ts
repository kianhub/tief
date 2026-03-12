import { router } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';

import type { ConversationMode, TopicCategory } from '@/types';

/**
 * Start a conversation from a featured prompt card.
 */
export function startFromPrompt(
  topic: string,
  category: TopicCategory,
  mode: ConversationMode,
) {
  const id = uuidv4();
  const params = new URLSearchParams({ topic, mode, category });
  router.push(`/conversation/${id}?${params.toString()}`);
}

/**
 * Start a conversation from the free-form topic input.
 * Category defaults to 'random'.
 */
export function startFromCustomTopic(topic: string, mode: ConversationMode) {
  const id = uuidv4();
  const params = new URLSearchParams({ topic, mode, category: 'random' });
  router.push(`/conversation/${id}?${params.toString()}`);
}

/**
 * Start a conversation from a push notification payload.
 */
export function startFromNotification(data: {
  prompt_text: string;
  category?: TopicCategory;
  preferred_mode?: ConversationMode;
}) {
  const id = uuidv4();
  const params = new URLSearchParams({
    topic: data.prompt_text,
    mode: data.preferred_mode ?? 'voice',
    category: data.category ?? 'random',
  });
  router.push(`/conversation/${id}?${params.toString()}`);
}

/**
 * Resume an existing conversation — navigates without extra params
 * so the route loads everything from the local DB.
 */
export function resumeConversation(conversationId: string) {
  router.push(`/conversation/${conversationId}`);
}
