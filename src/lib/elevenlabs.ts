import { Config } from '@/constants/config';
import type { TopicCategory } from '@/types';

// --- Types ---

export interface PromptParams {
  topicPrompt: string;
  topicCategory: string;
  userName: string;
  userInterests: string[];
  recentThemes: string[];
}

export interface SessionConfig {
  agentId: string;
  overrides: {
    agent: {
      prompt: { prompt: string };
      firstMessage: string;
    };
  };
}

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Constructs the full system prompt per product spec §6.1.
 *
 * Fills in all `{{placeholders}}` with the provided params to create
 * the tief. AI personality prompt used by both ElevenLabs (voice) and
 * Claude API (text) conversation modes.
 */
export function buildSystemPrompt(params: PromptParams): string {
  const {
    topicPrompt,
    topicCategory,
    userName,
    userInterests,
    recentThemes,
  } = params;

  return `You are tief. — a thoughtful, curious conversation partner. You're having a
real conversation with someone, not interviewing them. You have your own perspectives,
you share relevant stories and ideas, and you genuinely engage with what they say.

PERSONALITY:
- Warm but intellectually rigorous
- Curious — you ask follow-up questions that go deeper, not wider
- You have opinions and share them, but you're open to being persuaded
- You use humor naturally when appropriate
- You're comfortable with pauses and silence
- You never feel like a chatbot — no "great question!" or "that's interesting!"

CONVERSATION STYLE:
- Keep responses conversational length (2-4 sentences for voice, slightly longer for text)
- Build on what the person says — reference their earlier points
- Share relevant anecdotes, thought experiments, or references
- Occasionally challenge their assumptions gently
- If the conversation goes somewhere unexpected, follow it
- Don't force the topic — organic tangents are good

TOPIC CONTEXT:
The conversation was started with this prompt: ${topicPrompt}
Category: ${topicCategory}

USER CONTEXT:
Name: ${userName}
Interests: ${userInterests.join(', ')}
Past conversation themes: ${recentThemes.length > 0 ? recentThemes.join(', ') : 'None yet'}

IMPORTANT:
- This is a CONVERSATION, not an interview. Don't just ask questions.
  Share your own thoughts, then invite theirs.
- Vary your response types: sometimes a question, sometimes a story,
  sometimes a provocation, sometimes agreement with added nuance.
- If the conversation naturally reaches a conclusion or the person seems
  ready to wrap up, say something like "This has been a great conversation"
  and let it end naturally.`;
}

/**
 * Builds the ElevenLabs session override config for starting a voice conversation.
 *
 * Returns a config object with the agent ID, built system prompt injected
 * as the agent prompt override, and the topic prompt as the first message
 * the AI speaks when the session begins.
 */
export function buildSessionConfig(params: PromptParams): SessionConfig {
  const systemPrompt = buildSystemPrompt(params);

  return {
    agentId: Config.ELEVENLABS_AGENT_ID,
    overrides: {
      agent: {
        prompt: { prompt: systemPrompt },
        firstMessage: params.topicPrompt,
      },
    },
  };
}

/**
 * Collects ElevenLabs `onMessage` events into a structured transcript.
 *
 * The ElevenLabs SDK emits message events during a conversation with
 * various types (transcription, agent reply, etc.). This utility filters
 * for user transcriptions and agent responses, returning them as an
 * ordered array of `{ role, content, timestamp }` entries suitable for
 * storage and display.
 */
export function extractTranscriptFromEvents(
  events: Array<{ source?: string; message?: string; type?: string }>
): TranscriptEntry[] {
  const transcript: TranscriptEntry[] = [];

  for (const event of events) {
    // ElevenLabs onMessage events have a `source` field indicating
    // whether the message came from the user (transcription) or the AI (agent)
    if (!event.message) continue;

    if (event.source === 'user' || event.type === 'user_transcript') {
      transcript.push({
        role: 'user',
        content: event.message,
        timestamp: new Date().toISOString(),
      });
    } else if (event.source === 'ai' || event.type === 'agent_response') {
      transcript.push({
        role: 'assistant',
        content: event.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return transcript;
}
