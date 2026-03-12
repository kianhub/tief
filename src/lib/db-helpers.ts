import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  BlogPost,
  BlogPostStatus,
  Conversation,
  Message,
  TopicCategory,
} from '@/types';

// --- Conversations ---

export function insertConversation(
  db: SQLiteDatabase,
  conversation: Omit<Conversation, 'created_at'>
): void {
  try {
    db.runSync(
      `INSERT INTO conversations (id, status, mode, topic_category, topic_prompt, started_at, ended_at, duration_seconds, elevenlabs_conversation_id, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversation.id,
        conversation.status,
        conversation.mode,
        conversation.topic_category,
        conversation.topic_prompt,
        conversation.started_at,
        conversation.ended_at,
        conversation.duration_seconds,
        conversation.elevenlabs_conversation_id,
        conversation.synced_at,
      ]
    );
  } catch (error) {
    console.error('Failed to insert conversation:', error);
    throw error;
  }
}

export function updateConversation(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Conversation>
): void {
  try {
    const keys = Object.keys(updates).filter((k) => k !== 'id');
    if (keys.length === 0) return;

    const setClauses = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => updates[k as keyof Conversation] ?? null);

    db.runSync(
      `UPDATE conversations SET ${setClauses} WHERE id = ?`,
      [...values, id]
    );
  } catch (error) {
    console.error('Failed to update conversation:', error);
    throw error;
  }
}

export function getConversation(
  db: SQLiteDatabase,
  id: string
): Conversation | null {
  try {
    return db.getFirstSync<Conversation>(
      'SELECT * FROM conversations WHERE id = ?',
      [id]
    );
  } catch (error) {
    console.error('Failed to get conversation:', error);
    throw error;
  }
}

export function getRecentConversations(
  db: SQLiteDatabase,
  limit: number = 20
): Conversation[] {
  try {
    return db.getAllSync<Conversation>(
      'SELECT * FROM conversations ORDER BY started_at DESC LIMIT ?',
      [limit]
    );
  } catch (error) {
    console.error('Failed to get recent conversations:', error);
    throw error;
  }
}

export function getConversationsWithBlogStatus(
  db: SQLiteDatabase,
  limit: number = 20
): Array<Conversation & { blog_status: BlogPostStatus | null; blog_title: string | null }> {
  try {
    return db.getAllSync<Conversation & { blog_status: BlogPostStatus | null; blog_title: string | null }>(
      `SELECT c.*, bp.status AS blog_status, bp.title AS blog_title
       FROM conversations c
       LEFT JOIN blog_posts bp ON bp.conversation_id = c.id
       ORDER BY c.started_at DESC
       LIMIT ?`,
      [limit]
    );
  } catch (error) {
    console.error('Failed to get conversations with blog status:', error);
    throw error;
  }
}

// --- Messages ---

export function insertMessage(db: SQLiteDatabase, message: Message): void {
  try {
    db.runSync(
      `INSERT INTO messages (id, conversation_id, role, content, audio_url, timestamp, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversation_id,
        message.role,
        message.content,
        message.audio_url,
        message.timestamp,
        message.synced_at,
      ]
    );
  } catch (error) {
    console.error('Failed to insert message:', error);
    throw error;
  }
}

export function getMessagesByConversation(
  db: SQLiteDatabase,
  conversationId: string
): Message[] {
  try {
    return db.getAllSync<Message>(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
      [conversationId]
    );
  } catch (error) {
    console.error('Failed to get messages by conversation:', error);
    throw error;
  }
}

export function getUnsyncedMessages(db: SQLiteDatabase): Message[] {
  try {
    return db.getAllSync<Message>(
      'SELECT * FROM messages WHERE synced_at IS NULL'
    );
  } catch (error) {
    console.error('Failed to get unsynced messages:', error);
    throw error;
  }
}

// --- Blog Posts ---

export function insertBlogPost(db: SQLiteDatabase, post: BlogPost): void {
  try {
    db.runSync(
      `INSERT INTO blog_posts (id, conversation_id, title, content, summary, tags, share_slug, share_enabled, status, generated_at, edited_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        post.id,
        post.conversation_id,
        post.title,
        post.content,
        post.summary,
        post.tags,
        post.share_slug,
        post.share_enabled,
        post.status,
        post.generated_at,
        post.edited_at,
        post.synced_at,
      ]
    );
  } catch (error) {
    console.error('Failed to insert blog post:', error);
    throw error;
  }
}

export function updateBlogPost(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<BlogPost>
): void {
  try {
    const keys = Object.keys(updates).filter((k) => k !== 'id');
    if (keys.length === 0) return;

    const setClauses = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => updates[k as keyof BlogPost] ?? null);

    db.runSync(
      `UPDATE blog_posts SET ${setClauses} WHERE id = ?`,
      [...values, id]
    );
  } catch (error) {
    console.error('Failed to update blog post:', error);
    throw error;
  }
}

export function getBlogPost(
  db: SQLiteDatabase,
  id: string
): BlogPost | null {
  try {
    return db.getFirstSync<BlogPost>(
      'SELECT * FROM blog_posts WHERE id = ?',
      [id]
    );
  } catch (error) {
    console.error('Failed to get blog post:', error);
    throw error;
  }
}

export function getBlogPostByConversation(
  db: SQLiteDatabase,
  conversationId: string
): BlogPost | null {
  try {
    return db.getFirstSync<BlogPost>(
      'SELECT * FROM blog_posts WHERE conversation_id = ?',
      [conversationId]
    );
  } catch (error) {
    console.error('Failed to get blog post by conversation:', error);
    throw error;
  }
}

export function getAllBlogPosts(
  db: SQLiteDatabase,
  category?: TopicCategory
): BlogPost[] {
  try {
    if (category) {
      return db.getAllSync<BlogPost>(
        `SELECT bp.* FROM blog_posts bp
         JOIN conversations c ON c.id = bp.conversation_id
         WHERE c.topic_category = ?
         ORDER BY bp.generated_at DESC`,
        [category]
      );
    }
    return db.getAllSync<BlogPost>(
      'SELECT * FROM blog_posts ORDER BY generated_at DESC'
    );
  } catch (error) {
    console.error('Failed to get all blog posts:', error);
    throw error;
  }
}

export function searchBlogPosts(
  db: SQLiteDatabase,
  query: string
): BlogPost[] {
  try {
    const pattern = `%${query}%`;
    return db.getAllSync<BlogPost>(
      'SELECT * FROM blog_posts WHERE title LIKE ? OR content LIKE ? ORDER BY generated_at DESC',
      [pattern, pattern]
    );
  } catch (error) {
    console.error('Failed to search blog posts:', error);
    throw error;
  }
}

// --- Preferences ---

export function setPreference(
  db: SQLiteDatabase,
  key: string,
  value: string
): void {
  try {
    db.runSync(
      `INSERT OR REPLACE INTO user_preferences (key, value, updated_at)
       VALUES (?, ?, ?)`,
      [key, value, new Date().toISOString()]
    );
  } catch (error) {
    console.error('Failed to set preference:', error);
    throw error;
  }
}

export function getPreference(
  db: SQLiteDatabase,
  key: string
): string | null {
  try {
    const row = db.getFirstSync<{ value: string }>(
      'SELECT value FROM user_preferences WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  } catch (error) {
    console.error('Failed to get preference:', error);
    throw error;
  }
}

export function getAllPreferences(
  db: SQLiteDatabase
): Record<string, string> {
  try {
    const rows = db.getAllSync<{ key: string; value: string }>(
      'SELECT key, value FROM user_preferences'
    );
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  } catch (error) {
    console.error('Failed to get all preferences:', error);
    throw error;
  }
}
