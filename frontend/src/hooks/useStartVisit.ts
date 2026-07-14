import { useState } from 'react';
import api from '../services/api';
import { queueOfflineAction, isNetworkError } from '../services/offlineQueue';
import { createLocalId, saveOfflineActiveVisit, toVisit, OfflineActiveVisit } from '../services/visitService';
import { PDV, Visit } from '../types';

interface ResolvedLocation {
  latitude: number;
  longitude: number;
  locationAvailable: boolean;
  accuracy?: number;
}

export interface StartVisitResult {
  visit: Visit;
  offline: boolean;
}

export function useStartVisit(resolveLocation: () => Promise<ResolvedLocation>) {
  const [starting, setStarting] = useState(false);

  async function startVisit(pdv: PDV): Promise<StartVisitResult> {
    setStarting(true);
    try {
      const location = await resolveLocation();

      try {
        const { data } = await api.post('/visits', { pdvId: pdv.id, ...location });
        return { visit: data.data, offline: false };
      } catch (err: unknown) {
        if (!isNetworkError(err)) throw err;

        const localVisitId = createLocalId('local-visit');
        const offlineVisit: OfflineActiveVisit = {
          localVisitId,
          pdvId: pdv.id,
          pdv,
          startedAt: new Date().toISOString(),
          photos: [],
          validities: [],
          rupturas: [],
          priceChecks: [],
          noProductsFound: false,
        };

        saveOfflineActiveVisit(offlineVisit);
        await queueOfflineAction({
          kind: 'startVisit',
          localVisitId,
          payload: {
            pdvId: pdv.id,
            latitude: location.latitude,
            longitude: location.longitude,
            locationAvailable: location.locationAvailable,
            accuracy: location.accuracy,
          },
        });
        return { visit: toVisit(offlineVisit), offline: true };
      }
    } finally {
      setStarting(false);
    }
  }

  return { startVisit, starting };
}
