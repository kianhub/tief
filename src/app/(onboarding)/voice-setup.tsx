import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useOnboarding } from '@/lib/onboarding-context';
import { useAuth } from '@/lib/auth-context';
import { useDatabase } from '@/lib/db-context';
import { setPreference } from '@/lib/db-helpers';
import { updateProfile } from '@/lib/supabase';
import { ThemedView, ThemedText, Button, Card } from '@/components/ui';
import { VOICES } from '@/constants/voices';

export default function VoiceSetupScreen() {
  const router = useRouter();
  const { colors, spacing, radii, springs } = useTheme();
  const { user, refreshProfile } = useAuth();
  const db = useDatabase();
  const {
    interests,
    notificationTimes,
    notificationFrequency,
    selectedVoiceId,
    setSelectedVoiceId,
    defaultMode,
    setDefaultMode,
  } = useOnboarding();

  const [isSaving, setIsSaving] = useState(false);

  const handlePlaySample = (voiceId: string) => {
    // MVP: audio samples require ElevenLabs setup — log for now
    console.log(`[voice-setup] Play sample for: ${voiceId}`);
  };

  const handleAllowMicrophone = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (granted) {
        setDefaultMode('voice');
      }
    } catch (err) {
      console.error('Mic permission error:', err);
    }
  };

  const handleSkipMicrophone = () => {
    setDefaultMode('text');
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const interestsArray = Array.from(interests);
      const enabledTimes = notificationTimes
        .filter((t) => t.enabled)
        .map((t) => ({ hour: t.hour, minute: t.minute }));

      // Save to local SQLite
      setPreference(db, 'topic_interests', JSON.stringify(interestsArray));
      setPreference(db, 'notification_times', JSON.stringify(enabledTimes));
      setPreference(db, 'notification_frequency', notificationFrequency);
      setPreference(db, 'voice_preference', selectedVoiceId);
      setPreference(db, 'default_mode', defaultMode);

      // Save to Supabase
      await updateProfile(user.id, {
        topic_interests: interestsArray,
        notification_times: enabledTimes,
        notification_frequency: notificationFrequency,
        voice_preference: selectedVoiceId,
        onboarding_completed: true,
      });

      // Refresh profile so isOnboarded updates and routing guard redirects to tabs
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save onboarding data:', err);
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
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
            How should I sound?
          </ThemedText>

          <ThemedText variant="body" color="secondary" style={styles.subtitle}>
            Pick a voice that feels right:
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200)
            .springify()
            .damping(springs.gentle.damping)
            .stiffness(springs.gentle.stiffness)
            .mass(springs.gentle.mass)}
          style={styles.voiceGrid}
        >
          {VOICES.map((voice) => {
            const isSelected = selectedVoiceId === voice.id;
            return (
              <Card
                key={voice.id}
                onPress={() => setSelectedVoiceId(voice.id)}
                style={[
                  styles.voiceCard,
                  isSelected && {
                    borderColor: colors.accent,
                    borderWidth: 2,
                  },
                ]}
              >
                <View style={styles.voiceCardHeader}>
                  <View style={styles.voiceCardInfo}>
                    <ThemedText variant="ui">{voice.label}</ThemedText>
                    <ThemedText variant="caption" color="secondary">
                      {voice.gender === 'female' ? '♀' : '♂'} · {voice.energy}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handlePlaySample(voice.id)}
                    style={[
                      styles.playButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <ThemedText variant="ui">▶</ThemedText>
                  </Pressable>
                </View>
                <ThemedText
                  variant="caption"
                  color="secondary"
                  style={styles.voiceDescription}
                >
                  {voice.description}
                </ThemedText>
              </Card>
            );
          })}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400)
            .springify()
            .damping(springs.gentle.damping)
            .stiffness(springs.gentle.stiffness)
            .mass(springs.gentle.mass)}
        >
          <ThemedText
            variant="caption"
            color="tertiary"
            style={styles.micHint}
          >
            We'll need microphone access for voice conversations. You can also
            chat by text anytime.
          </ThemedText>

          <View style={styles.micButtons}>
            <Button
              variant="secondary"
              size="md"
              label="Allow Microphone"
              onPress={handleAllowMicrophone}
              style={styles.micButton}
            />
            <Button
              variant="ghost"
              size="md"
              label="Maybe later — I'll use text"
              onPress={handleSkipMicrophone}
              style={styles.micButton}
            />
          </View>

          {defaultMode === 'voice' && (
            <ThemedText variant="caption" color="accent" style={styles.micGranted}>
              ✓ Microphone access granted
            </ThemedText>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: spacing.contentPadding }]}>
        <Button
          variant="primary"
          size="lg"
          label="Start My First Conversation →"
          onPress={handleFinish}
          loading={isSaving}
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
    paddingBottom: 140,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  voiceGrid: {
    gap: 12,
    marginBottom: 32,
  },
  voiceCard: {
    padding: 16,
  },
  voiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceCardInfo: {
    flex: 1,
    gap: 2,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceDescription: {
    lineHeight: 18,
  },
  micHint: {
    textAlign: 'center',
    marginBottom: 16,
  },
  micButtons: {
    gap: 8,
    marginBottom: 8,
  },
  micButton: {
    alignSelf: 'stretch',
  },
  micGranted: {
    textAlign: 'center',
    marginTop: 4,
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
