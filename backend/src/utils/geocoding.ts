export interface GeocodedPoint {
  latitude: number;
  longitude: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress(
  address: string,
  city: string,
  state: string
): Promise<GeocodedPoint | null> {
  const query = [address, city, state, 'Brasil'].filter(Boolean).join(', ');
  if (!query.trim()) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'pdv-sistema-controle/1.0' },
    });
    if (!response.ok) return null;

    const results = (await response.json()) as NominatimResult[];
    if (!results.length) return null;

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}
