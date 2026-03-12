import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { TypographyVariant } from '@/constants/theme';

type TextColor = 'primary' | 'secondary' | 'tertiary' | 'accent';

export interface ThemedTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: TextColor;
}

const colorMap: Record<TextColor, 'textPrimary' | 'textSecondary' | 'textTertiary' | 'accent'> = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  accent: 'accent',
};

export function ThemedText({
  variant = 'ui',
  color = 'primary',
  style,
  ...rest
}: ThemedTextProps) {
  const { colors, typography } = useTheme();
  const typo = typography[variant];

  return (
    <Text
      style={[
        {
          fontFamily: typo.fontFamily,
          fontSize: typo.fontSize,
          fontWeight: typo.fontWeight,
          lineHeight: typo.lineHeight,
          ...('letterSpacing' in typo ? { letterSpacing: typo.letterSpacing } : {}),
          color: colors[colorMap[color]],
        },
        style,
      ]}
      {...rest}
    />
  );
}
