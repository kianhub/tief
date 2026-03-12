import type { TopicCategory } from '@/constants/categories';

// Re-export for convenience
export type { TopicCategory };

// --- Enums / Union Types ---

export type ConversationStatus = 'active' | 'ended' | 'archived';
export type ConversationMode = 'voice' | 'text';
export type MessageRole = 'user' | 'assistant';
export type BlogPostStatus = 'generating' | 'ready' | 'edited';
export type BlogTone =
  | 'auto'
  | 'casual'
  | 'reflective'
  | 'analytical'
  | 'poetic'
  | 'conversational';
export type NotificationFrequency = 'daily' | 'twice_daily' | 'few_times';
export type PromptDifficulty = 'light' | 'medium' | 'deep';

// --- Local SQLite Entities ---

export interface Conversation {
  id: string;
  status: ConversationStatus;
  mode: ConversationMode;
  topic_category: TopicCategory | null;
  topic_prompt: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  elevenlabs_conversation_id: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  audio_url: string | null;
  timestamp: string;
  synced_at: string | null;
}

export interface BlogPost {
  id: string;
  conversation_id: string;
  title: string;
  content: string; // markdown
  summary: string | null;
  tags: string; // JSON array string locally
  share_slug: string | null;
  share_enabled: number; // 0 or 1 (SQLite boolean)
  status: BlogPostStatus;
  generated_at: string | null;
  edited_at: string | null;
  synced_at: string | null;
}

export interface UserPreference {
  key: string;
  value: string;
  updated_at: string;
}

export interface NotificationQueueItem {
  id: string;
  prompt: string;
  topic_category: TopicCategory | null;
  scheduled_for: string | null;
  delivered: number;
  opened: number;
  created_at: string;
}

// --- Supabase-specific Types ---

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  voice_preference: string;
  blog_tone: BlogTone | null;
  topic_interests: TopicCategory[];
  notification_times: Array<{ hour: number; minute: number }>;
  notification_frequency: NotificationFrequency;
  timezone: string;
  onboarding_completed: boolean;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptBankItem {
  id: string;
  category: TopicCategory;
  prompt: string;
  difficulty: PromptDifficulty;
  is_personalized: boolean;
  user_id: string | null;
  used_count: number;
  created_at: string;
}

// --- Composite / Helper Types ---

export type ConversationWithBlogPost = Conversation & {
  blog_post?: BlogPost;
};

export type MessageWithConversation = Message & {
  conversation: Conversation;
};

// --- Tag Helpers ---

export function parseTags(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}
