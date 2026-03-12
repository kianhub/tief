# TIEF-02: Design System — Tokens, Theme & UI Components

> Create the complete design system: color palette, typography scale, spacing tokens, animation configs, category/voice constants, theme hook, and all base UI primitives.

## Prerequisites
- TIEF-01 completed (project scaffolded, dependencies installed)

## Reference
- Product spec §2.0.1 (Typography), §2.0.2 (Colors), §2.0.3 (Spacing), §2.0.4 (Animations)
- Product spec §15 (Voice selection)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `react-native-reanimated` for spring animation APIs (`withSpring`, `useAnimatedStyle`). Look up `react-native` for `useColorScheme` and `StyleSheet.create` patterns.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for Expo styling best practices, component patterns, theming, and responsive layout guidance.
- **Skill: `react-native-best-practices:react-native-best-practices`**: Reference for performance-conscious component design (memoization, style objects).

---

- [x] **Create theme constants in `src/constants/theme.ts`.** This is the single source of truth for the entire design system. Include:

**Colors** — Two complete palettes, `light` and `dark`, per spec §2.0.2:
```
LIGHT: background #FAF8F5, surface #F3F0EB, textPrimary #2C2825, textSecondary #8A8580,
       textTertiary #B5B0AB, accent #C4785B, accentSecondary #5B7F6B, border #E8E4DF
DARK:  background #1C1A18, surface #262320, textPrimary #E8E4DF, textSecondary #8A8580,
       textTertiary #5C5854, accent #D4896B, accentSecondary #6B9F7B, border #333028
```

**Typography** — Define a scale object with font families and sizes:
- `display`: serif font, 32px, weight 400, letterSpacing -0.02em, lineHeight 1.2
- `title`: serif font, 24px, weight 400, letterSpacing -0.02em, lineHeight 1.3
- `titleSmall`: serif font, 20px, weight 400, lineHeight 1.3
- `body`: serif font, 17px, weight 400, lineHeight 1.6 (for blog reading)
- `bodyLarge`: serif font, 18px, weight 400, lineHeight 1.6
- `ui`: sans-serif font, 16px, weight 500, lineHeight 1.4
- `uiSmall`: sans-serif font, 14px, weight 500, lineHeight 1.4
- `caption`: sans-serif font, 12px, weight 400, lineHeight 1.4
- `chat`: sans-serif font, 16px, weight 400, lineHeight 1.5

For font families, use `'InstrumentSerif-Regular'` for serif (with fallback to system serif) and `'Satoshi-Medium'`/`'Satoshi-Regular'` for sans (with fallback to system sans). Since custom fonts require loading, also export constants `SERIF_FONT` and `SANS_FONT` that can be swapped to system fonts if custom fonts aren't loaded yet. For MVP, use `Platform.select({ ios: 'Georgia', default: 'serif' })` for serif and `Platform.select({ ios: 'System', default: 'sans-serif' })` for sans until custom fonts are added.

**Spacing** — Base unit 4px. Export: `xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48`. Also export `contentPadding: 24`, `cardPadding: 20`, `sectionSpacing: 48`, `cardSpacing: 16`.

**Border Radii** — `sm: 8` (buttons), `md: 12` (cards), `lg: 20` (sheets), `full: 9999` (pills).

**Springs** (react-native-reanimated withSpring configs) per spec §2.0.4:
```
snappy:  { damping: 20, stiffness: 300, mass: 0.8 }
default: { damping: 15, stiffness: 150, mass: 1.0 }
gentle:  { damping: 20, stiffness: 80, mass: 1.2 }
breathe: { damping: 10, stiffness: 30, mass: 1.5 }
```

**Max content width**: `640`

Export everything as typed constants. Use `as const` for type safety.

- [x] **Create category constants in `src/constants/categories.ts` and voice constants in `src/constants/voices.ts`.**

**categories.ts** — Array of 10 topic categories per spec §2.0.2, plus a "Random" option:
```typescript
export type TopicCategory = 'philosophy' | 'science' | 'relationships' | 'creativity' | 'psychology' | 'culture' | 'career' | 'nature' | 'history' | 'spirituality' | 'random';

export interface Category {
  id: TopicCategory;
  label: string;
  color: string; // muted color per spec
}
```
Colors: philosophy #7B6FA0, science #5B8FA8, relationships #C4785B, creativity #B88A4A, psychology #6B9F7B, culture #A0705B, career #5C7B8A, nature #6B8F5B, history #8A7560, spirituality #8B7BA0. Random uses the accent color.

**voices.ts** — Array of 10 curated voices per spec §15:
```typescript
export interface Voice {
  id: string;           // ElevenLabs voice_id (placeholder for now)
  label: string;        // User-facing label
  gender: 'female' | 'male';
  energy: string;       // e.g. "Medium", "Low-Med"
  description: string;  // Brief description
}
```
Use placeholder voice IDs like `'voice_placeholder_1'` through `'voice_placeholder_10'` — the user will fill these in from `/useractions/02-elevenlabs-setup.md`. Include all 10 voices from spec §15 with their labels: "Warm & Thoughtful", "Calm & Curious", "Energetic & Friendly", "Gentle & Reflective", "Grounded & Direct", "Playful & Witty", "Soft & Intimate", "Steady & Reassuring", "Bright & Engaging", "Deep & Considered".

Also export `VOICE_SETTINGS`:
```typescript
export const VOICE_SETTINGS = {
  stability: 0.4,
  similarity_boost: 0.75,
  style: 0.2,
  use_speaker_boost: true,
} as const;
```

- [x] **Create `useTheme` hook in `src/hooks/useTheme.tsx`.** Implement a ThemeProvider + useTheme hook:

1. Create a `ThemeContext` with React Context
2. `ThemeProvider` component that:
   - Uses `useColorScheme()` from `react-native` to detect system preference
   - Allows manual override (stored in expo-sqlite preferences later, for now just state)
   - Provides the current color palette (light or dark), typography, spacing, springs, and radii
   - Provides a `toggleTheme` function and `isDark` boolean
3. `useTheme()` hook returns `{ colors, typography, spacing, springs, radii, isDark, toggleTheme, maxContentWidth }`
4. All values come from `src/constants/theme.ts`

The hook should be typed with a `Theme` interface that includes all sub-objects. Export both the provider and hook.

- [ ] **Create base UI primitives in `src/components/ui/`.** Create the following components, all using the `useTheme` hook for styling. Each component should be its own file. Create an `index.ts` barrel export.

**`ThemedText.tsx`** — A Text component that applies theme typography:
- Props: `variant` (one of the typography scale keys: 'display', 'title', 'titleSmall', 'body', 'bodyLarge', 'ui', 'uiSmall', 'caption', 'chat'), `color` ('primary' | 'secondary' | 'tertiary' | 'accent'), plus all standard `TextProps`
- Applies the correct font family, size, lineHeight, letterSpacing, and color from theme
- Default variant: 'ui', default color: 'primary'

**`ThemedView.tsx`** — A View with theme background:
- Props: `variant` ('background' | 'surface'), plus all `ViewProps`
- Applies the correct background color from theme

**`Button.tsx`** — Pressable button with spring animation:
- Props: `variant` ('primary' | 'secondary' | 'ghost'), `size` ('sm' | 'md' | 'lg'), `label: string`, `onPress`, `disabled`, `loading`
- Primary: accent background, white text. Secondary: surface background, primary text, border. Ghost: transparent, primary text.
- Use `Animated.View` with `useAnimatedStyle` for press scale animation (scale 0.97 on press, spring back with `snappy` config)
- Sizes: sm = 36px height, md = 44px height, lg = 52px height
- Border radius: `radii.sm` (8px)
- Text uses sans-serif font

**`Card.tsx`** — Surface card:
- Props: `children`, `onPress?`, `style?`
- Surface background color, `radii.md` (12px) border radius, `cardPadding` (20px) padding
- Optional press animation when `onPress` provided (same scale spring as Button)
- Subtle border with theme border color

**`TextInput.tsx`** — Themed text input:
- Props: extends RN `TextInputProps`, adds `label?: string`
- Surface background, primary text color, secondary placeholder color
- Border radius `radii.sm`, padding 12px horizontal, 14px vertical
- Uses sans-serif font, 16px
- Optional label above using `caption` variant in secondary color

**`Chip.tsx`** — Small pill for category filters:
- Props: `label: string`, `selected: boolean`, `onPress`, `color?: string`
- When selected: filled with the provided color (or accent), white text
- When not selected: transparent bg, border, primary text
- Border radius `radii.full` (pill shape)
- Height 32px, horizontal padding 16px
- Sans-serif `uiSmall` text

**`index.ts`** — Barrel export all components.

Each component should use `StyleSheet.create` for styles. All should accept a `style` prop for override. Verify no TypeScript errors with `npx tsc --noEmit`.
