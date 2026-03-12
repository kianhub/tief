import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { format } from 'date-fns';

import { ThemedText } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { CATEGORIES } from '@/constants/categories';
import type { BlogPost } from '@/types';
import { parseTags } from '@/types';

export interface BlogCardProps {
  post: BlogPost;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BlogCard({ post, onPress }: BlogCardProps) {
  const { colors, spacing, springs } = useTheme();
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

  const tags = parseTags(post.tags);
  const dateStr = post.generated_at
    ? format(new Date(post.generated_at), 'MMM d, yyyy')
    : '';
  const tagStr = tags.map((t) => `#${t}`).join(' ');
  const preview = post.content
    ? post.content.replace(/[#*_`>\[\]()-]/g, '').slice(0, 80).trim() + (post.content.length > 80 ? '…' : '')
    : '';

  // Find category color from the conversation's topic (via tags heuristic or default)
  const categoryColor = findCategoryColor(tags) ?? colors.accent;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          borderBottomColor: colors.border,
          paddingVertical: spacing.md,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: categoryColor }]} />
      <View style={styles.content}>
        <ThemedText variant="titleSmall" numberOfLines={2}>
          {post.title}
        </ThemedText>
        <ThemedText variant="caption" color="tertiary" style={styles.meta}>
          {dateStr}{tagStr ? ` · ${tagStr}` : ''}
        </ThemedText>
        {preview ? (
          <ThemedText variant="body" color="secondary" numberOfLines={1} style={styles.preview}>
            {preview}
          </ThemedText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

function findCategoryColor(tags: string[]): string | undefined {
  for (const tag of tags) {
    const cat = CATEGORIES.find((c) => c.id === tag.toLowerCase() || c.label.toLowerCase() === tag.toLowerCase());
    if (cat) return cat.color;
  }
  return undefined;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  meta: {
    marginTop: 4,
  },
  preview: {
    marginTop: 6,
  },
});
