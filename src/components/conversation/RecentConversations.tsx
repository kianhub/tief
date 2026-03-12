import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ui';
import { formatDuration, formatRelativeTime } from '@/lib/time-utils';
import type { BlogPostStatus, Conversation } from '@/types';

type ConversationWithBlog = Conversation & { blog_status: BlogPostStatus | null; blog_title: string | null };

export interface RecentConversationsProps {
  conversations: ConversationWithBlog[];
  onPress: (id: string) => void;
}

function BlogStatusBadge({ status }: { status: BlogPostStatus | null }) {
  const { colors } = useTheme();

  if (status === 'ready') {
    return (
      <ThemedText variant="caption" style={{ color: colors.accentSecondary }}>
        Blog ✓
      </ThemedText>
    );
  }
  if (status === 'generating') {
    return <ThemedText variant="caption" color="secondary">⏳</ThemedText>;
  }
  return null;
}

function ModeIcon({ mode }: { mode: string }) {
  return (
    <ThemedText variant="caption" color="secondary">
      {mode === 'voice' ? '🎤' : '💬'}
    </ThemedText>
  );
}

export function RecentConversations({ conversations, onPress }: RecentConversationsProps) {
  const { colors, spacing } = useTheme();

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText variant="body" color="tertiary" style={styles.emptyText}>
          No conversations yet. Start one above!
        </ThemedText>
      </View>
    );
  }

  return (
    <View>
      {conversations.map((convo, index) => {
        const title = convo.blog_title || convo.topic_prompt || 'Untitled Conversation';
        const isLast = index === conversations.length - 1;

        return (
          <Pressable
            key={convo.id}
            onPress={() => onPress(convo.id)}
            style={[
              styles.item,
              {
                paddingVertical: spacing.md,
                borderBottomColor: isLast ? 'transparent' : colors.border,
              },
            ]}
          >
            <View style={styles.itemContent}>
              <View style={styles.titleRow}>
                <ThemedText variant="ui" numberOfLines={1} style={styles.title}>
                  {title}
                </ThemedText>
                <ModeIcon mode={convo.mode} />
              </View>
              <View style={styles.metaRow}>
                <ThemedText variant="caption" color="secondary">
                  {formatRelativeTime(convo.started_at)}
                </ThemedText>
                {convo.duration_seconds !== null && convo.duration_seconds !== undefined && convo.duration_seconds > 0 && (
                  <ThemedText variant="caption" color="secondary">
                    {' · '}{formatDuration(convo.duration_seconds)}
                  </ThemedText>
                )}
                <BlogStatusBadge status={convo.blog_status} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  item: {
    borderBottomWidth: 1,
  },
  itemContent: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
