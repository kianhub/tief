import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { ThemedView, ThemedText, Button } from '@/components/ui';

export default function WelcomeScreen() {
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <Animated.View
        entering={FadeIn.duration(800).springify().damping(20).stiffness(80)}
        style={[styles.content, { paddingHorizontal: spacing.contentPadding }]}
      >
        <ThemedText variant="display" style={styles.headline}>
          {"Your thoughts deserve\nto be heard."}
        </ThemedText>

        <ThemedText variant="body" color="secondary" style={styles.subtitle}>
          tief. starts conversations that matter — and turns them into your
          personal writing.
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(400).duration(600)}
        style={[styles.footer, { paddingHorizontal: spacing.contentPadding }]}
      >
        <Button
          variant="primary"
          size="lg"
          label="Get Started →"
          onPress={() => router.push('/(onboarding)/interests')}
        />
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: '30%',
  },
  headline: {
    marginBottom: 20,
  },
  subtitle: {
    maxWidth: 320,
  },
  footer: {
    paddingBottom: 60,
  },
});
