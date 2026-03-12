import { StyleSheet, TextInput as RNTextInput, type TextInputProps as RNTextInputProps, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from './ThemedText';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
}

export function TextInput({ label, style, ...rest }: TextInputProps) {
  const { colors, typography, radii } = useTheme();

  return (
    <View>
      {label && (
        <ThemedText variant="caption" color="secondary" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <RNTextInput
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontFamily: typography.chat.fontFamily,
            fontSize: 16,
            borderRadius: radii.sm,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
});
