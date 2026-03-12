export interface Voice {
  id: string;
  label: string;
  gender: 'female' | 'male';
  energy: string;
  description: string;
}

export const VOICES: Voice[] = [
  {
    id: 'voice_placeholder_1',
    label: 'Warm & Thoughtful',
    gender: 'female',
    energy: 'Medium',
    description: 'A warm, thoughtful voice that feels like a close friend sharing an insight.',
  },
  {
    id: 'voice_placeholder_2',
    label: 'Calm & Curious',
    gender: 'male',
    energy: 'Low-Med',
    description: 'A calm, curious voice with a meditative quality.',
  },
  {
    id: 'voice_placeholder_3',
    label: 'Energetic & Friendly',
    gender: 'female',
    energy: 'High',
    description: 'An upbeat, energetic voice that keeps listeners engaged.',
  },
  {
    id: 'voice_placeholder_4',
    label: 'Gentle & Reflective',
    gender: 'female',
    energy: 'Low',
    description: 'A gentle, reflective voice suited for introspective topics.',
  },
  {
    id: 'voice_placeholder_5',
    label: 'Grounded & Direct',
    gender: 'male',
    energy: 'Medium',
    description: 'A grounded, direct voice that communicates with clarity and confidence.',
  },
  {
    id: 'voice_placeholder_6',
    label: 'Playful & Witty',
    gender: 'male',
    energy: 'Medium-High',
    description: 'A playful, witty voice with a conversational and humorous tone.',
  },
  {
    id: 'voice_placeholder_7',
    label: 'Soft & Intimate',
    gender: 'female',
    energy: 'Low',
    description: 'A soft, intimate voice that creates a personal, close listening experience.',
  },
  {
    id: 'voice_placeholder_8',
    label: 'Steady & Reassuring',
    gender: 'male',
    energy: 'Low-Med',
    description: 'A steady, reassuring voice that feels trustworthy and composed.',
  },
  {
    id: 'voice_placeholder_9',
    label: 'Bright & Engaging',
    gender: 'female',
    energy: 'Medium-High',
    description: 'A bright, engaging voice with natural enthusiasm and warmth.',
  },
  {
    id: 'voice_placeholder_10',
    label: 'Deep & Considered',
    gender: 'male',
    energy: 'Low-Med',
    description: 'A deep, considered voice with gravitas and thoughtful pacing.',
  },
] as const;

export const VOICE_SETTINGS = {
  stability: 0.4,
  similarity_boost: 0.75,
  style: 0.2,
  use_speaker_boost: true,
} as const;
