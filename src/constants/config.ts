// Environment configuration
// These values must be filled in after setting up external services.
// See /useractions/ for setup instructions.

export const Config = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '__SUPABASE_URL__',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '__SUPABASE_ANON_KEY__',
  ELEVENLABS_AGENT_ID: process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID || '__ELEVENLABS_AGENT_ID__',
} as const;
