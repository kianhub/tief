import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText, ThemedView, Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useDatabase } from '@/lib/db-context';
import { getBlogPost, updateBlogPost } from '@/lib/db-helpers';
import { SERIF_FONT } from '@/constants/theme';
import { parseTags, stringifyTags } from '@/types';
import type { BlogPost } from '@/types';

export default function PostEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { colors, typography, spacing, radii } = useTheme();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [notFound, setNotFound] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setNotFound(true);
        return;
      }

      const blogPost = getBlogPost(db, id);
      if (!blogPost) {
        setNotFound(true);
        return;
      }

      setPost(blogPost);
      setTitle(blogPost.title);
      setContent(blogPost.content);
      setTagsText(parseTags(blogPost.tags).join(', '));
      setNotFound(false);
    }, [id, db])
  );

  const handleCancel = () => router.back();

  const handleSave = async () => {
    if (!id || !post) return;

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    updateBlogPost(db, id, {
      title,
      content,
      tags: stringifyTags(tags),
      edited_at: new Date().toISOString(),
      status: 'edited',
      synced_at: null,
    });

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (notFound) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.centered,
            { paddingTop: insets.top + spacing.xxl },
          ]}
        >
          <ThemedText variant="title">Post not found</ThemedText>
          <Button
            label="← Go Back"
            variant="secondary"
            onPress={handleCancel}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </ThemedView>
    );
  }

  if (!post) {
    return (
      <ThemedView style={styles.container}>
        <View style={{ flex: 1 }} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + spacing.md,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable onPress={handleCancel} hitSlop={12}>
            <ThemedText variant="uiSmall" color="secondary">
              ← Cancel
            </ThemedText>
          </Pressable>
          <Button label="Save" size="sm" onPress={handleSave} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title input */}
          <RNTextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Post title"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[
              styles.titleInput,
              {
                fontFamily: SERIF_FONT,
                color: colors.textPrimary,
              },
            ]}
          />

          {/* Content input */}
          <RNTextInput
            value={content}
            onChangeText={setContent}
            placeholder="Write your post in markdown..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            style={[
              styles.contentInput,
              {
                fontFamily: SERIF_FONT,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderRadius: radii.sm,
              },
            ]}
          />

          {/* Tags input */}
          <View style={{ marginTop: spacing.lg }}>
            <ThemedText
              variant="caption"
              color="secondary"
              style={{ marginBottom: spacing.xs }}
            >
              Tags (comma-separated)
            </ThemedText>
            <RNTextInput
              value={tagsText}
              onChangeText={setTagsText}
              placeholder="creativity, philosophy, art"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.tagsInput,
                {
                  fontFamily: typography.chat.fontFamily,
                  color: colors.textPrimary,
                  backgroundColor: colors.surface,
                  borderRadius: radii.sm,
                },
              ]}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 34,
    paddingVertical: 0,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
    padding: 16,
    minHeight: 300,
  },
  tagsInput: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
});
