import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { apiClient } from '../lib/api';

export const KORAMANGALA = {
  latitude: 12.9352,
  longitude: 77.6245,
  label: 'Koramangala',
};

export type LiveLocation = {
  latitude: number;
  longitude: number;
  label: string;
  permissionDenied: boolean;
  usingFallback: boolean;
};

async function labelFor(lat: number, lng: number): Promise<string> {
  try {
    const geo = await apiClient.reverseGeocode(lat, lng);
    if (geo.source === 'nominatim' && geo.label) {
      return `${geo.label} · live GPS`;
    }
  } catch {
    /* keep GPS copy */
  }
  return 'Koramangala · live GPS';
}

export function useLiveLocation(enabled = true) {
  const [location, setLocation] = useState<LiveLocation>({
    ...KORAMANGALA,
    permissionDenied: false,
    usingFallback: true,
  });
  const lastSent = useRef(0);
  const reversed = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    let sub: Location.LocationSubscription | null = null;

    async function start() {
      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;
      if (status !== 'granted') {
        const asked = await Location.requestForegroundPermissionsAsync();
        status = asked.status;
      }
      if (status !== 'granted') {
        if (mounted) {
          setLocation({ ...KORAMANGALA, permissionDenied: true, usingFallback: true });
        }
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = current.coords.latitude;
      const lng = current.coords.longitude;
      if (mounted) {
        setLocation({
          latitude: lat,
          longitude: lng,
          label: 'Koramangala · live GPS',
          permissionDenied: false,
          usingFallback: false,
        });
      }
      const label = await labelFor(lat, lng);
      reversed.current = true;
      if (mounted) {
        setLocation((prev) => ({ ...prev, label }));
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25 },
        (next) => {
          const now = Date.now();
          if (now - lastSent.current < 5000) return;
          lastSent.current = now;
          if (!mounted) return;
          setLocation((prev) => ({
            latitude: next.coords.latitude,
            longitude: next.coords.longitude,
            label: reversed.current ? prev.label : 'Koramangala · live GPS',
            permissionDenied: false,
            usingFallback: false,
          }));
        },
      );
    }

    void start();
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [enabled]);

  return location;
}
