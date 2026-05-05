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

// Mantida por compatibilidade
export async function getRequiredLocation(): Promise<OptionalLocation> {
  return getOptionalLocation();
}
