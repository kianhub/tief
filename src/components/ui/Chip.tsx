import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Chip({ label, selected, onPress, color, style }: ChipProps) {
  const { colors, typography, radii, springs } = useTheme();
  const scale = useSharedValue(1);

  const fillColor = color ?? colors.accent;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springs.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springs.snappy);
  };

  const handlePress = () => {
    haptics.selection();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        {
          borderRadius: radii.full,
          backgroundColor: selected ? fillColor : 'transparent',
          borderColor: selected ? fillColor : colors.border,
        },
        animatedStyle,
        style,
      ]}
    >
      <Animated.Text
        style={{
          fontFamily: typography.uiSmall.fontFamily,
          fontSize: typography.uiSmall.fontSize,
          fontWeight: typography.uiSmall.fontWeight,
          lineHeight: typography.uiSmall.lineHeight,
          color: selected ? '#FFFFFF' : colors.textPrimary,
        }}
      >
        {label}
      </Animated.Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
