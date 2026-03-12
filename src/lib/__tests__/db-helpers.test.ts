import {
  insertConversation,
  getRecentConversations,
  getConversation,
  insertMessage,
  getMessagesByConversation,
  insertBlogPost,
  getBlogPost,
  getAllBlogPosts,
  searchBlogPosts,
  setPreference,
  getPreference,
} from '../db-helpers';
import type { SQLiteDatabase } from 'expo-sqlite';

// Create a mock database that tracks calls
function createMockDb() {
  return {
    runSync: jest.fn(),
    getFirstSync: jest.fn(),
    getAllSync: jest.fn(),
  } as unknown as jest.Mocked<SQLiteDatabase>;
}

describe('db-helpers', () => {
  let db: jest.Mocked<SQLiteDatabase>;

  beforeEach(() => {
    db = createMockDb();
  });

  // --- Conversations ---

  describe('insertConversation', () => {
    it('calls runSync with INSERT statement and correct values', () => {
      const conversation = {
        id: 'conv-1',
        status: 'active' as const,
        mode: 'voice' as const,
        topic_category: 'philosophy' as const,
        topic_prompt: 'What is consciousness?',
        started_at: '2026-03-12T10:00:00Z',
        ended_at: null,
        duration_seconds: null,
        elevenlabs_conversation_id: null,
        synced_at: null,
      };

      insertConversation(db, conversation);

      expect(db.runSync).toHaveBeenCalledTimes(1);
      expect(db.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversations'),
        [
          'conv-1',
          'active',
          'voice',
          'philosophy',
          'What is consciousness?',
          '2026-03-12T10:00:00Z',
          null,
          null,
          null,
          null,
        ]
      );
    });

    it('throws when db.runSync fails', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      db.runSync.mockImplementation(() => {
        throw new Error('UNIQUE constraint');
      });

      expect(() =>
        insertConversation(db, {
          id: 'conv-1',
          status: 'active',
          mode: 'voice',
          topic_category: null,
          topic_prompt: null,
          started_at: '2026-03-12T10:00:00Z',
          ended_at: null,
          duration_seconds: null,
          elevenlabs_conversation_id: null,
          synced_at: null,
        })
      ).toThrow('UNIQUE constraint');
    });
  });

  describe('getRecentConversations', () => {
    it('returns ordered results from getAllSync', () => {
      const mockConversations = [
        { id: 'conv-2', started_at: '2026-03-12T11:00:00Z' },
        { id: 'conv-1', started_at: '2026-03-12T10:00:00Z' },
      ];
      db.getAllSync.mockReturnValue(mockConversations);

      const result = getRecentConversations(db);

      expect(result).toEqual(mockConversations);
      expect(db.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY started_at DESC'),
        [20]
      );
    });

    it('respects custom limit', () => {
      db.getAllSync.mockReturnValue([]);

      getRecentConversations(db, 5);

      expect(db.getAllSync).toHaveBeenCalledWith(expect.any(String), [5]);
    });
  });

  // --- Messages ---

  describe('insertMessage', () => {
    it('inserts a message with all fields', () => {
      const message = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user' as const,
        content: 'Hello world',
        audio_url: null,
        timestamp: '2026-03-12T10:00:00Z',
        synced_at: null,
      };

      insertMessage(db, message);

      expect(db.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        ['msg-1', 'conv-1', 'user', 'Hello world', null, '2026-03-12T10:00:00Z', null]
      );
    });
  });

  describe('getMessagesByConversation', () => {
    it('returns messages ordered by timestamp', () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Hello', timestamp: '2026-03-12T10:00:00Z' },
        { id: 'msg-2', content: 'World', timestamp: '2026-03-12T10:01:00Z' },
      ];
      db.getAllSync.mockReturnValue(mockMessages);

      const result = getMessagesByConversation(db, 'conv-1');

      expect(result).toEqual(mockMessages);
      expect(db.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp ASC'),
        ['conv-1']
      );
    });
  });

  // --- Blog Posts ---

  describe('insertBlogPost', () => {
    it('inserts a blog post with all fields', () => {
      const post = {
        id: 'post-1',
        conversation_id: 'conv-1',
        title: 'Test Post',
        content: '# Hello',
        summary: 'A test',
        tags: '["test"]',
        share_slug: 'test-post',
        share_enabled: 0,
        status: 'ready' as const,
        generated_at: '2026-03-12T10:00:00Z',
        edited_at: null,
        synced_at: null,
      };

      insertBlogPost(db, post);

      expect(db.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO blog_posts'),
        [
          'post-1', 'conv-1', 'Test Post', '# Hello', 'A test',
          '["test"]', 'test-post', 0, 'ready', '2026-03-12T10:00:00Z', null, null,
        ]
      );
    });
  });

  describe('getBlogPost', () => {
    it('returns a blog post by id', () => {
      const mockPost = { id: 'post-1', title: 'Test' };
      db.getFirstSync.mockReturnValue(mockPost);

      const result = getBlogPost(db, 'post-1');

      expect(result).toEqual(mockPost);
      expect(db.getFirstSync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        ['post-1']
      );
    });

    it('returns null when post not found', () => {
      db.getFirstSync.mockReturnValue(null);

      const result = getBlogPost(db, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllBlogPosts', () => {
    it('returns all posts when no category filter', () => {
      const mockPosts = [{ id: 'post-1' }, { id: 'post-2' }];
      db.getAllSync.mockReturnValue(mockPosts);

      const result = getAllBlogPosts(db);

      expect(result).toEqual(mockPosts);
      expect(db.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY generated_at DESC')
      );
    });

    it('filters by category when provided', () => {
      db.getAllSync.mockReturnValue([]);

      getAllBlogPosts(db, 'philosophy');

      expect(db.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('topic_category = ?'),
        ['philosophy']
      );
    });
  });

  describe('searchBlogPosts', () => {
    it('searches by title and content with LIKE pattern', () => {
      const mockPosts = [{ id: 'post-1', title: 'Consciousness' }];
      db.getAllSync.mockReturnValue(mockPosts);

      const result = searchBlogPosts(db, 'conscious');

      expect(result).toEqual(mockPosts);
      expect(db.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        ['%conscious%', '%conscious%']
      );
    });

    it('returns empty array for non-matching query', () => {
      db.getAllSync.mockReturnValue([]);

      const result = searchBlogPosts(db, 'zzzzzzz');

      expect(result).toEqual([]);
    });
  });

  // --- Preferences ---

  describe('setPreference', () => {
    it('calls INSERT OR REPLACE with key and value', () => {
      setPreference(db, 'theme', 'dark');

      expect(db.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO user_preferences'),
        ['theme', 'dark', expect.any(String)]
      );
    });
  });

  describe('getPreference', () => {
    it('returns the value when key exists', () => {
      db.getFirstSync.mockReturnValue({ value: 'dark' });

      const result = getPreference(db, 'theme');

      expect(result).toBe('dark');
    });

    it('returns null when key does not exist', () => {
      db.getFirstSync.mockReturnValue(null);

      const result = getPreference(db, 'nonexistent');

      expect(result).toBeNull();
    });
  });
});
