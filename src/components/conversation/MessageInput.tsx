import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ui';
import { haptics } from '@/lib/haptics';

export interface MessageInputProps {
  onSend: (text: string) => void;
  onVoicePress: () => void;
  placeholder?: string;
  disabled?: boolean;
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

export function MessageInput({
  onSend,
  onVoicePress,
  placeholder = 'Type a message...',
  disabled,
}: MessageInputProps) {
  const { colors, typography, radii } = useTheme();
  const [text, setText] = useState('');
  const hasText = text.trim().length > 0;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    haptics.light();
  }, [text, onSend]);

  return (
    <View
      style={[
        styles.inputBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <RNTextInput
        style={[
          styles.textInput,
          {
            color: colors.textPrimary,
            fontFamily: typography.chat.fontFamily,
            fontSize: typography.chat.fontSize,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={2000}
        value={text}
        onChangeText={setText}
        editable={!disabled}
      />

      <View style={styles.inputButtons}>
        {hasText && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
            <PressableScale
              onPress={handleSend}
              style={[
                styles.sendButton,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radii.full,
                },
              ]}
            >
              <ThemedText variant="ui" style={{ color: '#FFFFFF', fontSize: 16 }}>
                ↑
              </ThemedText>
            </PressableScale>
          </Animated.View>
        )}

        <PressableScale onPress={onVoicePress} style={styles.voiceButton}>
          <ThemedText
            variant="ui"
            style={{ color: colors.textSecondary, fontSize: 20 }}
          >
            🎤
          </ThemedText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    maxHeight: 100, // ~4 lines
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
