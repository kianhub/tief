import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useAuth } from '@/lib/auth-context';
import { useDatabase } from '@/lib/db-context';
import {
  insertConversation,
  updateConversation,
  getConversation as getConversationRecord,
  insertMessage,
  insertBlogPost,
  getMessagesByConversation,
  getRecentConversations,
} from '@/lib/db-helpers';
import { buildSessionConfig } from '@/lib/elevenlabs';
import {
  streamMessage,
  buildConversationHistory,
  buildTextSystemPrompt,
} from '@/lib/claude';
import { supabase } from '@/lib/supabase';
import type { ConversationMode, Message, TopicCategory } from '@/types';
import type { PromptParams } from '@/lib/prompt-builder';
import type { SessionConfig } from '@/lib/elevenlabs';

// --- Types ---

export type ConversationPhase = 'idle' | 'starting' | 'active' | 'ending' | 'ended';

export interface StartParams {
  mode: ConversationMode;
  topicPrompt: string;
  topicCategory?: TopicCategory;
}

/**
 * The ElevenLabs SDK `useConversation` hook return type — only the
 * subset we depend on so that the component wires the real hook.
 */
export interface VoiceSession {
  startSession: (config: SessionConfig) => Promise<string>;
  endSession: () => Promise<void>;
  status: 'connected' | 'disconnected';
  isSpeaking: boolean;
  setVolume: (opts: { volume: number }) => void;
}

/**
 * Callbacks the component should forward to the ElevenLabs
 * `useConversation` hook initializer.
 */
export interface VoiceHandlers {
  onMessage: (message: { source?: string; message?: string; type?: string }) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: unknown) => void;
}

export interface UseConversationReturn {
  // State
  phase: ConversationPhase;
  mode: ConversationMode;
  conversationId: string | null;
  messages: Message[];
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  currentStreamingText: string;
  error: string | null;

  // Actions
  startConversation: (params: StartParams) => Promise<void>;
  resumeConversation: (convId: string) => void;
  sendTextMessage: (text: string) => Promise<void>;
  switchMode: (newMode: ConversationMode) => Promise<void>;
  endConversation: () => Promise<void>;
  toggleMute: () => void;

  // Voice-specific
  isMuted: boolean;
  voiceAmplitude: number;

  // Metadata
  duration: number;
  topicPrompt: string | null;
  topicCategory: TopicCategory | null;

  // ElevenLabs integration — pass voiceHandlers to the SDK hook,
  // then call setVoiceSession with the returned object.
  voiceHandlers: VoiceHandlers;
  setVoiceSession: (session: VoiceSession) => void;
}

// --- Hook ---

export function useConversation(): UseConversationReturn {
  const { profile } = useAuth();
  const db = useDatabase();

  // --- Core state ---
  const [phase, setPhase] = useState<ConversationPhase>('idle');
  const [mode, setMode] = useState<ConversationMode>('text');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  // Voice state
  const [isMuted, setIsMuted] = useState(false);
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  // Duration timer
  const [duration, setDuration] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Topic metadata
  const [topicPrompt, setTopicPrompt] = useState<string | null>(null);
  const [topicCategory, setTopicCategory] = useState<TopicCategory | null>(null);

  // Refs for voice session & abort controller
  const voiceSessionRef = useRef<VoiceSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const phaseRef = useRef<ConversationPhase>('idle');

  // Keep refs in sync with state
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // --- Duration timer ---
  useEffect(() => {
    if (phase === 'active') {
      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startedAtRef.current) {
          setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  // --- Helpers ---

  function buildPromptParams(prompt: string, category?: TopicCategory): PromptParams {
    const recent = getRecentConversations(db, 10);
    const recentThemes = recent
      .filter((c) => c.topic_category)
      .map((c) => c.topic_category as string)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);

    return {
      topicPrompt: prompt,
      topicCategory: category ?? 'random',
      userName: profile?.display_name ?? 'Friend',
      userInterests: profile?.topic_interests ?? [],
      recentThemes,
    };
  }

  function createMessage(
    convId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Message {
    const msg: Message = {
      id: uuidv4(),
      conversation_id: convId,
      role,
      content,
      audio_url: null,
      timestamp: new Date().toISOString(),
      synced_at: null,
    };
    insertMessage(db, msg);
    return msg;
  }

  // --- Voice handlers (stable across renders for ElevenLabs SDK) ---

  const voiceHandlersRef = useRef<VoiceHandlers>({
    onMessage: () => {},
    onConnect: () => {},
    onDisconnect: () => {},
    onError: () => {},
  });

  voiceHandlersRef.current = {
    onMessage: (event) => {
      if (!event.message || !conversationIdRef.current) return;

      if (event.source === 'user' || event.type === 'user_transcript') {
        const msg = createMessage(conversationIdRef.current, 'user', event.message);
        setMessages((prev) => [...prev, msg]);
        setIsUserSpeaking(false);
      } else if (event.source === 'ai' || event.type === 'agent_response') {
        const msg = createMessage(conversationIdRef.current, 'assistant', event.message);
        setMessages((prev) => [...prev, msg]);
        setIsAISpeaking(false);
      }
    },
    onConnect: () => {
      // Session connected — phase should already be 'active'
    },
    onDisconnect: () => {
      // If conversation is still active, the session was interrupted
      if (phaseRef.current === 'active') {
        setError('Voice session disconnected unexpectedly');
      }
      setIsAISpeaking(false);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Voice error: ${message}`);
      setIsAISpeaking(false);
    },
  };

  // Stable references that delegate to the mutable ref — safe to pass
  // to ElevenLabs useConversation() without causing re-initialisation.
  const voiceHandlers = useRef<VoiceHandlers>({
    onMessage: (msg) => voiceHandlersRef.current.onMessage(msg),
    onConnect: () => voiceHandlersRef.current.onConnect(),
    onDisconnect: () => voiceHandlersRef.current.onDisconnect(),
    onError: (err) => voiceHandlersRef.current.onError(err),
  }).current;

  // --- setVoiceSession ---

  const setVoiceSession = useCallback((session: VoiceSession) => {
    voiceSessionRef.current = session;
  }, []);

  // --- Actions ---

  const startConversation = useCallback(async (params: StartParams) => {
    if (phase !== 'idle') return;

    setError(null);
    setPhase('starting');
    setMode(params.mode);
    setTopicPrompt(params.topicPrompt);
    setTopicCategory(params.topicCategory ?? null);
    setDuration(0);
    setMessages([]);
    setCurrentStreamingText('');

    const id = uuidv4();
    setConversationId(id);
    conversationIdRef.current = id;

    // Insert conversation record
    insertConversation(db, {
      id,
      status: 'active',
      mode: params.mode,
      topic_category: params.topicCategory ?? null,
      topic_prompt: params.topicPrompt,
      started_at: new Date().toISOString(),
      ended_at: null,
      duration_seconds: null,
      elevenlabs_conversation_id: null,
      synced_at: null,
    });

    const promptParams = buildPromptParams(params.topicPrompt, params.topicCategory);

    try {
      if (params.mode === 'voice') {
        // Start ElevenLabs session
        const session = voiceSessionRef.current;
        if (!session) {
          throw new Error('Voice session not available. Ensure ElevenLabs hook is connected.');
        }

        const sessionConfig = buildSessionConfig(promptParams);
        const elConvId = await session.startSession(sessionConfig);

        updateConversation(db, id, { elevenlabs_conversation_id: elConvId });
      } else {
        // Text mode: show topic prompt as first assistant message
        const firstMsg = createMessage(id, 'assistant', params.topicPrompt);
        setMessages([firstMsg]);
      }

      setPhase('active');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setPhase('idle');
      // Clean up the DB record
      updateConversation(db, id, { status: 'ended', ended_at: new Date().toISOString() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildPromptParams/createMessage use db & profile which are listed
  }, [phase, db]);

  const resumeConversation = useCallback((convId: string) => {
    if (phase !== 'idle') return;

    const conv = getConversationRecord(db, convId);
    if (!conv || conv.status !== 'active') return;

    setConversationId(conv.id);
    conversationIdRef.current = conv.id;
    setMode(conv.mode);
    setTopicPrompt(conv.topic_prompt);
    setTopicCategory(conv.topic_category);

    const msgs = getMessagesByConversation(db, convId);
    setMessages(msgs);
    messagesRef.current = msgs;

    setPhase('active');
  }, [phase, db]);

  const sendTextMessage = useCallback(async (text: string) => {
    if (phase !== 'active' || mode !== 'text' || !conversationIdRef.current) return;

    const convId = conversationIdRef.current;

    // Insert user message
    const userMsg = createMessage(convId, 'user', text);
    setMessages((prev) => [...prev, userMsg]);
    setCurrentStreamingText('');

    // Build history from current messages + new user message
    const allMessages = [...messagesRef.current, userMsg];
    const history = buildConversationHistory(allMessages);

    const promptParams = buildPromptParams(
      topicPrompt ?? '',
      topicCategory ?? undefined,
    );
    const systemPrompt = buildTextSystemPrompt(promptParams);

    // Create abort controller for this stream
    const controller = new AbortController();
    abortRef.current = controller;

    let streamedText = '';

    await streamMessage({
      messages: history,
      systemPrompt,
      onChunk: (chunk) => {
        streamedText += chunk;
        setCurrentStreamingText(streamedText);
      },
      onComplete: (fullText) => {
        setCurrentStreamingText('');
        if (fullText) {
          const assistantMsg = createMessage(convId, 'assistant', fullText);
          setMessages((prev) => [...prev, assistantMsg]);
        }
        abortRef.current = null;
      },
      onError: (err) => {
        setCurrentStreamingText('');
        setError(err.message);
        abortRef.current = null;
      },
      signal: controller.signal,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildPromptParams/createMessage close over db which is listed
  }, [phase, mode, topicPrompt, topicCategory, db]);

  const switchMode = useCallback(async (newMode: ConversationMode) => {
    if (phase !== 'active' || mode === newMode) return;

    try {
      if (mode === 'voice' && newMode === 'text') {
        // Voice → Text: end ElevenLabs session
        await voiceSessionRef.current?.endSession();
        setMode('text');
        updateConversation(db, conversationIdRef.current!, { mode: 'text' });
      } else if (mode === 'text' && newMode === 'voice') {
        // Text → Voice: abort any in-flight stream, start ElevenLabs session
        abortRef.current?.abort();
        abortRef.current = null;
        setCurrentStreamingText('');

        const session = voiceSessionRef.current;
        if (!session) {
          throw new Error('Voice session not available.');
        }

        // Rebuild prompt with conversation history context
        const promptParams = buildPromptParams(
          topicPrompt ?? '',
          topicCategory ?? undefined,
        );
        const sessionConfig = buildSessionConfig(promptParams);
        const elConvId = await session.startSession(sessionConfig);

        setMode('voice');
        updateConversation(db, conversationIdRef.current!, {
          mode: 'voice',
          elevenlabs_conversation_id: elConvId,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Mode switch failed: ${message}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildPromptParams closes over db which is listed
  }, [phase, mode, topicPrompt, topicCategory, db]);

  const endConversation = useCallback(async () => {
    if (phase !== 'active' || !conversationIdRef.current) return;

    setPhase('ending');

    try {
      // Stop active session/stream
      if (mode === 'voice') {
        await voiceSessionRef.current?.endSession();
      } else {
        abortRef.current?.abort();
        abortRef.current = null;
        setCurrentStreamingText('');
      }

      const now = new Date().toISOString();
      const durationSeconds = startedAtRef.current
        ? Math.floor((Date.now() - startedAtRef.current) / 1000)
        : duration;

      const convId = conversationIdRef.current;

      // Update conversation record
      updateConversation(db, convId, {
        status: 'ended',
        ended_at: now,
        duration_seconds: durationSeconds,
      });

      // Sync messages to Supabase (best-effort batch insert)
      try {
        const localMessages = getMessagesByConversation(db, convId);
        if (localMessages.length > 0) {
          const { error: syncError } = await supabase.from('messages').upsert(
            localMessages.map((m) => ({
              id: m.id,
              conversation_id: m.conversation_id,
              role: m.role,
              content: m.content,
              audio_url: m.audio_url,
              timestamp: m.timestamp,
            })),
            { onConflict: 'id' },
          );
          if (!syncError) {
            const syncedAt = new Date().toISOString();
            const placeholders = localMessages.map(() => '?').join(',');
            db.runSync(
              `UPDATE messages SET synced_at = ? WHERE id IN (${placeholders})`,
              [syncedAt, ...localMessages.map((m) => m.id)],
            );
          }
        }

        // Sync conversation to Supabase
        const userId = profile?.id;
        if (userId) {
          await supabase.from('conversations').upsert({
            id: convId,
            user_id: userId,
            status: 'ended',
            mode,
            topic_category: topicCategory,
            topic_prompt: topicPrompt,
            started_at: startedAtRef.current
              ? new Date(startedAtRef.current).toISOString()
              : now,
            ended_at: now,
            duration_seconds: durationSeconds,
          });
        }
      } catch {
        // Sync failure is non-fatal — messages are still in SQLite
      }

      // Create local blog_post record with status 'generating'
      const blogPostId = uuidv4();
      try {
        insertBlogPost(db, {
          id: blogPostId,
          conversation_id: convId,
          title: '',
          content: '',
          summary: null,
          tags: '[]',
          share_slug: null,
          share_enabled: 0,
          status: 'generating',
          generated_at: null,
          edited_at: null,
          synced_at: null,
        });
      } catch {
        // Blog post insert failure is non-fatal
      }

      // Fire-and-forget: invoke blog generation edge function
      supabase.functions
        .invoke('generate-blog-post', {
          body: { conversation_id: convId },
        })
        .catch(() => {
          // Edge function failure is non-fatal — handled by sync layer
        });

      setPhase('ended');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to end conversation: ${message}`);
      setPhase('ended');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- profile accessed via ref-like closure, db is listed
  }, [phase, mode, duration, db, topicPrompt, topicCategory]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      voiceSessionRef.current?.setVolume({ volume: next ? 0 : 1 });
      return next;
    });
  }, []);

  return {
    // State
    phase,
    mode,
    conversationId,
    messages,
    isAISpeaking,
    isUserSpeaking,
    currentStreamingText,
    error,

    // Actions
    startConversation,
    resumeConversation,
    sendTextMessage,
    switchMode,
    endConversation,
    toggleMute,

    // Voice-specific
    isMuted,
    voiceAmplitude,

    // Metadata
    duration,
    topicPrompt,
    topicCategory,

    // ElevenLabs integration
    voiceHandlers,
    setVoiceSession,
  };
}
