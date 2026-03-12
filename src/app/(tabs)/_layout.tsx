import { Redirect, Slot } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

export default function TabsLayout() {
  const { user, isOnboarded } = useAuth();

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!isOnboarded) {
    return <Redirect href="/(onboarding)" />;
  }

  // Placeholder — will be replaced with proper tab navigation later
  return <Slot />;
}
