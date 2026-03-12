import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { Button } from './Button';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <ThemedText variant="body" color="secondary" style={styles.message}>
        {message}
      </ThemedText>
      {onRetry && (
        <View style={styles.actionContainer}>
          <Button label="Try again" variant="secondary" onPress={onRetry} />
        </View>
      )}
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
  message: {
    textAlign: 'center',
  },
  actionContainer: {
    marginTop: 24,
  },
});
