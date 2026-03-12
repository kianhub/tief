import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from './ThemedText';

export interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

export function SettingsRow({
  label,
  value,
  onPress,
  rightElement,
  destructive = false,
}: SettingsRowProps) {
  const { colors, spacing } = useTheme();

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: spacing.contentPadding,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <ThemedText
        variant="ui"
        style={destructive ? { color: '#C4443B' } : undefined}
      >
        {label}
      </ThemedText>

      <View style={styles.right}>
        {rightElement ?? (
          <>
            {value ? (
              <ThemedText variant="ui" color="secondary" style={styles.value}>
                {value}
              </ThemedText>
            ) : null}
            {onPress ? (
              <ThemedText variant="ui" color="tertiary">
                ›
              </ThemedText>
            ) : null}
          </>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  value: {
    maxWidth: 200,
  },
  pressed: {
    opacity: 0.7,
  },
});
