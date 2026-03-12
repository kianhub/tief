import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ThemedText, ThemedView, Button, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useDatabase } from '@/lib/db-context';
import {
  getBlogPost,
  getConversation,
  getMessagesByConversation,
} from '@/lib/db-helpers';
import { SERIF_FONT, SANS_FONT } from '@/constants/theme';
import { parseTags } from '@/types';
import { slugify } from '@/lib/text-utils';
import type { BlogPost, Conversation, Message } from '@/types';

export default function PostViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { colors, typography, spacing, radii } = useTheme();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Generating animation
  const pulseOpacity = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

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
      setNotFound(false);

      const convo = getConversation(db, blogPost.conversation_id);
      setConversation(convo);

      if (blogPost.status === 'generating') {
        pulseOpacity.value = withRepeat(
          withTiming(0.4, { duration: 1200 }),
          -1,
          true
        );
      }
    }, [id, db])
  );

  const tags = post ? parseTags(post.tags) : [];

  const formattedDate = post?.generated_at
    ? new Date(post.generated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const readingTime = post
    ? Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))
    : 0;

  const handleBack = () => router.back();

  const handleEdit = () => {
    if (id) router.push(`/post/${id}/edit`);
  };

  const handleShare = async () => {
    if (!post) return;

    const postTags = parseTags(post.tags);
    const date = post.generated_at
      ? new Date(post.generated_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    const markdownContent = [
      `# ${post.title}`,
      '',
      `*${date} · tief.*`,
      postTags.length > 0 ? `*Tags: ${postTags.join(', ')}*` : '',
      '',
      '---',
      '',
      post.content,
    ]
      .filter((line) => line !== undefined)
      .join('\n');

    const file = new File(Paths.cache, `${slugify(post.title)}.md`);
    file.write(markdownContent);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/markdown',
      dialogTitle: 'Share your post',
    });
  };

  const handleViewTranscript = () => {
    if (post) {
      const msgs = getMessagesByConversation(db, post.conversation_id);
      setMessages(msgs);
    }
    setShowTranscript(true);
  };

  const markdownStyles = {
    body: {
      color: colors.textPrimary,
      fontFamily: SERIF_FONT,
      fontSize: 17,
      lineHeight: 17 * 1.6,
    },
    paragraph: {
      marginBottom: 24,
    },
    heading2: {
      fontFamily: SERIF_FONT,
      fontSize: 22,
      fontWeight: '400' as const,
      color: colors.textPrimary,
      marginTop: 32,
      marginBottom: 12,
    },
    heading3: {
      fontFamily: SERIF_FONT,
      fontSize: 19,
      fontWeight: '400' as const,
      color: colors.textPrimary,
      marginTop: 32,
      marginBottom: 8,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      paddingLeft: 24,
      marginVertical: 16,
    },
    // Style for text inside blockquotes — react-native-markdown-display
    // doesn't have a dedicated "blockquote text" key; we use the paragraph
    // inside blockquote via custom rules instead. But we can at least
    // style the container.
    strong: {
      fontWeight: '700' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
    link: {
      color: colors.accent,
      textDecorationLine: 'underline' as const,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: 24,
    },
    bullet_list: {
      marginBottom: 16,
    },
    ordered_list: {
      marginBottom: 16,
    },
    list_item: {
      marginBottom: 8,
    },
    code_inline: {
      fontFamily: 'Menlo',
      fontSize: 15,
      backgroundColor: colors.surface,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    code_block: {
      fontFamily: 'Menlo',
      fontSize: 14,
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: radii.sm,
      marginBottom: 16,
    },
    fence: {
      fontFamily: 'Menlo',
      fontSize: 14,
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: radii.sm,
      marginBottom: 16,
    },
  };

  // --- Error state ---
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
          <ThemedText
            variant="body"
            color="secondary"
            style={{ marginTop: spacing.sm }}
          >
            This post may have been removed or hasn't been created yet.
          </ThemedText>
          <Button
            label="← Go Back"
            variant="secondary"
            onPress={handleBack}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </ThemedView>
    );
  }

  // --- Generating state ---
  if (post?.status === 'generating') {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <ThemedText variant="uiSmall" color="secondary">
              ← Back
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Animated.View style={pulseStyle}>
            <ThemedText
              variant="title"
              style={{ textAlign: 'center' }}
            >
              Your post is still being written...
            </ThemedText>
            <ThemedText
              variant="body"
              color="secondary"
              style={{
                textAlign: 'center',
                marginTop: spacing.md,
                paddingHorizontal: spacing.xl,
              }}
            >
              We're turning your conversation into something beautiful.
              Check back in a moment.
            </ThemedText>
          </Animated.View>
        </View>
      </ThemedView>
    );
  }

  // --- Loading state (no post yet but not not-found) ---
  if (!post) {
    return (
      <ThemedView style={styles.container}>
        <View style={{ flex: 1 }} />
      </ThemedView>
    );
  }

  // --- Main blog post view ---
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <ThemedText variant="uiSmall" color="secondary">
              ← Back
            </ThemedText>
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable onPress={handleEdit} hitSlop={8}>
              <ThemedText variant="uiSmall" color="secondary">
                Edit
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleShare}
              hitSlop={8}
              style={{ marginLeft: spacing.md }}
            >
              <ThemedText variant="uiSmall" color="secondary">
                Share
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Title section */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[styles.titleSection, { maxWidth: 640, alignSelf: 'center', width: '100%' }]}
        >
          <ThemedText variant="display" style={styles.postTitle}>
            {post.title}
          </ThemedText>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.border, marginTop: spacing.md },
            ]}
          />

          <ThemedText
            variant="caption"
            color="tertiary"
            style={{ marginTop: spacing.md }}
          >
            {formattedDate}
            {readingTime > 0 ? ` · ${readingTime} min read` : ''}
          </ThemedText>

          {tags.length > 0 && (
            <ThemedText
              variant="caption"
              color="accent"
              style={{ marginTop: spacing.xs }}
            >
              {tags.map((t) => `#${t}`).join(' ')}
            </ThemedText>
          )}
        </Animated.View>

        {/* Body content */}
        <View
          style={[
            styles.bodyContent,
            {
              maxWidth: 640,
              alignSelf: 'center',
              width: '100%',
              paddingHorizontal: spacing.contentPadding,
            },
          ]}
        >
          <Markdown style={markdownStyles}>{post.content}</Markdown>
        </View>

        {/* Footer section */}
        <View
          style={[
            styles.footer,
            {
              maxWidth: 640,
              alignSelf: 'center',
              width: '100%',
              paddingHorizontal: spacing.contentPadding,
            },
          ]}
        >
          <ThemedText
            variant="uiSmall"
            color="secondary"
            style={styles.footerHeader}
          >
            From this conversation
          </ThemedText>

          <Card onPress={handleViewTranscript}>
            <ThemedText variant="body">
              📄 View full transcript
            </ThemedText>
          </Card>

          <Card
            onPress={handleShare}
            style={{ marginTop: spacing.cardSpacing }}
          >
            <ThemedText variant="body">
              📤 Export as Markdown
            </ThemedText>
          </Card>
        </View>
      </ScrollView>

      {/* Transcript Modal */}
      <Modal
        visible={showTranscript}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTranscript(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: spacing.lg,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <ThemedText variant="titleSmall">Transcript</ThemedText>
            <Pressable
              onPress={() => setShowTranscript(false)}
              hitSlop={12}
            >
              <ThemedText variant="uiSmall" color="secondary">
                ✕ Close
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.transcriptContent,
              { paddingBottom: insets.bottom + spacing.xxl },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <ThemedText
                variant="body"
                color="secondary"
                style={{ textAlign: 'center', marginTop: spacing.xxl }}
              >
                No messages found for this conversation.
              </ThemedText>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.transcriptMessage,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <ThemedText variant="uiSmall" color="accent">
                    {msg.role === 'user' ? 'You:' : 'tief.:'}
                  </ThemedText>
                  <ThemedText
                    variant="body"
                    style={{ marginTop: spacing.xs }}
                  >
                    {msg.content}
                  </ThemedText>
                  <ThemedText
                    variant="caption"
                    color="tertiary"
                    style={{ marginTop: spacing.xs }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleSection: {
    marginTop: 48,
  },
  postTitle: {
    lineHeight: 38,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  bodyContent: {
    marginTop: 32,
  },
  footer: {
    marginTop: 48,
  },
  footerHeader: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  transcriptContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  transcriptMessage: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
