import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Register for push notifications — checks device, permissions,
 * retrieves the Expo push token, and saves it to the user's profile.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Push doesn't work on simulator
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check / request permissions
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

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  const token = tokenData.data;

  // Save token to Supabase profile
  await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);

  return token;
}

/**
 * Configure how notifications appear when the app is foregrounded.
 * Call once on app start.
 */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Register notification categories with iOS action buttons.
 * Allows "Talk" (voice) and "Text" quick-actions on conversation prompts.
 */
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
