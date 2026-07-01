import { Visit, PDV, Validity, RupturaRegistro, PriceCheck } from '../types';

export const OFFLINE_ACTIVE_VISIT_KEY = 'pdv-offline-active-visit';
export const PDVS_CACHE_KEY = 'pdv-cache-pdvs';
export const PRODUCTS_CACHE_KEY = 'pdv-cache-products';
export const CHECKLIST_CACHE_KEY = 'pdv-cache-checklist';

export interface OfflineActiveVisit {
  localVisitId: string;
  pdvId: string;
  pdv?: PDV;
  startedAt: string;
  photos: { id: string; fileName: string; uploadedAt: string; checklistItemId: string }[];
  validities: Validity[];
  rupturas: RupturaRegistro[];
  priceChecks: PriceCheck[];
  noProductsFound: boolean;
}

export function createLocalId(prefix: string) {
  if ('randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function readCache<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
}

export function writeCache<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getOfflineActiveVisit(): OfflineActiveVisit | null {
  return readCache<OfflineActiveVisit | null>(OFFLINE_ACTIVE_VISIT_KEY, null);
}

export function saveOfflineActiveVisit(visit: OfflineActiveVisit) {
  writeCache(OFFLINE_ACTIVE_VISIT_KEY, visit);
}

export function clearOfflineActiveVisit() {
  localStorage.removeItem(OFFLINE_ACTIVE_VISIT_KEY);
}

export function toVisit(offline: OfflineActiveVisit): Visit {
  return {
    id: offline.localVisitId,
    promotorId: 'offline',
    pdvId: offline.pdvId,
    status: 'IN_PROGRESS',
    startedAt: offline.startedAt,
    noProductsFound: offline.noProductsFound,
    pdv: offline.pdv,
    photos: offline.photos.map(photo => ({
      id: photo.id,
      visitId: offline.localVisitId,
      checklistItemId: photo.checklistItemId,
      filePath: 'offline',
      fileName: photo.fileName,
      uploadedAt: photo.uploadedAt,
    })),
    validities: offline.validities,
    rupturas: offline.rupturas,
    priceChecks: offline.priceChecks,
  };
}

export function isLocalVisit(visitId: string) {
  return visitId.startsWith('local-visit-');
}

export function getVisitReference(visitId: string) {
  return isLocalVisit(visitId)
    ? { localVisitId: visitId }
    : { visitId };
}

export function updateOfflineActiveVisit(updater: (visit: OfflineActiveVisit) => OfflineActiveVisit) {
  const current = getOfflineActiveVisit();
  if (!current) return null;
  const updated = updater(current);
  saveOfflineActiveVisit(updated);
  return toVisit(updated);
}

export function removeFromOfflineQueue(id: string) {
  // Logic is handled in offlineQueue service, this is just a wrapper if needed
  // But for UI we just need to dispatch or call the service
}
