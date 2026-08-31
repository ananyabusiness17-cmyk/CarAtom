import * as Location from 'expo-location';

export type OptionalCoords = {
  lat?: number;
  lng?: number;
  accuracy_m?: number;
};

export async function requestVisitCoords(): Promise<{
  coords: OptionalCoords;
  permissionDenied: boolean;
}> {
  const existing = await Location.getForegroundPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const asked = await Location.requestForegroundPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') {
    return { coords: {}, permissionDenied: true };
  }
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    coords: {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy_m: position.coords.accuracy ?? undefined,
    },
    permissionDenied: false,
  };
}
