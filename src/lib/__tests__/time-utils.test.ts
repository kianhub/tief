import { getGreeting, formatDuration, formatRelativeTime } from '../time-utils';

describe('time-utils', () => {
  describe('getGreeting', () => {
    it('returns "Good morning" for morning hours (5-11)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-12T08:00:00'));
      expect(getGreeting()).toBe('Good morning');
      jest.useRealTimers();
    });

    it('returns "Good afternoon" for afternoon hours (12-16)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-12T14:00:00'));
      expect(getGreeting()).toBe('Good afternoon');
      jest.useRealTimers();
    });

    it('returns "Good evening" for evening hours (17+)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-12T20:00:00'));
      expect(getGreeting()).toBe('Good evening');
      jest.useRealTimers();
    });

    it('returns "Good evening" for late night hours (0-4)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-12T02:00:00'));
      expect(getGreeting()).toBe('Good evening');
      jest.useRealTimers();
    });

    it('returns "Good morning" at boundary hour 5', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-12T05:00:00'));
      expect(getGreeting()).toBe('Good morning');
      jest.useRealTimers();
    });

    it('returns "Good afternoon" at boundary hour 12', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-12T12:00:00'));
      expect(getGreeting()).toBe('Good afternoon');
      jest.useRealTimers();
    });
  });

  describe('formatDuration', () => {
    it('formats 30 seconds as "0 min"', () => {
      expect(formatDuration(30)).toBe('0 min');
    });

    it('formats 90 seconds as "1 min"', () => {
      expect(formatDuration(90)).toBe('1 min');
    });

    it('formats 3600 seconds as "1 hr 0 min"', () => {
      expect(formatDuration(3600)).toBe('1 hr 0 min');
    });

    it('formats 3660 seconds as "1 hr 1 min"', () => {
      expect(formatDuration(3660)).toBe('1 hr 1 min');
    });

    it('formats 7200 seconds as "2 hr 0 min"', () => {
      expect(formatDuration(7200)).toBe('2 hr 0 min');
    });

    it('formats 0 seconds as "0 min"', () => {
      expect(formatDuration(0)).toBe('0 min');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats a recent date with "ago" suffix', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinutesAgo.toISOString());
      expect(result).toContain('ago');
    });

    it('formats an older date', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo.toISOString());
      expect(result).toContain('ago');
      expect(result).toContain('3 days');
    });
  });
});
