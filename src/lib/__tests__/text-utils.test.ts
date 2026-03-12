import { slugify } from '../text-utils';
import { parseTags, stringifyTags } from '@/types';

describe('text-utils', () => {
  describe('slugify', () => {
    it('converts a simple title to a slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
    });

    it('replaces multiple spaces with a single hyphen', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('trims leading and trailing whitespace', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });

    it('handles underscores', () => {
      expect(slugify('hello_world')).toBe('hello-world');
    });

    it('collapses multiple hyphens', () => {
      expect(slugify('hello---world')).toBe('hello-world');
    });

    it('removes leading and trailing hyphens', () => {
      expect(slugify('-hello world-')).toBe('hello-world');
    });

    it('handles empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('handles a realistic blog title', () => {
      expect(slugify('What Is Consciousness? A Deep Dive')).toBe(
        'what-is-consciousness-a-deep-dive'
      );
    });
  });

  describe('parseTags', () => {
    it('parses a valid JSON array of strings', () => {
      expect(parseTags('["philosophy","science"]')).toEqual([
        'philosophy',
        'science',
      ]);
    });

    it('returns empty array for invalid JSON', () => {
      expect(parseTags('not json')).toEqual([]);
    });

    it('returns empty array for non-array JSON', () => {
      expect(parseTags('{"key": "value"}')).toEqual([]);
    });

    it('filters out non-string values', () => {
      expect(parseTags('[1, "hello", true, "world"]')).toEqual([
        'hello',
        'world',
      ]);
    });

    it('returns empty array for empty string', () => {
      expect(parseTags('')).toEqual([]);
    });

    it('handles empty array', () => {
      expect(parseTags('[]')).toEqual([]);
    });
  });

  describe('stringifyTags', () => {
    it('converts an array of strings to JSON', () => {
      expect(stringifyTags(['philosophy', 'science'])).toBe(
        '["philosophy","science"]'
      );
    });

    it('handles empty array', () => {
      expect(stringifyTags([])).toBe('[]');
    });
  });

  describe('parseTags + stringifyTags round-trip', () => {
    it('round-trips correctly', () => {
      const tags = ['philosophy', 'science', 'creativity'];
      expect(parseTags(stringifyTags(tags))).toEqual(tags);
    });

    it('round-trips empty array', () => {
      expect(parseTags(stringifyTags([]))).toEqual([]);
    });
  });
});
