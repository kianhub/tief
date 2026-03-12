import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ui';
import { Chip } from '@/components/ui';
import { Button } from '@/components/ui';
import { CATEGORIES } from '@/constants/categories';
import type { TopicCategory } from '@/types';

export interface PromptCardProps {
  prompt: string;
  category?: TopicCategory;
  onVoice: () => void;
  onText: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PromptCard({ prompt, category, onVoice, onText }: PromptCardProps) {
  const { colors, radii, spacing, springs } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springs.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springs.snappy);
  };

  const categoryInfo = category
    ? CATEGORIES.find((c) => c.id === category)
    : undefined;

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.md,
          padding: spacing.cardPadding,
        },
        animatedStyle,
      ]}
    >
      {categoryInfo && (
        <View style={styles.chipRow}>
          <Chip
            label={categoryInfo.label}
            selected
            color={categoryInfo.color}
            onPress={() => {}}
          />
        </View>
      )}

      <View style={styles.promptContainer}>
        <ThemedText variant="body" style={styles.promptText}>
          {prompt}
        </ThemedText>
      </View>

      <View style={styles.buttonRow}>
        <Button
          variant="primary"
          label="🎤 Let's Talk"
          onPress={onVoice}
          style={styles.button}
        />
        <Button
          variant="secondary"
          label="💬 Text"
          onPress={onText}
          style={styles.button}
        />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  promptContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  promptText: {
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});
