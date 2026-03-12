import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText, ThemedView, TextInput } from '@/components/ui';
import { PromptCard } from '@/components/conversation/PromptCard';
import { RecentConversations } from '@/components/conversation/RecentConversations';
import { useAuth } from '@/lib/auth-context';
import { useDatabase } from '@/lib/db-context';
import { getConversationsWithBlogStatus, getPreference } from '@/lib/db-helpers';
import { getGreeting } from '@/lib/time-utils';
import {
  startFromPrompt,
  startFromCustomTopic,
  resumeConversation,
} from '@/lib/conversation-starter';
import { spacing } from '@/constants/theme';
import type { BlogPostStatus, Conversation, TopicCategory } from '@/types';

const DEFAULT_PROMPT = 'What does it mean to live a meaningful life?';

type ConversationWithBlog = Conversation & { blog_status: BlogPostStatus | null; blog_title: string | null };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const db = useDatabase();

  const [conversations, setConversations] = useState<ConversationWithBlog[]>([]);
  const [featuredPrompt, setFeaturedPrompt] = useState(DEFAULT_PROMPT);
  const [featuredCategory, setFeaturedCategory] = useState<TopicCategory | undefined>(undefined);
  const [topicInput, setTopicInput] = useState('');

  // Greeting animation
  const greetingOpacity = useSharedValue(0);
  const greetingTranslateY = useSharedValue(12);

  useEffect(() => {
    greetingOpacity.value = withSpring(1, { damping: 20, stiffness: 80, mass: 1.2 });
    greetingTranslateY.value = withSpring(0, { damping: 20, stiffness: 80, mass: 1.2 });
  }, [greetingOpacity, greetingTranslateY]);

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingTranslateY.value }],
  }));

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const recent = getConversationsWithBlogStatus(db, 5);
      setConversations(recent);

      const savedPrompt = getPreference(db, 'featured_prompt');
      if (savedPrompt) {
        setFeaturedPrompt(savedPrompt);
      }

      const savedCategory = getPreference(db, 'featured_prompt_category');
      if (savedCategory) {
        setFeaturedCategory(savedCategory as TopicCategory);
      }
    }, [db])
  );

  const displayName = profile?.display_name || 'there';
  const greeting = `${getGreeting()}, ${displayName}.`;

  const handleVoice = () => {
    startFromPrompt(featuredPrompt, featuredCategory ?? 'random', 'voice');
  };

  const handleText = () => {
    startFromPrompt(featuredPrompt, featuredCategory ?? 'random', 'text');
  };

  const handleTopicSubmit = () => {
    const trimmed = topicInput.trim();
    if (trimmed) {
      startFromCustomTopic(trimmed, 'text');
      setTopicInput('');
    }
  };

  const handleConversationPress = (id: string) => {
    const convo = conversations.find((c) => c.id === id);
    if (convo?.blog_status === 'ready') {
      router.push(`/post/${id}`);
    } else {
      resumeConversation(id);
    }
  };

  const hasMore = conversations.length >= 5;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 64, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Animated.View style={greetingStyle}>
          <ThemedText variant="title">{greeting}</ThemedText>
        </Animated.View>

        {/* Featured Prompt Card */}
        <View style={styles.cardSection}>
          <PromptCard
            prompt={featuredPrompt}
            category={featuredCategory}
            onVoice={handleVoice}
            onText={handleText}
          />
        </View>

        {/* Free-form Input */}
        <View style={styles.inputSection}>
          <ThemedText variant="caption" color="secondary" style={styles.inputLabel}>
            or start with your own topic...
          </ThemedText>
          <TextInput
            placeholder="What's on your mind?"
            value={topicInput}
            onChangeText={setTopicInput}
            onSubmitEditing={handleTopicSubmit}
            returnKeyType="go"
          />
        </View>

        {/* Recent Conversations */}
        <View style={styles.recentSection}>
          <View style={[styles.divider, { backgroundColor: 'transparent' }]} />
          <ThemedText variant="uiSmall" color="secondary" style={styles.sectionHeader}>
            Recent Conversations
          </ThemedText>
          <RecentConversations
            conversations={conversations}
            onPress={handleConversationPress}
          />
          {hasMore && (
            <View style={styles.seeAllRow}>
              <ThemedText
                variant="uiSmall"
                color="accent"
                onPress={() => router.push('/(tabs)/library')}
              >
                See all →
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.contentPadding,
  },
  cardSection: {
    marginTop: spacing.xl,
  },
  inputSection: {
    marginTop: spacing.lg,
  },
  inputLabel: {
    marginBottom: spacing.sm,
  },
  recentSection: {
    marginTop: spacing.sectionSpacing,
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seeAllRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
