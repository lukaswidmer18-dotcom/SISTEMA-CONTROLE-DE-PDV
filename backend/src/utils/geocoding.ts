export interface GeocodedPoint {
  latitude: number;
  longitude: number;
  approximate: boolean;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Nominatim tem cobertura fraca de numero de porta (addr:housenumber) fora de grandes
// centros no Brasil. Quando a busca com numero nao acha nada, tentamos de novo so com
// rua/cidade/UF pra pelo menos ancorar no logradouro, marcando o resultado como aproximado.
// Remove so o numero de porta (apos virgula ou no fim), preservando numeros que fazem
// parte do nome da rua ("Rua 7 de Setembro, 500" vira "Rua 7 de Setembro").
function stripHouseNumber(address: string): string {
  return address
    .replace(/,\s*(?:n[º°.]?\s*)?\d+\s*[a-z]?(?=\s*(?:,|-|$))/gi, '')
    .replace(/\s+\d+\s*$/, '')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,\s*|\s*[,-]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function fetchGeocode(query: string): Promise<GeocodedPoint | null> {
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

    return { latitude, longitude, approximate: false };
  } catch {
    return null;
  }
}

export async function geocodeAddress(
  address: string,
  city: string,
  state: string
): Promise<GeocodedPoint | null> {
  const fullQuery = [address, city, state, 'Brasil'].filter(Boolean).join(', ');
  const exact = await fetchGeocode(fullQuery);
  if (exact) return exact;

  const addressWithoutNumber = stripHouseNumber(address);
  if (!addressWithoutNumber || addressWithoutNumber === address.trim()) return null;

  const fallbackQuery = [addressWithoutNumber, city, state, 'Brasil'].filter(Boolean).join(', ');
  const approximate = await fetchGeocode(fallbackQuery);
  return approximate ? { ...approximate, approximate: true } : null;
}
