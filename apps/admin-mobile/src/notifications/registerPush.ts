import { Platform } from 'react-native';

import type { ApiClient } from '@caratom/api-client';

type Surface = 'customer' | 'technician' | 'admin_mobile';

export async function registerPush(api: ApiClient, surface: Surface): Promise<void> {
  try {
    const Notifications = await import('expo-notifications');
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status !== 'granted') return;
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await api.putDevicePushToken({
      app_surface: surface,
      expo_push_token: token.data,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch {
    return;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  try {
    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    if (!current.canAskAgain) return false;
    const next = await Notifications.requestPermissionsAsync();
    return next.status === 'granted';
  } catch {
    return false;
  }
}
