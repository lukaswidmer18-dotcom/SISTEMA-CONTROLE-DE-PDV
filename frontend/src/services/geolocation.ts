export interface OptionalLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number;
}

const LOCATION_TIMEOUT_MS = 8000;
const GOOD_ENOUGH_ACCURACY_METERS = 20;

// Uma leitura só de getCurrentPosition às vezes vem do primeiro fix (rede/Wi-Fi,
// impreciso) antes do GPS convergir. Ouve várias leituras dentro do timeout e
// fica com a de menor accuracy, ou para cedo se já vier precisa o bastante.
function sampleBestPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let best: GeolocationPosition | null = null;
    let watchId: number;

    const finish = (result: GeolocationPosition | null) => {
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (result) resolve(result);
      else reject(new Error('Localização indisponível.'));
    };

    const timer = setTimeout(() => finish(best), LOCATION_TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
        if (position.coords.accuracy <= GOOD_ENOUGH_ACCURACY_METERS) finish(position);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) finish(best);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: LOCATION_TIMEOUT_MS }
    );
  });
}

export async function getOptionalLocation(): Promise<OptionalLocation> {
  if (!('geolocation' in navigator)) {
    return { latitude: null, longitude: null };
  }

  try {
    const position = await sampleBestPosition();
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch {
    return { latitude: null, longitude: null };
  }
}

export async function getRequiredLocation(): Promise<{ latitude: number; longitude: number; accuracy?: number }> {
  const loc = await getOptionalLocation();
  if (loc.latitude === null || loc.longitude === null) {
    throw new Error('Não foi possível obter a localização. Verifique as permissões do dispositivo.');
  }
  return { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy };
}
