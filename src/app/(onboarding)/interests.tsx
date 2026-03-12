import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useOnboarding } from '@/lib/onboarding-context';
import { ThemedView, ThemedText, Button, Chip } from '@/components/ui';
import { CATEGORIES, type TopicCategory } from '@/constants/categories';

export default function InterestsScreen() {
  const router = useRouter();
  const { spacing, springs } = useTheme();
  const { interests, setInterests } = useOnboarding();

  const toggleCategory = (id: TopicCategory) => {
    const next = new Set(interests);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setInterests(next);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: spacing.contentPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.springify()
            .damping(springs.gentle.damping)
            .stiffness(springs.gentle.stiffness)
            .mass(springs.gentle.mass)}
        >
          <ThemedText variant="title" style={styles.title}>
            What do you like talking about?
          </ThemedText>

          <ThemedText variant="body" color="secondary" style={styles.subtitle}>
            Tap all that interest you:
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200)
            .springify()
            .damping(springs.gentle.damping)
            .stiffness(springs.gentle.stiffness)
            .mass(springs.gentle.mass)}
          style={styles.chipGrid}
        >
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.id === 'random' ? 'Random — surprise me' : cat.label}
              selected={interests.has(cat.id)}
              onPress={() => toggleCategory(cat.id)}
              color={cat.color}
              style={styles.chip}
            />
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(400).springify()
            .damping(springs.gentle.damping)
            .stiffness(springs.gentle.stiffness)
            .mass(springs.gentle.mass)}
        >
          <ThemedText variant="caption" color="tertiary" style={styles.hint}>
            You can change these anytime
          </ThemedText>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: spacing.contentPadding }]}>
        <Button
          variant="primary"
          size="lg"
          label="Continue →"
          disabled={interests.size === 0}
          onPress={() => router.push('/(onboarding)/notifications')}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 120,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    marginBottom: 2,
  },
  hint: {
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 60,
    paddingTop: 16,
  },
});
