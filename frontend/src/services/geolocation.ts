export interface OptionalLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number;
}

const LOCATION_TIMEOUT_MS = 8000;

export async function getOptionalLocation(): Promise<OptionalLocation> {
  if (!('geolocation' in navigator)) {
    return { latitude: null, longitude: null };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: LOCATION_TIMEOUT_MS,
      });
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch {
    return { latitude: null, longitude: null };
  }
}

export async function getRequiredLocation(): Promise<{ latitude: number; longitude: number }> {
  const loc = await getOptionalLocation();
  if (loc.latitude === null || loc.longitude === null) {
    throw new Error('Não foi possível obter a localização. Verifique as permissões do dispositivo.');
  }
  return { latitude: loc.latitude, longitude: loc.longitude };
}
