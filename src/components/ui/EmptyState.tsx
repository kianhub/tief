import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';

export interface EmptyStateProps {
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  const { springs } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.springify()
        .damping(springs.gentle.damping)
        .stiffness(springs.gentle.stiffness)
        .mass(springs.gentle.mass)}
      style={styles.container}
    >
      <ThemedText variant="title" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={styles.message}>
        {message}
      </ThemedText>
      {action && (
        <View style={styles.actionContainer}>
          <Button label={action.label} onPress={action.onPress} />
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
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: 12,
  },
  actionContainer: {
    marginTop: 24,
  },
});
