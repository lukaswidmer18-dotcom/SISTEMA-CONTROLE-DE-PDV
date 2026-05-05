export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const LOCATION_REQUIRED_MESSAGE =
  'Localização obrigatória. Ative o GPS e permita o acesso à localização para continuar.';

function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRequiredCoordinates(input: { latitude?: unknown; longitude?: unknown }): Coordinates | null {
  const latitude = parseCoordinate(input.latitude);
  const longitude = parseCoordinate(input.longitude);

  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}
