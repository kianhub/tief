/**
 * Claude API proxy helper module.
 *
 * Handles text conversation with Claude via the Supabase `proxy-claude`
 * edge function. Provides SSE streaming, conversation history formatting,
 * and system prompt construction for text mode conversations.
 */

import { supabase } from './supabase';
import { buildSystemPrompt } from './prompt-builder';
import { Config } from '@/constants/config';
import type { PromptParams } from './prompt-builder';
import type { Message } from '@/types';

// Re-export for convenience
export type { PromptParams };

// --- Types ---

export interface StreamParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemPrompt: string;
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

// --- Functions ---

/**
 * Sends a message to Claude via the Supabase proxy and streams the response.
 *
 * The proxy edge function (`proxy-claude`) handles authentication and forwards
 * requests to the Claude API in SSE format. This function reads the stream
 * incrementally, parsing `data:` lines for text deltas and calling `onChunk`
 * for each piece. When the stream completes, `onComplete` is called with the
 * full accumulated text.
 */
export async function streamMessage(params: StreamParams): Promise<void> {
  const { messages, systemPrompt, onChunk, onComplete, onError, signal } = params;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      onError(new Error('Not authenticated. Please sign in again.'));
      return;
    }

    const response = await fetch(`${Config.SUPABASE_URL}/functions/v1/proxy-claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        messages,
        system_prompt: systemPrompt,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      onError(new Error(`Claude API error (${response.status}): ${errorText}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError(new Error('Response body is not readable'));
      return;
    }

    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE: split on double newlines, process each event
      const parts = buffer.split('\n\n');
      // Keep the last (potentially incomplete) part in the buffer
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const lines = part.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6); // Remove 'data: ' prefix

          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };

            // Claude SSE format: content_block_delta events contain text
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta' &&
              parsed.delta.text
            ) {
              accumulated += parsed.delta.text;
              onChunk(parsed.delta.text);
            }
          } catch {
            // Non-JSON data lines (e.g. event metadata) — skip
          }
        }
      }
    }

    // Flush any remaining buffer
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (
            parsed.type === 'content_block_delta' &&
            parsed.delta?.type === 'text_delta' &&
            parsed.delta.text
          ) {
            accumulated += parsed.delta.text;
            onChunk(parsed.delta.text);
          }
        } catch {
          // skip
        }
      }
    }

    onComplete(accumulated);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Stream was intentionally aborted — call onComplete with what we have
      onComplete('');
      return;
    }
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Converts local Message records to Claude API message format.
 *
 * Filters out any messages that are not 'user' or 'assistant' role,
 * and returns a clean array of `{ role, content }` objects suitable
 * for the Claude `/v1/messages` API.
 */
export function buildConversationHistory(
  messages: Message[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
}

/**
 * Builds the system prompt for text-mode conversations.
 *
 * Delegates to the shared `buildSystemPrompt` from prompt-builder.ts,
 * which is the same template used by ElevenLabs voice mode. This ensures
 * consistent AI personality across both conversation modes.
 */
export function buildTextSystemPrompt(params: PromptParams): string {
  return buildSystemPrompt(params);
}
