import { useEffect } from 'react';
import api from '../services/api';
import { getOptionalLocation } from '../services/geolocation';

const PING_INTERVAL_MS = 25000;

export function useLocationPing(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) return;

    let cancelled = false;

    async function ping() {
      const { latitude, longitude } = await getOptionalLocation();
      if (cancelled || latitude === null || longitude === null) return;
      try {
        await api.post('/promotores/location', { latitude, longitude });
      } catch {
        // best-effort — perda de um ping não é crítica, o próximo ciclo tenta de novo
      }
    }

    ping();
    const interval = setInterval(ping, PING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);
}
