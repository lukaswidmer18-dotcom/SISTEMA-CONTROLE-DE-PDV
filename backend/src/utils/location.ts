export interface Coordinates {
  latitude: number | null;
  longitude: number | null;
}

export function parseCoordinate(value: unknown): number | null {
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

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Mediana por eixo: GPS de celular gera outlier com frequência (sinal ruim dentro da loja),
// e a mediana ignora pontos aberrantes sem precisar de limpeza manual.
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface GeofenceTarget {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
}

export type GeofenceCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'NOT_CONFIGURED' }
  | { allowed: false; reason: 'OUT_OF_RANGE'; distanceMeters: number; radiusMeters: number };

// Celular reporta o próprio raio de incerteza do GPS (accuracy). Chips fracos
// (alguns Motorola de entrada) ou "modo economia de bateria" no Android podem
// devolver centenas de metros de erro mesmo com o promotor fisicamente no PDV.
// Absorvemos essa incerteza no raio permitido, com teto pra não abrir demais
// o antifraude caso alguém forje um accuracy artificialmente alto.
const MAX_ACCURACY_TOLERANCE_METERS = 150;

export function checkGeofence(
  target: GeofenceTarget,
  point: { latitude: number; longitude: number },
  accuracyMeters?: number | null
): GeofenceCheckResult {
  if (target.latitude === null || target.longitude === null || target.radiusMeters === null) {
    return { allowed: false, reason: 'NOT_CONFIGURED' };
  }

  const distanceMeters = distanceInMeters(target.latitude, target.longitude, point.latitude, point.longitude);
  const tolerance =
    accuracyMeters != null && Number.isFinite(accuracyMeters)
      ? Math.min(Math.max(accuracyMeters, 0), MAX_ACCURACY_TOLERANCE_METERS)
      : 0;
  const effectiveRadius = target.radiusMeters + tolerance;
  if (distanceMeters > effectiveRadius) {
    return { allowed: false, reason: 'OUT_OF_RANGE', distanceMeters, radiusMeters: target.radiusMeters };
  }

  return { allowed: true };
}
