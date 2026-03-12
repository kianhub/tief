import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ui';
import { ChatBubble } from './ChatBubble';
import { MessageInput } from './MessageInput';
import type { Message } from '@/types';

export interface TextConversationViewProps {
  conversationId: string;
  messages: Message[];
  currentStreamingText: string;
  onSendMessage: (text: string) => void;
  onSwitchToVoice: () => void;
  onEnd: () => void;
  duration: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PressableScale({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: object;
  children: React.ReactNode;
}) {
  const { springs } = useTheme();
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        pressScale.value = withSpring(0.92, springs.snappy);
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, springs.snappy);
      }}
      onPress={onPress}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function TextConversationView({
  messages,
  currentStreamingText,
  onSendMessage,
  onSwitchToVoice,
  onEnd,
  duration,
}: TextConversationViewProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Build display data: messages + optional streaming bubble
  const hasStreaming = currentStreamingText.length > 0;

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length, hasStreaming, currentStreamingText]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <ChatBubble
        role={item.role}
        content={item.content}
        timestamp={item.timestamp}
      />
    ),
    [],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const listFooter = hasStreaming ? (
    <ChatBubble
      // eslint-disable-next-line jsx-a11y/aria-role -- component prop, not ARIA
      role="assistant"
      content={currentStreamingText}
      isStreaming
    />
  ) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + spacing.sm },
        ]}
      >
        <PressableScale onPress={onEnd} style={styles.topButton}>
          <ThemedText
            variant="ui"
            style={{ color: colors.textSecondary, fontSize: 20 }}
          >
            ✕
          </ThemedText>
        </PressableScale>

        <ThemedText
          variant="caption"
          style={{ color: colors.textTertiary }}
        >
          {formatDuration(duration)}
        </ThemedText>

        <PressableScale
          onPress={() => setMenuOpen((v) => !v)}
          style={styles.topButton}
        >
          <ThemedText
            variant="ui"
            style={{ color: colors.textSecondary, fontSize: 20 }}
          >
            ⋮
          </ThemedText>
        </PressableScale>
      </View>

      {/* Menu overlay */}
      {menuOpen && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.menu,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              top: insets.top + spacing.sm + 44,
              right: 20,
            },
          ]}
        >
          <PressableScale
            onPress={() => {
              setMenuOpen(false);
              onEnd();
            }}
            style={styles.menuItem}
          >
            <ThemedText variant="ui" style={{ color: colors.accent }}>
              End Conversation
            </ThemedText>
          </PressableScale>
        </Animated.View>
      )}

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: spacing.contentPadding },
        ]}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText
              variant="body"
              style={{ color: colors.textTertiary, textAlign: 'center' }}
            >
              Start the conversation...
            </ThemedText>
          </View>
        }
      />

      {/* Input bar */}
      <View style={{ paddingBottom: insets.bottom }}>
        <MessageInput
          onSend={onSendMessage}
          onVoicePress={onSwitchToVoice}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  menu: {
    position: 'absolute',
    zIndex: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 180,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
