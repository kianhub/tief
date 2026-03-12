import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'surface';
}

export function ThemedView({ variant = 'background', style, ...rest }: ThemedViewProps) {
  const { colors } = useTheme();

  return <View style={[{ backgroundColor: colors[variant] }, style]} {...rest} />;
}
