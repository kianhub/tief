import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { TopicCategory, NotificationFrequency } from '@/types';

export interface NotificationTime {
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

interface OnboardingState {
  interests: Set<TopicCategory>;
  notificationTimes: NotificationTime[];
  notificationFrequency: NotificationFrequency;
  selectedVoiceId: string;
  defaultMode: 'voice' | 'text';
}

interface OnboardingContextType extends OnboardingState {
  setInterests: (interests: Set<TopicCategory>) => void;
  setNotificationTimes: (times: NotificationTime[]) => void;
  setNotificationFrequency: (freq: NotificationFrequency) => void;
  setSelectedVoiceId: (id: string) => void;
  setDefaultMode: (mode: 'voice' | 'text') => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const DEFAULT_NOTIFICATION_TIMES: NotificationTime[] = [
  { label: 'Morning', hour: 9, minute: 0, enabled: true },
  { label: 'Afternoon', hour: 14, minute: 0, enabled: false },
  { label: 'Evening', hour: 19, minute: 0, enabled: false },
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [interests, setInterests] = useState<Set<TopicCategory>>(new Set());
  const [notificationTimes, setNotificationTimes] = useState<NotificationTime[]>(DEFAULT_NOTIFICATION_TIMES);
  const [notificationFrequency, setNotificationFrequency] = useState<NotificationFrequency>('daily');
  const [selectedVoiceId, setSelectedVoiceId] = useState('voice_placeholder_1');
  const [defaultMode, setDefaultMode] = useState<'voice' | 'text'>('text');

  const value = useMemo<OnboardingContextType>(
    () => ({
      interests,
      notificationTimes,
      notificationFrequency,
      selectedVoiceId,
      defaultMode,
      setInterests,
      setNotificationTimes,
      setNotificationFrequency,
      setSelectedVoiceId,
      setDefaultMode,
    }),
    [interests, notificationTimes, notificationFrequency, selectedVoiceId, defaultMode],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextType {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
