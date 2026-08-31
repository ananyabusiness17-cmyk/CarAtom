import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const CHUNK = 1800;

async function getItem(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(`${key}.n`);
  if (!countRaw) {
    return SecureStore.getItemAsync(key);
  }
  const count = Number(countRaw);
  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    parts.push((await SecureStore.getItemAsync(`${key}.${index}`)) ?? '');
  }
  return parts.join('');
}

async function setItem(key: string, value: string): Promise<void> {
  await removeItem(key);
  if (value.length <= CHUNK) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  const count = Math.ceil(value.length / CHUNK);
  await SecureStore.setItemAsync(`${key}.n`, String(count));
  for (let index = 0; index < count; index += 1) {
    await SecureStore.setItemAsync(
      `${key}.${index}`,
      value.slice(index * CHUNK, (index + 1) * CHUNK),
    );
  }
}

async function removeItem(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(`${key}.n`);
  if (countRaw) {
    const count = Number(countRaw);
    await SecureStore.deleteItemAsync(`${key}.n`);
    for (let index = 0; index < count; index += 1) {
      await SecureStore.deleteItemAsync(`${key}.${index}`);
    }
  }
  await SecureStore.deleteItemAsync(key);
}

const ExpoSecureStoreAdapter = {
  getItem,
  setItem,
  removeItem,
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey !== 'your-anon-key',
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
