import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettingsStore } from '@/features/settings/settings.store';


function enabled(): boolean {
  return Platform.OS !== 'web' && useSettingsStore.getState().hapticsEnabled;
}


export function hapticTap() {
  if (!enabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}


export function hapticSelect() {
  if (!enabled()) return;
  Haptics.selectionAsync().catch(() => {});
}


export function hapticSuccess() {
  if (!enabled()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}


export function hapticWarning() {
  if (!enabled()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}


export function hapticError() {
  if (!enabled()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}


export function hapticHeavy() {
  if (!enabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}


export function hapticMedium() {
  if (!enabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}