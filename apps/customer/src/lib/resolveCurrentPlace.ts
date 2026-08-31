import type { ReverseGeocode } from '@caratom/contracts';
import * as Location from 'expo-location';

import { apiClient } from './api';

export class LocationDeniedError extends Error {
  constructor() {
    super('LOCATION_DENIED');
    this.name = 'LocationDeniedError';
  }
}

export async function resolveCurrentPlace(): Promise<ReverseGeocode> {
  const existing = await Location.getForegroundPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Location.requestForegroundPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    throw new LocationDeniedError();
  }
  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const latitude = current.coords.latitude;
  const longitude = current.coords.longitude;
  try {
    return await apiClient.reverseGeocode(latitude, longitude);
  } catch {
    return {
      label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      latitude,
      longitude,
      source: 'coords',
    };
  }
}
