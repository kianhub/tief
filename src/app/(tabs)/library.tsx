import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView, ThemedText } from '@/components/ui';
import { spacing } from '@/constants/theme';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <ThemedText variant="display">Library</ThemedText>
      <ThemedText variant="body" color="secondary" style={styles.subtitle}>
        Your blog posts will appear here.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.contentPadding,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
});
