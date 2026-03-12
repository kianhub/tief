import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';

export interface EndConversationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function EndConversationModal({
  visible,
  onConfirm,
  onCancel,
}: EndConversationModalProps) {
  const { colors, typography, spacing, radii, springs, isDark } = useTheme();

  const translateY = useSharedValue(40);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, springs.gentle);
      scale.value = withSpring(1, springs.gentle);
    } else {
      translateY.value = 40;
      scale.value = 0.95;
    }
  }, [visible]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!visible) return null;

  const overlayColor = isDark
    ? 'rgba(28, 26, 24, 0.8)'
    : 'rgba(44, 40, 37, 0.6)';

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.overlay, { backgroundColor: overlayColor }]}
    >
      <Pressable style={styles.backdropPress} onPress={onCancel} />

      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.lg,
          },
          cardAnimatedStyle,
        ]}
      >
        <Animated.Text
          style={[
            {
              ...typography.title,
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: spacing.sm,
            },
          ]}
        >
          Great conversation.
        </Animated.Text>

        <Animated.Text
          style={[
            {
              ...typography.body,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: spacing.xl,
            },
          ]}
        >
          Your post is being written in the background. We'll let you know when
          it's ready to read.
        </Animated.Text>

        <AnimatedPressable
          onPress={() => {
            haptics.success();
            onConfirm();
          }}
          style={[
            styles.primaryButton,
            {
              backgroundColor: colors.accent,
              borderRadius: radii.sm,
              paddingVertical: spacing.md,
            },
          ]}
        >
          <Animated.Text
            style={[
              {
                ...typography.ui,
                color: '#FFFFFF',
                textAlign: 'center',
              },
            ]}
          >
            Go to Home →
          </Animated.Text>
        </AnimatedPressable>

        <Pressable onPress={onCancel} style={styles.ghostLink}>
          <Animated.Text
            style={[
              {
                ...typography.ui,
                color: colors.textSecondary,
                textAlign: 'center',
              },
            ]}
          >
            Keep talking
          </Animated.Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 340,
  },
  primaryButton: {
    overflow: 'hidden',
  },
  ghostLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
