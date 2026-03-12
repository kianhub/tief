# TIEF-08: Voice Conversation — Skia Orb & Voice UI

> Build the voice orb with @shopify/react-native-skia, audio-reactive animations, and the full voice conversation screen.

## Prerequisites
- TIEF-07 completed (useConversation hook, ElevenLabs helpers)

## Reference
- Product spec §2.0.5 (Voice Orb Design), §4.3 (Voice Conversation Screen), §2.0.4 (Animation)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `@shopify/react-native-skia` for Canvas, Path, LinearGradient, and Skia path generation APIs. Look up `react-native-reanimated` for `useSharedValue`, `useDerivedValue`, `withRepeat`, `withSequence`, `withSpring`, and worklet patterns.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for animation best practices and safe area handling.
- **Skill: `react-native-best-practices:react-native-best-practices`**: Invoke for 60fps animation performance — UI thread vs JS thread, shared values, avoiding re-renders during animation.

---

- [x] **Create the VoiceOrb component at `src/components/conversation/VoiceOrb.tsx` using @shopify/react-native-skia.** This is the centerpiece visual of the app.

The orb should feel organic, blobby, and alive — NOT a perfect circle. Think: a drop of ink in water.

**Implementation approach:**
Use Skia's `Canvas` and `Path` to draw an organic blob shape. Use `react-native-reanimated` shared values to drive the animation.

```typescript
import { Canvas, Path, Skia, LinearGradient, vec } from '@shopify/react-native-skia';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withSequence, withSpring } from 'react-native-reanimated';

interface VoiceOrbProps {
  state: 'idle' | 'listening' | 'speaking' | 'thinking';
  amplitude: number;  // 0-1, from mic or speaker
  size?: number;      // default 200
}
```

**Blob shape generation:**
Create a function that generates a smooth organic blob path from a set of control points. Use 6-8 points arranged in a rough circle, each with a random offset from the base radius. Animate these offsets with reanimated shared values.

```typescript
function generateBlobPath(
  cx: number, cy: number,
  baseRadius: number,
  offsets: number[],  // per-point offset from baseRadius
  numPoints: number = 8
): string {
  // Generate smooth cubic bezier path through the offset points
  // Use catmull-rom to cubic bezier conversion for smoothness
}
```

**States per spec §2.0.5:**

1. **Idle** — Slow, organic breathing:
   - Scale oscillates 0.95 ↔ 1.05 over ~3 second cycle
   - Point offsets slowly drift (withRepeat, withSequence)
   - Color: gradient between textPrimary and accent (theme-aware)
   - Use `breathe` spring config `{ damping: 10, stiffness: 30, mass: 1.5 }`

2. **Listening** — Subtle reactive pulsing from mic amplitude:
   - Base breathing continues
   - Point offsets react to `amplitude` prop (multiply offset by 1 + amplitude * 0.3)
   - Slightly faster animation cycle
   - Size scales slightly with amplitude

3. **Speaking** — More pronounced organic morphing:
   - Point offsets driven more aggressively by amplitude (1 + amplitude * 0.6)
   - Color gradient intensifies slightly (shift toward accent)
   - More dynamic shape changes

4. **Thinking** — Slow rotation + gentle color shift:
   - Shape contracts slightly (scale 0.9)
   - Slow rotation (transform rotate, ~10 seconds per revolution)
   - Color shifts subtly between textPrimary and a muted tone
   - Gentle pulse

**Rendering:**
```tsx
<Canvas style={{ width: size, height: size }}>
  <Path path={animatedPath} style="fill">
    <LinearGradient
      start={vec(0, 0)}
      end={vec(size, size)}
      colors={[gradientStart, gradientEnd]}
    />
  </Path>
</Canvas>
```

Use `useDerivedValue` from reanimated to compute the path string on the UI thread. The path should update smoothly at 60fps.

Make sure all animations are on the UI thread (shared values + worklets). No JS thread animation.

- [x] **Create the voice conversation UI at `src/components/conversation/VoiceConversationView.tsx`.**

Per spec §4.3, this is a full-screen immersive view:

```typescript
interface VoiceConversationViewProps {
  conversationId: string;
  messages: Message[];
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  amplitude: number;
  isMuted: boolean;
  duration: number;
  onToggleMute: () => void;
  onSwitchToText: () => void;
  onEnd: () => void;
}
```

**Layout (full screen, minimal chrome):**

1. **Top bar** — Absolute positioned, transparent background:
   - Left: "✕" close button (navigates back with confirmation)
   - Right: "⋮" menu button (placeholder for v1)
   - Both in `textSecondary` color

2. **Center** — VoiceOrb component, large (width * 0.5, centered):
   - State derived from: `isAISpeaking ? 'speaking' : isUserSpeaking ? 'listening' : 'idle'`
   - Amplitude passed through

3. **Live transcript** — Below the orb, in a ScrollView:
   - Shows the last 2-3 exchanges
   - Current speaker's text appears in real-time (streaming)
   - Text in `chat` typography, `textSecondary` color
   - Italicized when it's the AI speaking
   - Auto-scrolls to bottom
   - Max height: 40% of screen

4. **Bottom controls** — Fixed at bottom with safe area padding:
   - Center: Large mic button (56px circle)
     - Active (unmuted): filled with textPrimary, white mic icon
     - Muted: outlined, with line through mic icon
     - Tap triggers `onToggleMute` + haptic `selectionAsync()`
   - Left: "Switch to Text 💬" button (ghost style)
   - Right: "End" button in accent/terracotta color
   - All buttons have press scale animation (snappy spring)

5. **Duration indicator** — Small, top-center below status bar:
   - "12:34" format in `caption` `textTertiary`
   - Updates every second

Use reanimated for all animations. Use `useSafeAreaInsets()` for safe area handling.

- [x] **Create audio-reactive animation bridge.** The VoiceOrb needs real-time audio amplitude data. Create `src/hooks/useAudioAmplitude.ts`:

This hook bridges the ElevenLabs SDK audio events to a reanimated shared value:

```typescript
interface UseAudioAmplitudeReturn {
  amplitude: SharedValue<number>;       // 0-1, smoothed
  isUserSpeaking: boolean;
  isAISpeaking: boolean;
}
```

**Implementation:**
- When the ElevenLabs conversation is in `listening` mode (user speaking), derive amplitude from the SDK's volume/mode events
- When in `speaking` mode (AI speaking), derive from audio output events
- Smooth the amplitude value with a simple exponential moving average to prevent jitter:
  ```typescript
  smoothed = smoothed * 0.7 + raw * 0.3;
  ```
- Use `useSharedValue` and `runOnJS` to bridge from ElevenLabs callbacks to reanimated shared values
- Default to 0 when no audio activity

Also create a simple fallback: if ElevenLabs SDK doesn't provide amplitude data directly, use the `onModeChange` callback to at least toggle between states (idle/listening/speaking). In that case, simulate amplitude with a gentle sine wave while in active states.

Verify the orb renders and animates in idle state. The voice integration can be verified once ElevenLabs is configured (per useractions). `npx tsc --noEmit` should pass.

---

**Completed 2026-03-12.** All three tasks implemented: VoiceOrb with 8-point catmull-rom blob, 4 animation states, and Skia gradient; VoiceConversationView with full-screen layout, transcript, and haptic controls; useAudioAmplitude with EMA smoothing and sine wave fallback. `npx tsc --noEmit` passes clean.
