import { useEffect } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import { ElevenLabsProvider } from '@elevenlabs/react-native';

import { ThemeProvider } from '@/hooks/useTheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { DatabaseProvider } from '@/lib/db-context';
import {
  setupNotificationHandler,
  setupNotificationCategories,
  registerForPushNotifications,
} from '@/lib/notifications';
import {
  handleNotificationResponse,
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
} from '@/lib/notification-handler';

// Keep splash visible until we know auth state
SplashScreen.preventAutoHideAsync();

function SplashGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) return null;

  return <>{children}</>;
}

/**
 * Sets up notification listeners and registers for push if the user is onboarded.
 * Must be rendered inside AuthProvider so it can read auth state.
 */
function NotificationSetup() {
  const { user, isOnboarded } = useAuth();

  // Set up notification handler, categories, and listeners on mount
  useEffect(() => {
    setupNotificationHandler();
    setupNotificationCategories();

    const responseSubscription = setupNotificationResponseListener();
    const receivedSubscription = setupNotificationReceivedListener();

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);

  // Handle cold-start: app was opened from a killed state via notification tap
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });
  }, []);

  // Register for push notifications once user is authenticated and onboarded
  useEffect(() => {
    if (user && isOnboarded) {
      registerForPushNotifications(user.id);
    }
  }, [user, isOnboarded]);

  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationSetup />
        <DatabaseProvider>
          <ElevenLabsProvider>
            <SplashGate>
              <Slot />
            </SplashGate>
          </ElevenLabsProvider>
        </DatabaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
