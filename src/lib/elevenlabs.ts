import { Config } from '@/constants/config';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import type { PromptParams } from '@/lib/prompt-builder';

// Re-export for consumers that imported from here
export type { PromptParams };

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
