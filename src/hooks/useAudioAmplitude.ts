import { useEffect, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export interface UseAudioAmplitudeReturn {
  amplitude: SharedValue<number>; // 0-1, smoothed
  isUserSpeaking: boolean;
  isAISpeaking: boolean;
}

export interface UseAudioAmplitudeOptions {
  /** Whether a voice conversation is currently active */
  isActive: boolean;
  /** AI is currently producing speech output */
  isAISpeaking: boolean;
  /** User is currently speaking (mic input detected) */
  isUserSpeaking: boolean;
  /** Optional raw volume level (0-1) from ElevenLabs SDK audio events */
  rawVolume?: number;
}

/**
 * Bridges ElevenLabs SDK audio events to a reanimated shared value.
 *
 * Primary path: if `rawVolume` is provided, applies exponential moving
 * average smoothing (0.7 old + 0.3 new) and writes to the shared value.
 *
 * Fallback path: when no raw volume data is available, simulates
 * amplitude with a gentle composite sine wave while in active states
 * (listening or speaking). Decays to 0 when idle.
 */
export function useAudioAmplitude({
  isActive,
  isAISpeaking: aiSpeaking,
  isUserSpeaking: userSpeaking,
  rawVolume,
}: UseAudioAmplitudeOptions): UseAudioAmplitudeReturn {
  const amplitude = useSharedValue(0);
  const smoothedRef = useRef(0);
  const sinePhaseRef = useRef(0);
  const rawVolumeRef = useRef(rawVolume);

  // Keep raw volume ref in sync without triggering effect
  rawVolumeRef.current = rawVolume;

  const isUserSpeakingActive = isActive && userSpeaking;
  const isAISpeakingActive = isActive && aiSpeaking;
  const isAnyActive = isUserSpeakingActive || isAISpeakingActive;

  useEffect(() => {
    let frameId: number;

    if (isAnyActive) {
      const animate = () => {
        const raw = rawVolumeRef.current;

        if (raw !== undefined && raw > 0) {
          // Real data path: exponential moving average
          smoothedRef.current = smoothedRef.current * 0.7 + raw * 0.3;
        } else {
          // Fallback: composite sine wave simulation
          sinePhaseRef.current += 0.08;
          const base = isAISpeakingActive ? 0.35 : 0.25;
          const variance = isAISpeakingActive ? 0.25 : 0.15;
          const simulated =
            base +
            variance * Math.sin(sinePhaseRef.current) +
            variance * 0.4 * Math.sin(sinePhaseRef.current * 2.7);
          smoothedRef.current = smoothedRef.current * 0.7 + simulated * 0.3;
        }

        amplitude.value = Math.min(1, Math.max(0, smoothedRef.current));
        frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
    } else {
      // Decay to 0 when idle
      const decay = () => {
        if (smoothedRef.current > 0.01) {
          smoothedRef.current *= 0.85;
          amplitude.value = smoothedRef.current;
          frameId = requestAnimationFrame(decay);
        } else {
          smoothedRef.current = 0;
          amplitude.value = 0;
        }
      };
      frameId = requestAnimationFrame(decay);
    }

    return () => cancelAnimationFrame(frameId);
  }, [isAnyActive, isAISpeakingActive, amplitude]);

  return {
    amplitude,
    isUserSpeaking: isUserSpeakingActive,
    isAISpeaking: isAISpeakingActive,
  };
}
