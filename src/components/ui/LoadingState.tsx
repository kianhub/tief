import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  const { springs } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSpring(1.12, springs.breathe),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withSpring(1, springs.breathe),
      -1,
      true,
    );
  }, [scale, opacity, springs.breathe]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, breatheStyle]}>
      <ThemedText variant="body" color="tertiary" style={styles.text}>
        {message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  text: {
    textAlign: 'center',
  },
});
