import { colors, typography, springs, spacing, radii } from '../theme';

describe('theme', () => {
  const requiredColorKeys = [
    'background',
    'surface',
    'textPrimary',
    'textSecondary',
    'textTertiary',
    'accent',
    'accentSecondary',
    'border',
  ] as const;

  describe('colors', () => {
    it('light palette has all required color keys', () => {
      for (const key of requiredColorKeys) {
        expect(colors.light).toHaveProperty(key);
        expect(typeof colors.light[key]).toBe('string');
      }
    });

    it('dark palette has all required color keys', () => {
      for (const key of requiredColorKeys) {
        expect(colors.dark).toHaveProperty(key);
        expect(typeof colors.dark[key]).toBe('string');
      }
    });

    it('light and dark palettes have the same keys', () => {
      expect(Object.keys(colors.light).sort()).toEqual(
        Object.keys(colors.dark).sort()
      );
    });

    it('all color values are valid hex strings', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      for (const key of requiredColorKeys) {
        expect(colors.light[key]).toMatch(hexPattern);
        expect(colors.dark[key]).toMatch(hexPattern);
      }
    });
  });

  describe('typography', () => {
    const requiredVariants = [
      'display',
      'title',
      'body',
      'ui',
      'caption',
      'chat',
    ] as const;

    it('has all required typography variants', () => {
      for (const variant of requiredVariants) {
        expect(typography).toHaveProperty(variant);
      }
    });

    it('each variant has fontSize, fontWeight, and lineHeight', () => {
      for (const variant of requiredVariants) {
        const style = typography[variant];
        expect(typeof style.fontSize).toBe('number');
        expect(typeof style.fontWeight).toBe('string');
        expect(typeof style.lineHeight).toBe('number');
      }
    });

    it('font sizes are positive numbers', () => {
      for (const key of Object.keys(typography) as (keyof typeof typography)[]) {
        expect(typography[key].fontSize).toBeGreaterThan(0);
      }
    });
  });

  describe('springs', () => {
    const springConfigs = ['snappy', 'default', 'gentle', 'breathe'] as const;

    it('has all spring configs', () => {
      for (const config of springConfigs) {
        expect(springs).toHaveProperty(config);
      }
    });

    it('each spring config has damping, stiffness, and mass', () => {
      for (const config of springConfigs) {
        const spring = springs[config];
        expect(typeof spring.damping).toBe('number');
        expect(typeof spring.stiffness).toBe('number');
        expect(typeof spring.mass).toBe('number');
        expect(spring.damping).toBeGreaterThan(0);
        expect(spring.stiffness).toBeGreaterThan(0);
        expect(spring.mass).toBeGreaterThan(0);
      }
    });
  });

  describe('spacing', () => {
    it('has contentPadding and cardPadding', () => {
      expect(typeof spacing.contentPadding).toBe('number');
      expect(typeof spacing.cardPadding).toBe('number');
    });

    it('all spacing values are positive', () => {
      for (const key of Object.keys(spacing) as (keyof typeof spacing)[]) {
        expect(spacing[key]).toBeGreaterThan(0);
      }
    });
  });

  describe('radii', () => {
    it('has sm, md, lg, and full', () => {
      expect(typeof radii.sm).toBe('number');
      expect(typeof radii.md).toBe('number');
      expect(typeof radii.lg).toBe('number');
      expect(typeof radii.full).toBe('number');
    });
  });
});
