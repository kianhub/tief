# TIEF-04: Authentication Flow

> Implement auth context, sign-in/sign-up screens, and auth routing guards using Supabase Auth.

## Prerequisites
- TIEF-03 completed (Supabase client, types, DB initialized)

## Reference
- Product spec §3.5 (Auth: email + Apple Sign In)
- Product spec §5 (Navigation structure)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `@supabase/supabase-js` for auth methods (`signInWithPassword`, `signInWithIdToken`, `onAuthStateChange`). Look up `expo-apple-authentication` for Apple Sign In. Look up `expo-router` for `<Slot>`, `<Redirect>`, route groups, and layout patterns.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for Expo Router layout patterns, auth guard routing, and provider stacking in root layout.

---

- [x] **Create AuthContext provider in `src/lib/auth-context.tsx`.** *Completed: full auth lifecycle with session restore, onAuthStateChange, email/password sign-in/up, Apple Sign In via signInWithIdToken, sign-out, and profile fetch/create.* This manages the full auth lifecycle:

```typescript
interface AuthContextType {
  user: User | null;             // Supabase auth user
  profile: Profile | null;       // User's profile from profiles table
  session: Session | null;       // Supabase session
  isLoading: boolean;            // True while checking initial session
  isOnboarded: boolean;          // profile?.onboarding_completed
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

Implementation details:
1. On mount, call `supabase.auth.getSession()` to restore existing session
2. Subscribe to `supabase.auth.onAuthStateChange` for session changes
3. When a session exists, fetch the profile from Supabase. If no profile exists (new user), create one with `INSERT INTO profiles` using the user's ID
4. `signInWithEmail` calls `supabase.auth.signInWithPassword`
5. `signUpWithEmail` calls `supabase.auth.signUp`, then creates a profile record
6. `signInWithApple` uses `expo-apple-authentication` to get Apple credentials, then calls `supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken })`
7. `signOut` calls `supabase.auth.signOut` and clears state
8. `refreshProfile` re-fetches the profile from Supabase
9. `isOnboarded` is derived from `profile?.onboarding_completed ?? false`

Wrap children in `AuthContext.Provider`. Export `AuthProvider` and `useAuth` hook.

Handle errors gracefully — catch auth errors and log them. Do NOT crash the app on auth failure.

- [x] **Create sign-in screen at `src/app/(auth)/sign-in.tsx` and sign-up screen at `src/app/(auth)/sign-up.tsx`.** *Completed: minimal centered layouts with display serif branding, Apple Sign In button (iOS), email/password forms, inline error display, loading states, and navigation links between screens.* Also create the auth layout at `src/app/(auth)/_layout.tsx`.

**`(auth)/_layout.tsx`:**
- Simple Stack layout with no headers (`headerShown: false`)
- Wrap in `ThemedView` with background color

**`sign-in.tsx`:**
- Warm, minimal design per spec §2.0 anti-patterns (no gradients, no sparkles)
- Layout: centered content, generous whitespace
- Top: "tief." in display serif typography, centered
- Below: "Welcome back." in title typography
- Apple Sign In button (use `AppleAuthentication.AppleAuthenticationButton` from `expo-apple-authentication` on iOS)
- Divider with "or continue with email"
- Email input field (themed TextInput)
- Password input field (themed TextInput, secureTextEntry)
- Sign In button (primary Button component)
- Bottom: "Don't have an account? Sign up" link → navigates to sign-up
- Show error messages inline (warm terracotta accent color for errors)
- Loading state on buttons while authenticating

**`sign-up.tsx`:**
- Same layout style as sign-in
- Top: "tief." then "Start your journey."
- Display name input
- Email input
- Password input (with minimum 8 chars note)
- Sign Up button
- Bottom: "Already have an account? Sign in" link → navigates to sign-in
- After successful sign-up, the auth state change will automatically redirect

Use `useAuth()` hook for all auth operations. Use `router.replace` for navigation after auth. Import UI components from `@/components/ui`.

- [x] **Create auth and onboarding route guards in root layout.** *Completed: root layout with ThemeProvider > AuthProvider > DatabaseProvider > SplashGate, splash screen until auth resolves, index redirect route, auth/onboarding/tabs layouts with guard redirects, db-context.tsx with DatabaseProvider and useDatabase hook. `npx tsc --noEmit` passes.* Create `src/app/_layout.tsx`:

This is the root layout that wraps the entire app. It should:

1. Import and wrap with all providers in this order (outermost first):
   - `ThemeProvider` (from useTheme)
   - `AuthProvider` (from auth-context)
   - `DatabaseProvider` (create a simple provider that initializes the DB on mount and provides it via context — create `src/lib/db-context.tsx` with `DatabaseProvider` and `useDatabase` hook)

2. Use `expo-splash-screen` to keep splash visible until auth state is resolved (`isLoading === false`)

3. Render an `<Slot />` from expo-router

4. Create a `src/app/(auth)/_layout.tsx` that checks: if user is authenticated AND onboarded → redirect to `/(tabs)`. This prevents authed users from seeing auth screens.

5. Create a redirect component or use `useEffect` in the root:
   - No session → show `(auth)` routes
   - Session but not onboarded → show `(onboarding)` routes
   - Session and onboarded → show `(tabs)` routes

Use Expo Router's `<Redirect>` component or `router.replace()` for routing guards. The pattern should be:
- Root `_layout.tsx` renders `<Slot />`
- Each group layout `(auth)`, `(onboarding)`, `(tabs)` checks auth state and redirects if needed

Also create `src/lib/db-context.tsx`:
```typescript
// DatabaseProvider that initializes expo-sqlite on mount
// Provides db instance via React Context
// Shows nothing (or splash) until DB is ready
```

Verify the app compiles and the auth flow works: launch → splash → sign-in screen. `npx tsc --noEmit` should pass.
