import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/lib/auth-context';
import { useDatabase } from '@/lib/db-context';
import { getPreference, setPreference, getAllBlogPosts, getRecentConversations } from '@/lib/db-helpers';
import { updateProfile, supabase } from '@/lib/supabase';
import { ThemedView, ThemedText, SettingsRow, SelectSheet, Chip } from '@/components/ui';
import { CATEGORIES } from '@/constants/categories';
import { VOICES } from '@/constants/voices';
import { spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { BlogTone, NotificationFrequency, TopicCategory } from '@/types';

// --- Constants ---

const TONE_OPTIONS: Array<{ label: string; value: BlogTone; description?: string }> = [
  { label: 'Auto-match', value: 'auto', description: 'Matches the tone of your conversation' },
  { label: 'Casual', value: 'casual' },
  { label: 'Reflective', value: 'reflective' },
  { label: 'Analytical', value: 'analytical' },
  { label: 'Poetic', value: 'poetic' },
  { label: 'Conversational', value: 'conversational' },
];

const FREQUENCY_OPTIONS: Array<{ label: string; value: NotificationFrequency }> = [
  { label: 'Daily', value: 'daily' },
  { label: 'Couple times a day', value: 'twice_daily' },
  { label: 'Few times a week', value: 'few_times' },
];

const TONE_LABELS: Record<BlogTone, string> = {
  auto: 'Auto-match',
  casual: 'Casual',
  reflective: 'Reflective',
  analytical: 'Analytical',
  poetic: 'Poetic',
  conversational: 'Conversational',
};

const FREQUENCY_LABELS: Record<NotificationFrequency, string> = {
  daily: 'Daily',
  twice_daily: 'Couple times a day',
  few_times: 'Few times a week',
};

// --- Component ---

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, spacing: sp, radii } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const db = useDatabase();

  // Local state from profile
  const [conversationPrompts, setConversationPrompts] = useState(true);
  const [toneSheetVisible, setToneSheetVisible] = useState(false);
  const [frequencySheetVisible, setFrequencySheetVisible] = useState(false);
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [interestsModalVisible, setInterestsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [modeSheetVisible, setModeSheetVisible] = useState(false);
  const [notifTimesModalVisible, setNotifTimesModalVisible] = useState(false);

  // Derived values from profile
  const currentTone: BlogTone = profile?.blog_tone ?? 'auto';
  const currentFrequency: NotificationFrequency = profile?.notification_frequency ?? 'daily';
  const currentVoice = profile?.voice_preference ?? 'voice_placeholder_1';
  const currentInterests = profile?.topic_interests ?? [];
  const currentMode = (getPreference(db, 'default_mode') as 'voice' | 'text') ?? 'text';
  const currentNotifTimes = profile?.notification_times ?? [];

  const voiceLabel = useMemo(() => {
    const voice = VOICES.find((v) => v.id === currentVoice);
    return voice?.label ?? 'Default';
  }, [currentVoice]);

  // --- Handlers ---

  const handleUpdateTone = useCallback(
    async (tone: BlogTone) => {
      if (!user) return;
      setPreference(db, 'blog_tone', tone);
      await updateProfile(user.id, { blog_tone: tone });
      await refreshProfile();
    },
    [db, user, refreshProfile],
  );

  const handleUpdateFrequency = useCallback(
    async (freq: NotificationFrequency) => {
      if (!user) return;
      setPreference(db, 'notification_frequency', freq);
      await updateProfile(user.id, { notification_frequency: freq });
      await refreshProfile();
    },
    [db, user, refreshProfile],
  );

  const handleUpdateVoice = useCallback(
    async (voiceId: string) => {
      if (!user) return;
      setPreference(db, 'voice_preference', voiceId);
      await updateProfile(user.id, { voice_preference: voiceId });
      await refreshProfile();
    },
    [db, user, refreshProfile],
  );

  const handleUpdateMode = useCallback(
    async (mode: 'voice' | 'text') => {
      setPreference(db, 'default_mode', mode);
    },
    [db],
  );

  const handleToggleInterest = useCallback(
    async (id: TopicCategory) => {
      if (!user) return;
      const current = new Set(currentInterests);
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      const updated = Array.from(current);
      setPreference(db, 'topic_interests', JSON.stringify(updated));
      await updateProfile(user.id, { topic_interests: updated });
      await refreshProfile();
    },
    [db, user, currentInterests, refreshProfile],
  );

  const handleExportData = useCallback(async () => {
    try {
      const conversations = getRecentConversations(db, 1000);
      const blogPosts = getAllBlogPosts(db);

      const exportData = {
        exported_at: new Date().toISOString(),
        conversations,
        blog_posts: blogPosts,
      };

      const json = JSON.stringify(exportData, null, 2);
      const file = new File(Paths.cache, 'tief-export.json');
      file.write(json);

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Your Data',
      });
    } catch (err) {
      console.error('Export failed:', err);
      Alert.alert('Export Failed', 'Something went wrong while exporting your data.');
    }
  }, [db]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.rpc('delete_user_data', { user_id: user.id });
    } catch (err) {
      console.error('Delete RPC failed:', err);
    }

    setDeleteModalVisible(false);
    setDeleteConfirmText('');
    await signOut();
  }, [user, signOut]);

  // --- Section Header ---
  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <ThemedText
        variant="uiSmall"
        color="secondary"
        style={styles.sectionHeaderText}
      >
        {title}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      >
        <ThemedText variant="display" style={styles.title}>
          Settings
        </ThemedText>

        {/* Profile Section */}
        <SectionHeader title="PROFILE" />
        <SettingsRow
          label="Name"
          value={profile?.display_name ?? '—'}
          onPress={() => {
            // TODO: navigate to name edit
          }}
        />
        <SettingsRow
          label="Account"
          value={user?.email ?? ''}
          onPress={() => {
            // TODO: navigate to account details
          }}
        />

        {/* Conversations Section */}
        <SectionHeader title="CONVERSATIONS" />
        <SettingsRow
          label="Topics I Like"
          value={
            currentInterests.length > 0
              ? `${currentInterests.length} selected`
              : 'None'
          }
          onPress={() => setInterestsModalVisible(true)}
        />
        <SettingsRow
          label="AI Voice"
          value={voiceLabel}
          onPress={() => setVoiceSheetVisible(true)}
        />
        <SettingsRow
          label="Default Mode"
          value={currentMode === 'voice' ? 'Voice' : 'Text'}
          onPress={() => setModeSheetVisible(true)}
        />

        {/* Blog Posts Section */}
        <SectionHeader title="BLOG POSTS" />
        <SettingsRow
          label="Writing Tone"
          value={TONE_LABELS[currentTone]}
          onPress={() => setToneSheetVisible(true)}
        />

        {/* Notifications Section */}
        <SectionHeader title="NOTIFICATIONS" />
        <SettingsRow
          label="Conversation Prompts"
          rightElement={
            <Switch
              value={conversationPrompts}
              onValueChange={(val) => {
                setConversationPrompts(val);
                haptics.selection();
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingsRow
          label="Times"
          value={
            currentNotifTimes.length > 0
              ? `${currentNotifTimes.length} active`
              : 'None'
          }
          onPress={() => setNotifTimesModalVisible(true)}
        />
        <SettingsRow
          label="Frequency"
          value={FREQUENCY_LABELS[currentFrequency]}
          onPress={() => setFrequencySheetVisible(true)}
        />

        {/* Data Section */}
        <SectionHeader title="DATA" />
        <SettingsRow label="Export My Data" onPress={handleExportData} />
        <SettingsRow
          label="Delete Account"
          destructive
          onPress={() => setDeleteModalVisible(true)}
        />

        {/* About Section */}
        <SectionHeader title="ABOUT" />
        <SettingsRow
          label="Privacy Policy"
          onPress={() => Linking.openURL('https://tief.app/privacy')}
        />
        <SettingsRow
          label="Terms of Service"
          onPress={() => Linking.openURL('https://tief.app/terms')}
        />
        <View style={[styles.versionRow, { paddingHorizontal: sp.contentPadding }]}>
          <ThemedText variant="uiSmall" color="tertiary">
            Version 1.0.0
          </ThemedText>
        </View>
      </ScrollView>

      {/* --- Sheets / Modals --- */}

      {/* Writing Tone Sheet */}
      <SelectSheet
        visible={toneSheetVisible}
        title="Writing Tone"
        options={TONE_OPTIONS}
        selected={currentTone}
        onSelect={handleUpdateTone}
        onClose={() => setToneSheetVisible(false)}
      />

      {/* Frequency Sheet */}
      <SelectSheet
        visible={frequencySheetVisible}
        title="Notification Frequency"
        options={FREQUENCY_OPTIONS}
        selected={currentFrequency}
        onSelect={handleUpdateFrequency}
        onClose={() => setFrequencySheetVisible(false)}
      />

      {/* Voice Sheet */}
      <SelectSheet
        visible={voiceSheetVisible}
        title="AI Voice"
        options={VOICES.map((v) => ({
          label: v.label,
          value: v.id,
          description: `${v.gender === 'female' ? '♀' : '♂'} · ${v.energy}`,
        }))}
        selected={currentVoice}
        onSelect={handleUpdateVoice}
        onClose={() => setVoiceSheetVisible(false)}
      />

      {/* Default Mode Sheet */}
      <SelectSheet
        visible={modeSheetVisible}
        title="Default Mode"
        options={[
          { label: 'Voice', value: 'voice' as const, description: 'Talk with your AI companion' },
          { label: 'Text', value: 'text' as const, description: 'Type your thoughts instead' },
        ]}
        selected={currentMode}
        onSelect={handleUpdateMode}
        onClose={() => setModeSheetVisible(false)}
      />

      {/* Interests Modal */}
      <Modal
        visible={interestsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInterestsModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <ThemedText variant="titleSmall">Topics I Like</ThemedText>
            <Pressable onPress={() => setInterestsModalVisible(false)} hitSlop={12}>
              <ThemedText variant="ui" color="accent">
                Done
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalContent, { padding: sp.contentPadding }]}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText variant="body" color="secondary" style={styles.modalHint}>
              Tap to toggle topics you enjoy:
            </ThemedText>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.id}
                  label={cat.id === 'random' ? 'Random — surprise me' : cat.label}
                  selected={currentInterests.includes(cat.id)}
                  onPress={() => handleToggleInterest(cat.id)}
                  color={cat.color}
                />
              ))}
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Notification Times Modal */}
      <Modal
        visible={notifTimesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotifTimesModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <ThemedText variant="titleSmall">Notification Times</ThemedText>
            <Pressable onPress={() => setNotifTimesModalVisible(false)} hitSlop={12}>
              <ThemedText variant="ui" color="accent">
                Done
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalContent, { padding: sp.contentPadding }]}
            showsVerticalScrollIndicator={false}
          >
            <NotificationTimesEditor
              userId={user?.id ?? null}
              db={db}
              refreshProfile={refreshProfile}
              initialTimes={currentNotifTimes}
            />
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setDeleteConfirmText('');
        }}
      >
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteSheet, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
            <ThemedText variant="titleSmall" style={styles.deleteTitle}>
              Delete Account
            </ThemedText>
            <ThemedText variant="body" color="secondary" style={styles.deleteBody}>
              This will permanently delete all your data. This cannot be undone.
            </ThemedText>
            <ThemedText variant="uiSmall" color="secondary" style={styles.deleteHint}>
              Type DELETE to confirm:
            </ThemedText>
            <RNTextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              style={[
                styles.deleteInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: radii.sm,
                },
              ]}
            />
            <View style={styles.deleteButtons}>
              <Pressable
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmText('');
                }}
                style={styles.deleteCancel}
              >
                <ThemedText variant="ui" color="secondary">
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                style={[
                  styles.deleteConfirm,
                  {
                    backgroundColor:
                      deleteConfirmText === 'DELETE' ? '#C4443B' : colors.border,
                    borderRadius: radii.sm,
                  },
                ]}
              >
                <ThemedText
                  variant="ui"
                  style={{
                    color:
                      deleteConfirmText === 'DELETE' ? '#FFFFFF' : colors.textTertiary,
                  }}
                >
                  Delete
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

// --- Notification Times Editor (reuses onboarding pattern) ---

const TIME_SLOTS = [
  { label: 'Morning', hour: 9, minute: 0, emoji: '\u{1F305}' },
  { label: 'Afternoon', hour: 14, minute: 0, emoji: '\u{2600}\u{FE0F}' },
  { label: 'Evening', hour: 19, minute: 0, emoji: '\u{1F319}' },
];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}:${String(minute).padStart(2, '0')} ${period}`;
}

function NotificationTimesEditor({
  userId,
  db,
  refreshProfile,
  initialTimes,
}: {
  userId: string | null;
  db: ReturnType<typeof useDatabase>;
  refreshProfile: () => Promise<void>;
  initialTimes: Array<{ hour: number; minute: number }>;
}) {
  const { colors, radii } = useTheme();

  const enabledSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of initialTimes) {
      set.add(`${t.hour}:${t.minute}`);
    }
    return set;
  }, [initialTimes]);

  const handleToggle = useCallback(
    async (hour: number, minute: number) => {
      if (!userId) return;
      haptics.selection();
      const key = `${hour}:${minute}`;
      const newSet = new Set(enabledSet);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }

      const updatedTimes = TIME_SLOTS.filter((s) =>
        newSet.has(`${s.hour}:${s.minute}`),
      ).map((s) => ({ hour: s.hour, minute: s.minute }));

      setPreference(db, 'notification_times', JSON.stringify(updatedTimes));
      await updateProfile(userId, { notification_times: updatedTimes });
      await refreshProfile();
    },
    [userId, db, enabledSet, refreshProfile],
  );

  return (
    <View style={ntStyles.container}>
      {TIME_SLOTS.map((slot) => {
        const isEnabled = enabledSet.has(`${slot.hour}:${slot.minute}`);
        return (
          <View
            key={slot.label}
            style={[
              ntStyles.row,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={ntStyles.left}>
              <ThemedText variant="body" style={ntStyles.emoji}>
                {slot.emoji}
              </ThemedText>
              <View>
                <ThemedText variant="ui">{slot.label}</ThemedText>
                <ThemedText variant="caption" color="secondary">
                  {formatTime(slot.hour, slot.minute)}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={() => handleToggle(slot.hour, slot.minute)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        );
      })}
    </View>
  );
}

const ntStyles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 24,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.contentPadding,
  },
  title: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    marginTop: spacing.sectionSpacing,
    marginBottom: spacing.sm,
  },
  sectionHeaderText: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  versionRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  // Modal shared styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.contentPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalContent: {
    paddingBottom: 60,
  },
  modalHint: {
    marginBottom: spacing.lg,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  // Delete modal styles
  deleteOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.contentPadding,
  },
  deleteSheet: {
    width: '100%',
    padding: spacing.contentPadding,
  },
  deleteTitle: {
    marginBottom: spacing.sm,
  },
  deleteBody: {
    marginBottom: spacing.lg,
  },
  deleteHint: {
    marginBottom: spacing.sm,
  },
  deleteInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  deleteButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  deleteCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  deleteConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
});
