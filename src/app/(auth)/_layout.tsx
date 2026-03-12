import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import { ThemedView } from '@/components/ui';

export default function AuthLayout() {
  const { user, isOnboarded } = useAuth();

  // Authenticated and onboarded users should not see auth screens
  if (user && isOnboarded) {
    return <Redirect href="/(tabs)" />;
  }

  // Authenticated but not onboarded — go to onboarding
  if (user && !isOnboarded) {
    return <Redirect href="/(onboarding)" />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemedView>
  );
}
