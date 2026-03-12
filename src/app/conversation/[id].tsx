import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import {
  useConversation as useElevenLabs,
  type Conversation as ELConversation,
} from '@elevenlabs/react-native';
import * as Haptics from 'expo-haptics';

import { useConversation } from '@/hooks/useConversation';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { useTheme } from '@/hooks/useTheme';
import { useDatabase } from '@/lib/db-context';
import { getConversation as getConversationRecord } from '@/lib/db-helpers';
import { VoiceConversationView } from '@/components/conversation/VoiceConversationView';
import { TextConversationView } from '@/components/conversation/TextConversationView';
import { EndConversationModal } from '@/components/conversation/EndConversationModal';
import type { ConversationMode, TopicCategory } from '@/types';

export default function ConversationScreen() {
  const { id, topic, mode: initialMode, category } = useLocalSearchParams<{
    id: string;
    topic?: string;
    mode?: ConversationMode;
    category?: string;
  }>();

  const router = useRouter();
  const navigation = useNavigation();
  const db = useDatabase();
  const { colors } = useTheme();

  const conversation = useConversation();
  const [showEndModal, setShowEndModal] = useState(false);
  const initRef = useRef(false);

  // --- ElevenLabs voice session ---
  const elConversation = useElevenLabs({
    onMessage: conversation.voiceHandlers.onMessage,
    onConnect: conversation.voiceHandlers.onConnect,
    onDisconnect: conversation.voiceHandlers.onDisconnect,
    onError: conversation.voiceHandlers.onError,
  });

  // Keep a ref so the adapter always reaches the latest SDK object
  const elRef = useRef<ELConversation>(elConversation);
  elRef.current = elConversation;

  // Adapt ElevenLabs SDK to our VoiceSession interface
  useEffect(() => {
    conversation.setVoiceSession({
      startSession: async (config) => {
        await elRef.current.startSession(config);
        return elRef.current.getId();
      },
      endSession: () => elRef.current.endSession(),
      status: elRef.current.status as 'connected' | 'disconnected',
      isSpeaking: elRef.current.isSpeaking,
      setVolume: ({ volume }) => {
        elRef.current.setMicMuted(volume === 0);
      },
    });
  }, [conversation.setVoiceSession]);

  // --- Audio amplitude for voice orb ---
  const amplitudeResult = useAudioAmplitude({
    isAISpeaking: conversation.isAISpeaking,
    isUserSpeaking: conversation.isUserSpeaking,
    isActive: conversation.phase === 'active' && conversation.mode === 'voice',
  });

  // Bridge SharedValue to plain number for VoiceConversationView/VoiceOrb
  const [amplitudeNum, setAmplitudeNum] = useState(0);
  useEffect(() => {
    if (conversation.phase !== 'active' || conversation.mode !== 'voice') {
      setAmplitudeNum(0);
      return;
    }
    const interval = setInterval(() => {
      setAmplitudeNum(amplitudeResult.amplitude.value);
    }, 50); // ~20fps sampling
    return () => clearInterval(interval);
  }, [conversation.phase, conversation.mode, amplitudeResult.amplitude]);

  // --- Initialize conversation ---
  useEffect(() => {
    if (initRef.current || conversation.phase !== 'idle') return;
    initRef.current = true;

    if (topic) {
      // New conversation — topic param indicates a fresh start
      conversation
        .startConversation({
          mode: initialMode || 'text',
          topicPrompt: topic,
          topicCategory: category as TopicCategory | undefined,
        })
        .then(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        });
    } else if (id && id !== 'new') {
      // Resume existing conversation from DB
      const existing = getConversationRecord(db, id);
      if (existing && existing.status === 'active') {
        conversation.resumeConversation(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Conversation doesn't exist or is not active — go back
        router.back();
      }
    }
  }, [id, topic, initialMode, category, conversation.phase, db]);

  // --- Mode switching with cross-fade ---
  const viewOpacity = useSharedValue(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSwitchMode = useCallback(
    async (newMode: ConversationMode) => {
      if (isTransitioning || conversation.mode === newMode) return;
      setIsTransitioning(true);

      // Fade out
      viewOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(performSwitch)(newMode);
        }
      });
    },
    [isTransitioning, conversation.mode],
  );

  async function performSwitch(newMode: ConversationMode) {
    await conversation.switchMode(newMode);
    // Fade in
    viewOpacity.value = withTiming(1, { duration: 200 });
    setIsTransitioning(false);
  }

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: viewOpacity.value,
    flex: 1,
  }));

  // --- Back navigation guard ---
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: { preventDefault: () => void }) => {
      if (conversation.phase !== 'active') return;
      e.preventDefault();
      setShowEndModal(true);
    });
    return unsubscribe;
  }, [conversation.phase, navigation]);

  // Android hardware back button
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (conversation.phase === 'active') {
        setShowEndModal(true);
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [conversation.phase]);

  // --- End conversation handler ---
  const handleConfirmEnd = useCallback(async () => {
    setShowEndModal(false);
    await conversation.endConversation();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  }, [conversation.endConversation, router]);

  const handleCancelEnd = useCallback(() => {
    setShowEndModal(false);
  }, []);

  // --- Loading / error states ---
  if (conversation.phase === 'idle' || conversation.phase === 'starting') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="auto" />
      </View>
    );
  }

  const conversationId = conversation.conversationId ?? id ?? '';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={conversation.mode === 'voice' ? 'light' : 'auto'} />

      <Animated.View style={fadeStyle}>
        {conversation.mode === 'voice' ? (
          <VoiceConversationView
            conversationId={conversationId}
            messages={conversation.messages}
            isAISpeaking={conversation.isAISpeaking}
            isUserSpeaking={conversation.isUserSpeaking}
            amplitude={amplitudeNum}
            isMuted={conversation.isMuted}
            duration={conversation.duration}
            onToggleMute={conversation.toggleMute}
            onSwitchToText={() => handleSwitchMode('text')}
            onEnd={() => setShowEndModal(true)}
          />
        ) : (
          <TextConversationView
            conversationId={conversationId}
            messages={conversation.messages}
            currentStreamingText={conversation.currentStreamingText}
            onSendMessage={conversation.sendTextMessage}
            onSwitchToVoice={() => handleSwitchMode('voice')}
            onEnd={() => setShowEndModal(true)}
            duration={conversation.duration}
          />
        )}
      </Animated.View>

      <EndConversationModal
        visible={showEndModal}
        onConfirm={handleConfirmEnd}
        onCancel={handleCancelEnd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
