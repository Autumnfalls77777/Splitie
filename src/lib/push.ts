import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  AndroidImportance,
  getExpoPushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

let handlerConfigured = false;
let channelConfigured = false;
let registeredToken: string | null = null;

function configureForegroundHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || channelConfigured) return;
  await setNotificationChannelAsync('settlements', {
    name: 'Settle-up reminders',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#C9F25B',
    sound: 'default',
  });
  channelConfigured = true;
}

/**
 * Requests permission and registers the Expo push token with Supabase.
 * Returns null on simulators, web, denied permission, or missing Firebase
 * config. Callers should treat push as best-effort.
 */
export async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    if (!Device.isDevice) return null;

    configureForegroundHandler();
    await ensureAndroidChannel();

    const existing = await getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const requested = await requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return null;

    const token = await getExpoPushTokenAsync({ projectId });
    if (!supabase || !token.data) return null;

    const { error } = await supabase.rpc('register_push_token', {
      p_token: token.data,
      p_platform: Platform.OS,
    });
    if (error) return null;
    registeredToken = token.data;
    return token.data;
  } catch {
    return null;
  }
}

/** Best-effort removal while the session is still valid. */
export async function unregisterPushToken(): Promise<void> {
  try {
    if (!supabase) return;
    let token = registeredToken;
    if (!token && Platform.OS !== 'web' && Device.isDevice) {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      if (projectId) token = (await getExpoPushTokenAsync({ projectId })).data;
    }
    if (!token) return;
    await supabase.rpc('unregister_push_token', { p_token: token });
    registeredToken = null;
  } catch {
    // A stale token is harmless; the next sign-in reassigns it.
  }
}
