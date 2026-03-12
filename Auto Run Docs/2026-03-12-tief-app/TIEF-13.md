# TIEF-13: Push Notifications & Deep Linking

> Implement push notification registration, handling, notification categories with actions, and deep linking from notifications to conversations.

## Prerequisites
- TIEF-10 completed (conversation starter flow), TIEF-11 completed (dispatch-notifications edge function)

## Reference
- Product spec §7 (Push Notification System), §7.2 (Content), §7.3 (Actions)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `expo-notifications` for `getExpoPushTokenAsync`, `setNotificationCategoryAsync`, `addNotificationResponseReceivedListener`, `getLastNotificationResponseAsync`, and permission APIs. Look up `expo-constants` for `expoConfig.extra.eas.projectId`.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for deep linking configuration and notification-driven navigation patterns.
- **Skill: `expo-app-design:expo-dev-client`**: Reference — push notifications require a dev client build on a physical device, not Expo Go.

---

- [x] **Create push notification module at `src/lib/notifications.ts`.** This handles the complete notification lifecycle:

**Registration:**
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // 1. Check if physical device (push doesn't work on simulator)
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // 2. Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // 3. Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  const token = tokenData.data;

  // 4. Save token to Supabase profile
  await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);

  return token;
}
```

**Notification channel setup (call on app start):**
```typescript
export async function setupNotificationHandler() {
  // Set how notifications appear when app is foregrounded
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
```

**Notification categories (iOS actions) per spec §7.3:**
```typescript
export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('conversation_prompt', [
    {
      identifier: 'TALK_VOICE',
      buttonTitle: '🎤 Talk',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'TALK_TEXT',
      buttonTitle: '💬 Text',
      options: { opensAppToForeground: true },
    },
  ]);
}
```

Export all functions.

- [x] **Create notification response handler with deep linking at `src/lib/notification-handler.ts` and integrate into root layout.**

**Response handler:**
```typescript
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { startFromNotification } from './conversation-starter';

export function setupNotificationResponseListener() {
  // Handle notification taps (app was in background or killed)
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const actionId = response.actionIdentifier;

    if (data?.type === 'conversation_prompt') {
      const mode = actionId === 'TALK_TEXT' ? 'text' : 'voice';  // Default to voice
      startFromNotification({
        promptText: data.prompt_text as string,
        category: data.category as string,
        mode,
      });
    } else if (data?.type === 'blog_ready') {
      // Navigate to the blog post
      router.push(`/post/${data.blog_post_id}`);
    }
  });

  return subscription;
}

export function setupNotificationReceivedListener() {
  // Handle notifications received while app is in foreground
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    // Could update UI, show in-app banner, etc.
    // For MVP, the default handler (setupNotificationHandler) shows the system alert
    console.log('Notification received in foreground:', data);
  });

  return subscription;
}
```

**Integrate into root layout (`src/app/_layout.tsx`):**
Add to the root layout's `useEffect`:
```typescript
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
```

**Register for push notifications** after onboarding completes (in the voice-setup screen's final submit) and also on app start if user is already onboarded:
```typescript
// In root layout or auth provider, after auth is confirmed:
if (user && profile?.onboarding_completed) {
  registerForPushNotifications(user.id);
}
```

**Deep link URL scheme:**
Update `src/app/conversation/[id].tsx` to handle the `new` case when coming from a notification — the `startFromNotification` helper already navigates with the right params.

**Handle app opened from killed state via notification:**
Use `Notifications.getLastNotificationResponseAsync()` in root layout to check if app was opened from a notification:
```typescript
useEffect(() => {
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      // Handle same as notification response listener
      handleNotificationResponse(response);
    }
  });
}, []);
```

Verify notification registration flow works (it will fully work only on a physical device after EAS setup per useractions). `npx tsc --noEmit` should pass.
