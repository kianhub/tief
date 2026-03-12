import { buildSystemPrompt, PromptParams } from '../prompt-builder';

describe('prompt-builder', () => {
  const defaultParams: PromptParams = {
    topicPrompt: 'What is the meaning of life?',
    topicCategory: 'philosophy',
    userName: 'Alice',
    userInterests: ['philosophy', 'science', 'creativity'],
    recentThemes: ['consciousness', 'free will'],
  };

  describe('buildSystemPrompt', () => {
    it('includes all placeholder values', () => {
      const result = buildSystemPrompt(defaultParams);

      expect(result).toContain('What is the meaning of life?');
      expect(result).toContain('philosophy');
      expect(result).toContain('Alice');
      expect(result).toContain('philosophy, science, creativity');
      expect(result).toContain('consciousness, free will');
    });

    it('includes PERSONALITY section', () => {
      const result = buildSystemPrompt(defaultParams);
      expect(result).toContain('PERSONALITY:');
      expect(result).toContain('Warm but intellectually rigorous');
    });

    it('includes CONVERSATION STYLE section', () => {
      const result = buildSystemPrompt(defaultParams);
      expect(result).toContain('CONVERSATION STYLE:');
    });

    it('includes TOPIC CONTEXT section', () => {
      const result = buildSystemPrompt(defaultParams);
      expect(result).toContain('TOPIC CONTEXT:');
      expect(result).toContain('Category: philosophy');
    });

    it('includes USER CONTEXT section', () => {
      const result = buildSystemPrompt(defaultParams);
      expect(result).toContain('USER CONTEXT:');
      expect(result).toContain('Name: Alice');
    });

    it('includes IMPORTANT section', () => {
      const result = buildSystemPrompt(defaultParams);
      expect(result).toContain('IMPORTANT:');
    });

    it('handles empty userInterests', () => {
      const result = buildSystemPrompt({
        ...defaultParams,
        userInterests: [],
      });
      expect(result).toContain('Interests: ');
    });

    it('handles empty recentThemes with fallback text', () => {
      const result = buildSystemPrompt({
        ...defaultParams,
        recentThemes: [],
      });
      expect(result).toContain('None yet');
    });

    it('includes tief. identity', () => {
      const result = buildSystemPrompt(defaultParams);
      expect(result).toContain('You are tief.');
    });
  });
});
