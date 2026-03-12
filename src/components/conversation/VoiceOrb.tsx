import { useEffect } from 'react';
import {
  Canvas,
  Path,
  LinearGradient,
  vec,
  interpolateColors,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';

const NUM_POINTS = 8;
const MAX_OFFSET_RATIO = 0.15;

// Per-point seed offsets for organic asymmetry
const SEED_OFFSETS = [0.7, -0.4, 0.9, -0.6, 0.5, -0.8, 0.3, -0.5];

export type OrbState = 'idle' | 'listening' | 'speaking' | 'thinking';

export interface VoiceOrbProps {
  state: OrbState;
  amplitude: number; // 0-1, from mic or speaker
  size?: number; // default 200
}

/**
 * Generates a smooth closed blob path using catmull-rom to cubic bezier
 * conversion. Runs on the UI thread as a worklet.
 */
function generateBlobPath(
  cx: number,
  cy: number,
  baseRadius: number,
  offsets: number[],
  numPoints: number,
): string {
  'worklet';

  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const r = baseRadius + offsets[i];
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }

  // Build smooth cubic bezier curve through points (catmull-rom conversion)
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < numPoints; i++) {
    const p0 = points[(i - 1 + numPoints) % numPoints];
    const p1 = points[i];
    const p2 = points[(i + 1) % numPoints];
    const p3 = points[(i + 2) % numPoints];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  d += ' Z';
  return d;
}

export function VoiceOrb({ state, amplitude, size = 200 }: VoiceOrbProps) {
  const { colors: themeColors } = useTheme();

  const cx = size / 2;
  const cy = size / 2;
  const baseRadius = size * 0.35;
  const maxOffset = baseRadius * MAX_OFFSET_RATIO;

  // --- Per-point offset shared values (8 points) ---
  const o0 = useSharedValue(SEED_OFFSETS[0] * maxOffset);
  const o1 = useSharedValue(SEED_OFFSETS[1] * maxOffset);
  const o2 = useSharedValue(SEED_OFFSETS[2] * maxOffset);
  const o3 = useSharedValue(SEED_OFFSETS[3] * maxOffset);
  const o4 = useSharedValue(SEED_OFFSETS[4] * maxOffset);
  const o5 = useSharedValue(SEED_OFFSETS[5] * maxOffset);
  const o6 = useSharedValue(SEED_OFFSETS[6] * maxOffset);
  const o7 = useSharedValue(SEED_OFFSETS[7] * maxOffset);

  // --- Transform shared values ---
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  // --- Amplitude (synced from JS prop to shared value) ---
  const amp = useSharedValue(0);
  const ampMultiplier = useSharedValue(0);

  // --- Color transition progress (0 = base, 0.5 = muted, 1 = intense) ---
  const colorProgress = useSharedValue(0);

  // Sync amplitude prop to shared value
  useEffect(() => {
    amp.value = amplitude;
  }, [amplitude, amp]);

  // --- State-driven animations ---
  useEffect(() => {
    const allOffsets = [o0, o1, o2, o3, o4, o5, o6, o7];

    // Cancel running animations
    allOffsets.forEach((o) => cancelAnimation(o));
    cancelAnimation(scale);
    cancelAnimation(rotation);

    const breathe = { damping: 10, stiffness: 30, mass: 1.5 };

    switch (state) {
      case 'idle':
        ampMultiplier.value = 0;
        colorProgress.value = withSpring(0, breathe);
        allOffsets.forEach((o, i) => {
          o.value = withRepeat(
            withSequence(
              withSpring(SEED_OFFSETS[i] * maxOffset, breathe),
              withSpring(-SEED_OFFSETS[i] * maxOffset * 0.7, breathe),
            ),
            -1,
          );
        });
        scale.value = withRepeat(
          withSequence(
            withSpring(1.05, breathe),
            withSpring(0.95, breathe),
          ),
          -1,
        );
        rotation.value = withSpring(0, breathe);
        break;

      case 'listening':
        ampMultiplier.value = 0.3;
        colorProgress.value = withSpring(0, breathe);
        allOffsets.forEach((o, i) => {
          const faster = { ...breathe, stiffness: 50 };
          o.value = withRepeat(
            withSequence(
              withSpring(SEED_OFFSETS[i] * maxOffset * 1.1, faster),
              withSpring(-SEED_OFFSETS[i] * maxOffset * 0.8, faster),
            ),
            -1,
          );
        });
        scale.value = withSpring(1, breathe);
        rotation.value = withSpring(0, breathe);
        break;

      case 'speaking':
        ampMultiplier.value = 0.6;
        colorProgress.value = withSpring(1, breathe);
        allOffsets.forEach((o, i) => {
          const dynamic = { damping: 8, stiffness: 60, mass: 1.2 };
          o.value = withRepeat(
            withSequence(
              withSpring(SEED_OFFSETS[i] * maxOffset * 1.3, dynamic),
              withSpring(-SEED_OFFSETS[i] * maxOffset, dynamic),
            ),
            -1,
          );
        });
        scale.value = withSpring(1, breathe);
        rotation.value = withSpring(0, breathe);
        break;

      case 'thinking':
        ampMultiplier.value = 0;
        colorProgress.value = withSpring(0.5, breathe);
        allOffsets.forEach((o, i) => {
          o.value = withRepeat(
            withSequence(
              withSpring(SEED_OFFSETS[i] * maxOffset * 0.4, breathe),
              withSpring(-SEED_OFFSETS[i] * maxOffset * 0.3, breathe),
            ),
            -1,
          );
        });
        scale.value = withSpring(0.9, breathe);
        rotation.value = withRepeat(
          withTiming(Math.PI * 2, {
            duration: 10000,
            easing: Easing.linear,
          }),
          -1,
        );
        break;
    }
  }, [
    state, maxOffset,
    o0, o1, o2, o3, o4, o5, o6, o7,
    scale, rotation, ampMultiplier, colorProgress,
  ]);

  // --- Derived blob path (runs on UI thread) ---
  const blobPath = useDerivedValue(() => {
    const ampValue = amp.value;
    const ampMult = ampMultiplier.value;
    const scaleValue = scale.value;

    const offsets = [
      o0.value * (1 + ampValue * ampMult),
      o1.value * (1 + ampValue * ampMult),
      o2.value * (1 + ampValue * ampMult),
      o3.value * (1 + ampValue * ampMult),
      o4.value * (1 + ampValue * ampMult),
      o5.value * (1 + ampValue * ampMult),
      o6.value * (1 + ampValue * ampMult),
      o7.value * (1 + ampValue * ampMult),
    ];

    return generateBlobPath(cx, cy, baseRadius * scaleValue, offsets, NUM_POINTS);
  });

  // --- Gradient colors (animated between states) ---
  const textPrimary = themeColors.textPrimary;
  const accent = themeColors.accent;
  const accentSecondary = themeColors.accentSecondary;
  const textSecondary = themeColors.textSecondary;

  const gradientColors = useDerivedValue(() => {
    const progress = colorProgress.value;
    return [
      interpolateColors(
        progress,
        [0, 0.5, 1],
        [textPrimary, textPrimary, accent],
      ),
      interpolateColors(
        progress,
        [0, 0.5, 1],
        [accent, textSecondary, accentSecondary],
      ),
    ];
  });

  // --- Rotation wrapper (Animated.View) ---
  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}rad` }],
    width: size,
    height: size,
  }));

  return (
    <Animated.View style={rotationStyle}>
      <Canvas style={{ width: size, height: size }}>
        <Path path={blobPath} style="fill">
          <LinearGradient
            start={vec(0, 0)}
            end={vec(size, size)}
            colors={gradientColors}
          />
        </Path>
      </Canvas>
    </Animated.View>
  );
}
