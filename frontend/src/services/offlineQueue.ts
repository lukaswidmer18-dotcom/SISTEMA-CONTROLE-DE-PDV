import axios from 'axios';
import api from './api';
import { PontoType } from '../types';

const DB_NAME = 'pdv-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'queue';
const VISIT_MAP_KEY = 'pdv-offline-visit-map';

type OfflineKind = 'ponto' | 'startVisit' | 'photo' | 'validity' | 'finishVisit';

export interface OfflineActionBase {
  id: string;
  kind: OfflineKind;
  createdAt: string;
}

export interface OfflinePontoAction extends OfflineActionBase {
  kind: 'ponto';
  payload: {
    type: PontoType;
    latitude: number;
    longitude: number;
  };
}

export interface OfflineStartVisitAction extends OfflineActionBase {
  kind: 'startVisit';
  localVisitId: string;
  payload: {
    pdvId: string;
    latitude: number;
    longitude: number;
  };
}

export interface OfflinePhotoAction extends OfflineActionBase {
  kind: 'photo';
  localVisitId?: string;
  visitId?: string;
  payload: {
    file: Blob;
    fileName: string;
    latitude: number;
    longitude: number;
  };
}

export interface OfflineValidityAction extends OfflineActionBase {
  kind: 'validity';
  localVisitId?: string;
  visitId?: string;
  payload: {
    productId: string;
    expiryDate: string;
    quantity: string;
  };
}

export interface OfflineFinishVisitAction extends OfflineActionBase {
  kind: 'finishVisit';
  localVisitId?: string;
  visitId?: string;
  payload: {
    latitude: number;
    longitude: number;
    noProductsFound: boolean;
  };
}

export type OfflineAction =
  | OfflinePontoAction
  | OfflineStartVisitAction
  | OfflinePhotoAction
  | OfflineValidityAction
  | OfflineFinishVisitAction;

type NewOfflineAction = OfflineAction extends infer Action
  ? Action extends OfflineAction
    ? Omit<Action, 'id' | 'createdAt'>
    : never
  : never;

function createId() {
  if ('randomUUID' in crypto) return `offline-${crypto.randomUUID()}`;
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function getVisitMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(VISIT_MAP_KEY) || '{}');
  } catch {
    return {};
  }
}

function setVisitMap(map: Record<string, string>) {
  localStorage.setItem(VISIT_MAP_KEY, JSON.stringify(map));
}

function resolveVisitId(action: { visitId?: string; localVisitId?: string }, map: Record<string, string>) {
  if (action.visitId) return action.visitId;
  if (action.localVisitId && map[action.localVisitId]) return map[action.localVisitId];
  return null;
}

export function isNetworkError(error: unknown) {
  if (!navigator.onLine) return true;
  if (axios.isAxiosError(error)) return !error.response;
  return false;
}

export async function queueOfflineAction(action: NewOfflineAction) {
  const queued = {
    ...action,
    id: createId(),
    createdAt: new Date().toISOString(),
  } as OfflineAction;

  await withStore('readwrite', (store) => store.add(queued));
  window.dispatchEvent(new CustomEvent('offline-queue-updated'));
  return queued;
}

export async function getOfflineActions(): Promise<OfflineAction[]> {
  const actions = await withStore<OfflineAction[]>('readonly', (store) => store.getAll());
  return actions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getOfflinePendingCount() {
  return withStore<number>('readonly', (store) => store.count());
}

export async function removeFromOfflineQueue(id: string) {
  await deleteOfflineAction(id);
  window.dispatchEvent(new CustomEvent('offline-queue-updated'));
}

async function deleteOfflineAction(id: string) {
  await withStore('readwrite', (store) => store.delete(id));
}

async function syncAction(action: OfflineAction, visitMap: Record<string, string>) {
  if (action.kind === 'ponto') {
    await api.post('/ponto', action.payload);
    return;
  }

  if (action.kind === 'startVisit') {
    const { data } = await api.post('/visits', action.payload);
    if (data?.data?.id) {
      visitMap[action.localVisitId] = data.data.id;
      setVisitMap(visitMap);
    }
    return;
  }

  if (action.kind === 'photo') {
    const visitId = resolveVisitId(action, visitMap);
    if (!visitId) throw new Error('Visita offline ainda não sincronizada.');

    const formData = new FormData();
    formData.append('photo', action.payload.file, action.payload.fileName);
    formData.append('latitude', String(action.payload.latitude));
    formData.append('longitude', String(action.payload.longitude));

    await api.post(`/visits/${visitId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return;
  }

  if (action.kind === 'validity') {
    const visitId = resolveVisitId(action, visitMap);
    if (!visitId) throw new Error('Visita offline ainda não sincronizada.');
    await api.post(`/visits/${visitId}/validities`, action.payload);
    return;
  }

  const visitId = resolveVisitId(action, visitMap);
  if (!visitId) throw new Error('Visita offline ainda não sincronizada.');
  await api.patch(`/visits/${visitId}/finish`, action.payload);
}

export async function syncOfflineQueue() {
  const actions = await getOfflineActions();
  const visitMap = getVisitMap();
  let synced = 0;

  for (const action of actions) {
    try {
      await syncAction(action, visitMap);
      await deleteOfflineAction(action.id);
      synced += 1;
    } catch (error) {
      if (isNetworkError(error)) break;
      throw error;
    }
  }

  window.dispatchEvent(new CustomEvent('offline-queue-updated'));
  return { synced, remaining: await getOfflinePendingCount() };
}
