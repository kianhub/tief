import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import { ThemedView } from '@/components/ui';

export default function OnboardingLayout() {
  const { user, isOnboarded } = useAuth();

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (isOnboarded) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemedView>
  );
}
