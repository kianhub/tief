import { useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ui';
import { VoiceOrb, type OrbState } from './VoiceOrb';
import type { Message } from '@/types';

export interface VoiceConversationViewProps {
  conversationId: string;
  messages: Message[];
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  amplitude: number;
  isMuted: boolean;
  duration: number;
  onToggleMute: () => void;
  onSwitchToText: () => void;
  onEnd: () => void;
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

export function VoiceConversationView({
  messages,
  isAISpeaking,
  isUserSpeaking,
  amplitude,
  isMuted,
  duration,
  onToggleMute,
  onSwitchToText,
  onEnd,
}: VoiceConversationViewProps) {
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const orbSize = width * 0.5;

  const orbState: OrbState = isAISpeaking
    ? 'speaking'
    : isUserSpeaking
      ? 'listening'
      : 'idle';

  // Auto-scroll transcript to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleToggleMute = useCallback(() => {
    Haptics.selectionAsync();
    onToggleMute();
  }, [onToggleMute]);

  // Show last few exchanges
  const recentMessages = messages.slice(-6);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

        <View style={styles.topButton}>
          <ThemedText
            variant="ui"
            style={{ color: colors.textSecondary, fontSize: 20 }}
          >
            ⋮
          </ThemedText>
        </View>
      </View>

      {/* Center: Voice Orb */}
      <View style={styles.orbContainer}>
        <VoiceOrb state={orbState} amplitude={amplitude} size={orbSize} />
      </View>

      {/* Live transcript */}
      <ScrollView
        ref={scrollRef}
        style={[styles.transcript, { maxHeight: height * 0.4 }]}
        contentContainerStyle={{
          paddingHorizontal: spacing.contentPadding,
          paddingBottom: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {recentMessages.map((msg) => (
          <ThemedText
            key={msg.id}
            variant="chat"
            style={[
              styles.transcriptMessage,
              {
                color: colors.textSecondary,
                fontStyle: msg.role === 'assistant' ? 'italic' : 'normal',
              },
            ]}
          >
            {msg.content}
          </ThemedText>
        ))}
        {(isAISpeaking || isUserSpeaking) && (
          <ThemedText
            variant="chat"
            style={[
              styles.transcriptMessage,
              {
                color: colors.textTertiary,
                fontStyle: isAISpeaking ? 'italic' : 'normal',
              },
            ]}
          >
            {isAISpeaking ? 'Speaking…' : 'Listening…'}
          </ThemedText>
        )}
      </ScrollView>

      {/* Bottom controls */}
      <View
        style={[
          styles.bottomControls,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        {/* Switch to text */}
        <PressableScale onPress={onSwitchToText} style={styles.sideButton}>
          <ThemedText
            variant="uiSmall"
            style={{ color: colors.textSecondary }}
          >
            Text 💬
          </ThemedText>
        </PressableScale>

        {/* Mic button */}
        <PressableScale onPress={handleToggleMute} style={styles.micWrapper}>
          <View
            style={[
              styles.micButton,
              {
                backgroundColor: isMuted ? 'transparent' : colors.textPrimary,
                borderColor: isMuted ? colors.textSecondary : colors.textPrimary,
                borderRadius: radii.full,
              },
            ]}
          >
            <ThemedText
              variant="ui"
              style={{
                color: isMuted ? colors.textSecondary : colors.background,
                fontSize: 24,
              }}
            >
              {isMuted ? '🔇' : '🎤'}
            </ThemedText>
          </View>
        </PressableScale>

        {/* End button */}
        <PressableScale onPress={onEnd} style={styles.sideButton}>
          <View
            style={[
              styles.endButton,
              {
                backgroundColor: colors.accent,
                borderRadius: radii.sm,
              },
            ]}
          >
            <ThemedText
              variant="uiSmall"
              style={[
                { color: '#FFFFFF' },
                { fontFamily: typography.ui.fontFamily },
              ]}
            >
              End
            </ThemedText>
          </View>
        </PressableScale>
      </View>
    </View>
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
  orbContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcript: {
    flexGrow: 0,
  },
  transcriptMessage: {
    marginBottom: 12,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sideButton: {
    flex: 1,
    alignItems: 'center',
  },
  micWrapper: {
    alignItems: 'center',
  },
  micButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  endButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
