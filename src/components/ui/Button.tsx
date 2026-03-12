import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  hapticDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeHeights: Record<ButtonSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  variant = 'primary',
  size = 'md',
  label,
  onPress,
  disabled = false,
  loading = false,
  hapticDisabled = false,
  style,
}: ButtonProps) {
  const { colors, typography, radii, springs } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springs.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springs.snappy);
  };

  const handlePress = () => {
    if (!hapticDisabled) haptics.light();
    onPress?.();
  };

  const height = sizeHeights[size];

  const bgColor =
    variant === 'primary'
      ? colors.accent
      : variant === 'secondary'
        ? colors.surface
        : 'transparent';

  const textColor =
    variant === 'primary' ? '#FFFFFF' : colors.textPrimary;

  const borderStyle =
    variant === 'secondary'
      ? { borderWidth: 1, borderColor: colors.border }
      : undefined;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          height,
          backgroundColor: bgColor,
          borderRadius: radii.sm,
          opacity: disabled ? 0.5 : 1,
        },
        borderStyle,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Animated.Text
          style={[
            {
              fontFamily: typography.ui.fontFamily,
              fontSize: typography.ui.fontSize,
              fontWeight: typography.ui.fontWeight,
              lineHeight: typography.ui.lineHeight,
              color: textColor,
            },
          ]}
        >
          {label}
        </Animated.Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
