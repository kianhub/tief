import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

export default function IndexRoute() {
  const { user, isOnboarded } = useAuth();

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!isOnboarded) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
