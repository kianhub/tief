import { useEffect } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { ElevenLabsProvider } from '@elevenlabs/react-native';

import { ThemeProvider } from '@/hooks/useTheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { DatabaseProvider } from '@/lib/db-context';

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

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
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
