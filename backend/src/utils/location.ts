export interface Coordinates {
  latitude: number | null;
  longitude: number | null;
}

function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Agora retorna coordenadas opcionais (null quando não informadas)
export function parseOptionalCoordinates(input: { latitude?: unknown; longitude?: unknown }): Coordinates {
  const latitude = parseCoordinate(input.latitude);
  const longitude = parseCoordinate(input.longitude);

  if (latitude !== null && (latitude < -90 || latitude > 90)) return { latitude: null, longitude: null };
  if (longitude !== null && (longitude < -180 || longitude > 180)) return { latitude: null, longitude: null };

  return { latitude, longitude };
}

// Mantido por compatibilidade — agora aceita null
export function parseRequiredCoordinates(input: { latitude?: unknown; longitude?: unknown }): Coordinates {
  return parseOptionalCoordinates(input);
}

export const LOCATION_REQUIRED_MESSAGE = 'Localização obrigatória. Ative o GPS e permita o acesso à localização para continuar.';
