import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { format } from 'date-fns';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ui';

export interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  timestamp?: string;
}

function StreamingCursor() {
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withTiming(0, { duration: 530 }),
      -1,
      true,
    );
  }, [cursorOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return <Animated.Text style={animatedStyle}>▊</Animated.Text>;
}

export function ChatBubble({
  role,
  content,
  isStreaming,
  timestamp,
}: ChatBubbleProps) {
  const { colors, typography } = useTheme();
  const isUser = role === 'user';

  const formattedTime = timestamp
    ? format(new Date(timestamp), 'h:mm a')
    : undefined;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(300)}
      style={[
        styles.wrapper,
        { alignItems: isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? {
                alignSelf: 'flex-end',
                backgroundColor: colors.surface,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderBottomRightRadius: 4,
                borderBottomLeftRadius: 16,
              }
            : {
                alignSelf: 'flex-start',
                backgroundColor: 'transparent',
                borderColor: colors.border,
                borderWidth: StyleSheet.hairlineWidth,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                borderBottomLeftRadius: 4,
              },
        ]}
      >
        <ThemedText variant="chat" style={{ color: colors.textPrimary }}>
          {content}
          {isStreaming && <StreamingCursor />}
        </ThemedText>
      </View>

      {formattedTime && (
        <ThemedText
          variant="caption"
          style={[
            styles.timestamp,
            {
              color: colors.textTertiary,
              alignSelf: isUser ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          {formattedTime}
        </ThemedText>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timestamp: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
});
