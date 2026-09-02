import { useEffect, useRef } from 'react';
import api from '../services/api';
import { getTrackingLocation } from '../services/geolocation';

const PING_INTERVAL_MS = 25000;

export function useLocationPing(enabled: boolean) {
  const lastKnownRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) return;

    let cancelled = false;

    async function ping() {
      const { latitude, longitude } = await getTrackingLocation();
      if (cancelled) return;
      if (latitude !== null && longitude !== null) {
        lastKnownRef.current = { latitude, longitude };
      }
      // Sem sinal agora? Usa o último ponto conhecido — app segue rodando normal,
      // sem travar nem re-solicitar GPS insistentemente.
      const point = lastKnownRef.current;
      if (!point) return;
      try {
        await api.post('/promotores/location', point);
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
