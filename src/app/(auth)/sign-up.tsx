import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText, ThemedView, Button, TextInput } from '@/components/ui';

export default function SignUpScreen() {
  const { signUpWithEmail } = useAuth();
  const { colors, spacing } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValid = displayName.trim().length > 0 && email.trim().length > 0 && password.length >= 8;

  const handleSignUp = async () => {
    if (!isValid) return;
    setError(null);
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, displayName.trim());
    } catch (err: any) {
      setError(err?.message ?? 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
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
              Start your journey.
            </ThemedText>
          </View>

          <View style={[styles.form, { gap: spacing.md }]}>
            <TextInput
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="What should we call you?"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />

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

            <View>
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <ThemedText
                variant="caption"
                color="tertiary"
                style={{ marginTop: 4 }}
              >
                Minimum 8 characters
              </ThemedText>
            </View>

            {error && (
              <ThemedText
                variant="caption"
                style={{ color: colors.accent }}
              >
                {error}
              </ThemedText>
            )}

            <Button
              label="Sign Up"
              onPress={handleSignUp}
              loading={loading}
              disabled={!isValid}
              style={{ marginTop: spacing.sm }}
            />
          </View>

          <View style={[styles.footer, { marginTop: spacing.xl }]}>
            <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
              <ThemedText variant="uiSmall" color="secondary" style={styles.footerText}>
                Already have an account?{' '}
                <ThemedText variant="uiSmall" color="accent">
                  Sign in
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
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
});
