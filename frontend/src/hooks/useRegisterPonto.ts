import { useState } from 'react';
import api from '../services/api';
import { queueOfflineAction, isNetworkError } from '../services/offlineQueue';
import { useOfflineSyncContext } from '../contexts/OfflineSyncContext';
import { Ponto, PontoType } from '../types';

interface ResolvedLocation {
  latitude: number;
  longitude: number;
  locationAvailable: boolean;
}

export interface RegisterPontoResult {
  ponto: Ponto;
  offline: boolean;
  locationAvailable: boolean;
}

export function useRegisterPonto(resolveLocation: () => Promise<ResolvedLocation>) {
  const [registering, setRegistering] = useState(false);
  const { refreshCount } = useOfflineSyncContext();

  async function registerPonto(type: PontoType, batteryLevel: number | null = null): Promise<RegisterPontoResult> {
    setRegistering(true);
    try {
      const location = await resolveLocation();

      try {
        const { data } = await api.post('/ponto', { type, ...location, batteryLevel });
        return { ponto: data.data, offline: false, locationAvailable: location.locationAvailable };
      } catch (err: unknown) {
        if (!isNetworkError(err)) throw err;

        const { latitude, longitude, locationAvailable } = location;
        const queued = await queueOfflineAction({
          kind: 'ponto',
          payload: { type, latitude, longitude, locationAvailable, batteryLevel },
        });
        await refreshCount();

        const offlinePonto: Ponto = {
          id: queued.id,
          userId: 'offline',
          type,
          timestamp: queued.createdAt,
          latitude,
          longitude,
          locationAvailable,
          batteryLevel,
        };
        return { ponto: offlinePonto, offline: true, locationAvailable };
      }
    } finally {
      setRegistering(false);
    }
  }

  return { registerPonto, registering };
}
