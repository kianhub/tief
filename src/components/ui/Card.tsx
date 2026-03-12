import { Pressable, StyleSheet, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';

export interface CardProps extends ViewProps {
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ onPress, style, children, ...rest }: CardProps) {
  const { colors, radii, spacing, springs } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springs.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springs.snappy);
  };

  const cardStyle = [
    styles.base,
    {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.cardPadding,
      borderColor: colors.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[cardStyle, animatedStyle]}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={cardStyle} {...rest}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});
