import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';

export interface SyncBannerProps {
  visible: boolean;
  onRetry?: () => void;
}

export function SyncBanner({ visible, onRetry }: SyncBannerProps) {
  const { colors, radii, spacing, springs } = useTheme();

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInUp.springify()
        .damping(springs.gentle.damping)
        .stiffness(springs.gentle.stiffness)
        .mass(springs.gentle.mass)}
      exiting={FadeOutUp.springify()
        .damping(springs.snappy.damping)
        .stiffness(springs.snappy.stiffness)
        .mass(springs.snappy.mass)}
      style={[
        styles.banner,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.sm,
          marginHorizontal: spacing.contentPadding,
          padding: spacing.sm,
        },
      ]}
    >
      <ThemedText variant="caption" color="secondary" style={styles.text}>
        Sync couldn't complete.
      </ThemedText>
      {onRetry && (
        <Pressable onPress={onRetry} hitSlop={8}>
          <ThemedText variant="caption" color="accent">
            Retry
          </ThemedText>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    flex: 1,
  },
});
