import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { isThisWeek, isThisMonth, subWeeks, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';

import { ThemedText, ThemedView, Chip, EmptyState, SyncBanner } from '@/components/ui';
import { BlogCard } from '@/components/blog/BlogCard';
import { useTheme } from '@/hooks/useTheme';
import { useSync } from '@/hooks/useSync';
import { useDatabase } from '@/lib/db-context';
import { getAllBlogPosts, searchBlogPosts } from '@/lib/db-helpers';
import { CATEGORIES } from '@/constants/categories';
import { spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { BlogPost, TopicCategory } from '@/types';

type SectionData = {
  title: string;
  data: BlogPost[];
};

function isLastWeek(date: Date): boolean {
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1));
  const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1));
  return isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd });
}

function groupByTimePeriod(posts: BlogPost[]): SectionData[] {
  const thisWeek: BlogPost[] = [];
  const lastWeek: BlogPost[] = [];
  const thisMonth: BlogPost[] = [];
  const older: BlogPost[] = [];

  for (const post of posts) {
    const date = new Date(post.generated_at ?? post.edited_at ?? '');
    if (isThisWeek(date)) {
      thisWeek.push(post);
    } else if (isLastWeek(date)) {
      lastWeek.push(post);
    } else if (isThisMonth(date)) {
      thisMonth.push(post);
    } else {
      older.push(post);
    }
  }

  const sections: SectionData[] = [];
  if (thisWeek.length > 0) sections.push({ title: 'This Week', data: thisWeek });
  if (lastWeek.length > 0) sections.push({ title: 'Last Week', data: lastWeek });
  if (thisMonth.length > 0) sections.push({ title: 'This Month', data: thisMonth });
  if (older.length > 0) sections.push({ title: 'Older', data: older });
  return sections;
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { colors, typography, radii, springs } = useTheme();
  const { isSyncing, syncNow, error: syncError } = useSync();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<RNTextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPosts = useCallback(() => {
    const result = getAllBlogPosts(db, selectedCategory ?? undefined);
    setPosts(result);
  }, [db, selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      if (!searchMode) {
        loadPosts();
      }
    }, [loadPosts, searchMode])
  );

  const handleCategoryPress = useCallback(
    (category: TopicCategory | null) => {
      setSelectedCategory(category);
      if (searchMode) {
        setSearchMode(false);
        setSearchQuery('');
      }
      // Load posts for new category
      const result = getAllBlogPosts(db, category ?? undefined);
      setPosts(result);
    },
    [db, searchMode]
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (text.trim()) {
          const results = searchBlogPosts(db, text.trim());
          setPosts(results);
        } else {
          loadPosts();
        }
      }, 300);
    },
    [db, loadPosts]
  );

  const openSearch = useCallback(() => {
    setSearchMode(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchMode(false);
    setSearchQuery('');
    loadPosts();
  }, [loadPosts]);

  const handleRefresh = useCallback(async () => {
    await haptics.light();
    await syncNow();
    loadPosts();
  }, [syncNow, loadPosts]);

  const handlePostPress = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`);
    },
    [router]
  );

  const sections = useMemo(() => groupByTimePeriod(posts), [posts]);

  // --- Empty State ---
  if (!searchMode && posts.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="title">Your Library</ThemedText>
        </View>

        <EmptyState
          title="No posts yet"
          message="Start a conversation and your thoughts will appear here."
          action={{ label: 'Start a Conversation →', onPress: () => router.push('/(tabs)/') }}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      {/* Header */}
      <View style={styles.header}>
        {searchMode ? (
          <Animated.View
            entering={FadeIn.springify()
              .damping(springs.snappy.damping)
              .stiffness(springs.snappy.stiffness)
              .mass(springs.snappy.mass)}
            exiting={FadeOut.springify()
              .damping(springs.snappy.damping)
              .stiffness(springs.snappy.stiffness)
              .mass(springs.snappy.mass)}
            style={styles.searchRow}
          >
            <RNTextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search posts…"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  fontFamily: typography.chat.fontFamily,
                  fontSize: 16,
                  borderRadius: radii.sm,
                },
              ]}
            />
            <Pressable onPress={closeSearch} hitSlop={12}>
              <ThemedText variant="ui" color="secondary">✕</ThemedText>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.titleRow}>
            <ThemedText variant="title">Your Library</ThemedText>
            <Pressable onPress={openSearch} hitSlop={12}>
              <ThemedText variant="ui">🔍</ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Category Chips */}
      {!searchMode && (
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          <Chip
            label="All"
            selected={selectedCategory === null}
            onPress={() => handleCategoryPress(null)}
            style={styles.chip}
          />
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.label}
              selected={selectedCategory === cat.id}
              onPress={() => handleCategoryPress(cat.id)}
              color={cat.color}
              style={styles.chip}
            />
          ))}
        </Animated.ScrollView>
      )}

      {/* Sync Error Banner */}
      <SyncBanner visible={!!syncError} onRetry={syncNow} />

      {/* Blog Post List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <ThemedText variant="uiSmall" color="secondary" style={styles.sectionHeaderText}>
              {section.title}
            </ThemedText>
          </View>
        )}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 50)
              .springify()
              .damping(20)
              .stiffness(200)}
          >
            <BlogCard post={item} onPress={() => handlePostPress(item.id)} />
          </Animated.View>
        )}
        stickySectionHeadersEnabled
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={handleRefresh}
            tintColor={colors.textSecondary}
          />
        }
        ListEmptyComponent={
          searchMode ? (
            <EmptyState
              title="Nothing found"
              message="Try a different search term"
            />
          ) : null
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.contentPadding,
  },
  header: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  chipRow: {
    gap: 8,
  },
  chip: {
    marginRight: 0,
  },
  sectionHeader: {
    paddingVertical: spacing.sm,
  },
  sectionHeaderText: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    flexGrow: 1,
  },
});
