import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText, ThemedView, Button, TextInput } from '@/components/ui';

export default function SignInScreen() {
  const { signInWithEmail, signInWithApple } = useAuth();
  const { colors, spacing, typography } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: any) {
      setError(err?.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      setError(err?.message ?? 'Apple Sign In failed. Please try again.');
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: spacing.contentPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ThemedText variant="display" style={styles.brand}>
              tief.
            </ThemedText>
            <ThemedText variant="title" color="secondary" style={{ marginTop: spacing.sm }}>
              Welcome back.
            </ThemedText>
          </View>

          <View style={[styles.form, { gap: spacing.md }]}>
            {Platform.OS === 'ios' && (
              <>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={8}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />

                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <ThemedText variant="caption" color="tertiary" style={styles.dividerText}>
                    or continue with email
                  </ThemedText>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>
              </>
            )}

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />

            {error && (
              <ThemedText
                variant="caption"
                style={{ color: colors.accent }}
              >
                {error}
              </ThemedText>
            )}

            <Button
              label="Sign In"
              onPress={handleEmailSignIn}
              loading={loading}
              disabled={!email.trim() || !password}
              style={{ marginTop: spacing.sm }}
            />
          </View>

          <View style={[styles.footer, { marginTop: spacing.xl }]}>
            <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
              <ThemedText variant="uiSmall" color="secondary" style={styles.footerText}>
                Don't have an account?{' '}
                <ThemedText variant="uiSmall" color="accent">
                  Sign up
                </ThemedText>
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brand: {
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    marginHorizontal: 12,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
});
