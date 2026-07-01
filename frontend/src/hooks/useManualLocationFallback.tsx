import { useState } from 'react';
import { getRequiredLocation } from '../services/geolocation';
import { AlertCircle, MapPin } from 'lucide-react';

interface ResolvedLocation {
  latitude: number;
  longitude: number;
  locationAvailable: boolean;
}

function parseCoordinate(value: string, min: number, max: number): number | null {
  const parsed = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export function useManualLocationFallback() {
  const [pendingResolve, setPendingResolve] = useState<((loc: ResolvedLocation) => void) | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState('');

  async function resolveLocation(): Promise<ResolvedLocation> {
    try {
      const loc = await getRequiredLocation();
      return { ...loc, locationAvailable: true };
    } catch {
      console.warn('GPS indisponível, pedindo coordenada manual ou contingência.');
      setLat('');
      setLng('');
      setError('');
      return new Promise<ResolvedLocation>((resolve) => {
        setPendingResolve(() => resolve);
      });
    }
  }

  function submitManual() {
    const latitude = parseCoordinate(lat, -90, 90);
    const longitude = parseCoordinate(lng, -180, 180);
    if (latitude === null || longitude === null) {
      setError('Coordenada inválida. Use o formato -24.9430, -53.4644.');
      return;
    }
    pendingResolve?.({ latitude, longitude, locationAvailable: true });
    setPendingResolve(null);
  }

  function skipManual() {
    pendingResolve?.({ latitude: 0, longitude: 0, locationAvailable: false });
    setPendingResolve(null);
  }

  const modal = pendingResolve ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-slide-up">
        <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-3">
          <MapPin size={22} />
        </div>
        <h3 className="text-lg font-black text-gray-900 mb-1">GPS indisponível</h3>
        <p className="text-sm text-gray-500 mb-4">
          Não conseguimos pegar sua localização automaticamente. Se souber a coordenada (ex: pelo Google Maps), informe abaixo. Ou continue sem localização.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            className="input-field text-sm py-2.5"
            placeholder="Latitude"
            inputMode="decimal"
            value={lat}
            onChange={e => setLat(e.target.value)}
          />
          <input
            className="input-field text-sm py-2.5"
            placeholder="Longitude"
            inputMode="decimal"
            value={lng}
            onChange={e => setLng(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg mb-3 flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </p>
        )}
        <div className="flex gap-2 mt-1">
          <button type="button" onClick={skipManual} className="btn-secondary flex-1 py-2.5 text-sm">Continuar sem GPS</button>
          <button type="button" onClick={submitManual} className="btn-primary flex-1 py-2.5 text-sm">Usar Coordenada</button>
        </div>
      </div>
    </div>
  ) : null;

  return { resolveLocation, modal };
}
