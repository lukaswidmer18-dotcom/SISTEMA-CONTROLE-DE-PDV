import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Ponto } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, MapPin } from 'lucide-react';

const PONTO_SEQUENCE = ['ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA'] as const;
type PontoType = typeof PONTO_SEQUENCE[number];

const PONTO_LABELS: Record<PontoType, string> = {
  ENTRADA: 'Entrada',
  SAIDA_ALMOCO: 'Saída Almoço',
  RETORNO_ALMOCO: 'Retorno Almoço',
  SAIDA: 'Saída',
};

const PONTO_COLORS: Record<PontoType, string> = {
  ENTRADA: 'bg-green-100 text-green-800',
  SAIDA_ALMOCO: 'bg-yellow-100 text-yellow-800',
  RETORNO_ALMOCO: 'bg-blue-100 text-blue-800',
  SAIDA: 'bg-red-100 text-red-800',
};

function getNextPonto(pontos: Ponto[]): PontoType | null {
  const types = pontos.map(p => p.type as PontoType);
  const hasSaida = types.includes('SAIDA');
  if (hasSaida) return null;

  if (!types.includes('ENTRADA')) return 'ENTRADA';
  if (!types.includes('SAIDA_ALMOCO')) {
    // Can go to lunch or skip to saida
    return 'SAIDA_ALMOCO';
  }
  if (!types.includes('RETORNO_ALMOCO')) return 'RETORNO_ALMOCO';
  return 'SAIDA';
}

function canRegister(type: PontoType, pontos: Ponto[]): boolean {
  const types = pontos.map(p => p.type as PontoType);
  if (types.includes(type)) return false;

  if (type === 'ENTRADA') return !types.includes('ENTRADA');
  if (type === 'SAIDA_ALMOCO') return types.includes('ENTRADA') && !types.includes('SAIDA');
  if (type === 'RETORNO_ALMOCO') return types.includes('SAIDA_ALMOCO') && !types.includes('RETORNO_ALMOCO');
  if (type === 'SAIDA') return types.includes('ENTRADA');
  return false;
}

export default function PontoPage() {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/ponto/today');
      setPontos(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRegister(type: PontoType) {
    setError('');
    setSuccess('');
    setRegistering(true);

    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch {}

    try {
      await api.post('/ponto', { type, latitude, longitude });
      setSuccess(`${PONTO_LABELS[type]} registrada com sucesso!`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar ponto.');
    } finally {
      setRegistering(false);
    }
  }

  const nextPonto = getNextPonto(pontos);
  const hasSaida = pontos.some(p => p.type === 'SAIDA');

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">Controle de Ponto</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4 flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Today's records */}
      <div className="card mb-4">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock size={15} /> Registros de Hoje
        </h3>
        {loading ? (
          <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" /></div>
        ) : pontos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum registro ainda.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-gray-200" />
            <div className="space-y-3">
              {pontos.map((p) => (
                <div key={p.id} className="flex items-center gap-3 pl-10 relative">
                  <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-500 ring-2 ring-white ring-offset-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PONTO_COLORS[p.type as PontoType]}`}>
                        {PONTO_LABELS[p.type as PontoType]}
                      </span>
                      <span className="font-bold text-gray-800 text-sm">
                        {format(new Date(p.timestamp), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <MapPin size={10} />
                      {p.locationAvailable ? 'Com localização' : 'Sem localização'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!loading && (
        <div className="space-y-3">
          {hasSaida ? (
            <div className="card text-center">
              <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-gray-800">Jornada concluída!</p>
              <p className="text-sm text-gray-500">Você já registrou a saída hoje.</p>
            </div>
          ) : (
            <>
              {nextPonto && (
                <button
                  onClick={() => handleRegister(nextPonto)}
                  disabled={registering}
                  className="btn-primary w-full py-4 text-base"
                >
                  {registering ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Registrando...
                    </span>
                  ) : `Registrar ${PONTO_LABELS[nextPonto]}`}
                </button>
              )}

              {/* Optional: skip lunch */}
              {pontos.some(p => p.type === 'ENTRADA') && !pontos.some(p => p.type === 'SAIDA_ALMOCO') && (
                <button
                  onClick={() => handleRegister('SAIDA')}
                  disabled={registering || !canRegister('SAIDA', pontos)}
                  className="btn-secondary w-full py-3 text-sm"
                >
                  Registrar Saída (sem almoço)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
