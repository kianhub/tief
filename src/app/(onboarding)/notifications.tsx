import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useOnboarding, type NotificationTime } from '@/lib/onboarding-context';
import { ThemedView, ThemedText, Button } from '@/components/ui';
import type { NotificationFrequency } from '@/types';

const TIME_EMOJIS: Record<string, string> = {
  Morning: '🌅',
  Afternoon: '☀️',
  Evening: '🌙',
};

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}:${String(minute).padStart(2, '0')} ${period}`;
}

const FREQUENCY_OPTIONS: { value: NotificationFrequency; label: string }[] = [
  { value: 'daily', label: 'Once a day' },
  { value: 'twice_daily', label: 'A couple times a day' },
  { value: 'few_times', label: 'A few times a week' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const {
    notificationTimes,
    setNotificationTimes,
    notificationFrequency,
    setNotificationFrequency,
  } = useOnboarding();

  const toggleTime = (index: number) => {
    const updated = notificationTimes.map((t, i) =>
      i === index ? { ...t, enabled: !t.enabled } : t,
    );
    setNotificationTimes(updated);
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
        <ThemedText variant="title" style={styles.title}>
          When should we start a conversation?
        </ThemedText>

        <View style={styles.timeSlotsSection}>
          {notificationTimes.map((slot, index) => (
            <View
              key={slot.label}
              style={[
                styles.timeSlotRow,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.timeSlotLeft}>
                <ThemedText variant="body" style={styles.timeEmoji}>
                  {TIME_EMOJIS[slot.label] ?? '⏰'}
                </ThemedText>
                <View>
                  <ThemedText variant="ui">{slot.label}</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    {formatTime(slot.hour, slot.minute)}
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={slot.enabled}
                onValueChange={() => toggleTime(index)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        <View style={styles.frequencySection}>
          <ThemedText variant="ui" style={styles.frequencyLabel}>
            How often?
          </ThemedText>

          {FREQUENCY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={styles.radioRow}
              onPress={() => setNotificationFrequency(option.value)}
            >
              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor:
                      notificationFrequency === option.value
                        ? colors.accent
                        : colors.textTertiary,
                  },
                ]}
              >
                {notificationFrequency === option.value && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: colors.accent },
                    ]}
                  />
                )}
              </View>
              <ThemedText variant="body">{option.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: spacing.contentPadding }]}>
        <Button
          variant="primary"
          size="lg"
          label="Continue →"
          onPress={() => router.push('/(onboarding)/voice-setup')}
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
    marginBottom: 32,
  },
  timeSlotsSection: {
    gap: 12,
    marginBottom: 40,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
  },
  timeSlotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeEmoji: {
    fontSize: 24,
  },
  frequencySection: {
    gap: 16,
  },
  frequencyLabel: {
    marginBottom: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
