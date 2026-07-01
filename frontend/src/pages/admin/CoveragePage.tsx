import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle2, Clock, XCircle, MapPin, RefreshCw, AlertTriangle, Store } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';
import { CoverageEntry, CoverageStatus, PdvNaoVisitado } from '../../types';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const BRAZIL_CENTER: [number, number] = [-15.7801, -47.9292];

const STATUS_COLOR: Record<CoverageStatus, string> = {
  ATENDIDO: '#10B981',
  EM_ATENDIMENTO: '#3B82F6',
  NAO_ATENDIDO: '#EF4444',
};

const STATUS_LABEL: Record<CoverageStatus, string> = {
  ATENDIDO: 'Atendido',
  EM_ATENDIMENTO: 'Em atendimento',
  NAO_ATENDIDO: 'Não atendido',
};

function statusIcon(status: CoverageStatus) {
  return L.divIcon({
    className: 'coverage-marker',
    html: `<div style="background:${STATUS_COLOR[status]};width:18px;height:18px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) map.setView(BRAZIL_CENTER, 4);
    else if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [points, map]);
  return null;
}

function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function CoveragePage() {
  const [date, setDate] = useState(todayInputValue());
  const [coverage, setCoverage] = useState<CoverageEntry[]>([]);
  const [naoVisitados, setNaoVisitados] = useState<PdvNaoVisitado[]>([]);
  const [minDays, setMinDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [covRes, naoVisRes] = await Promise.all([
        api.get('/admin/coverage/today', { params: { date } }),
        api.get('/admin/pdvs/nao-visitados'),
      ]);
      setCoverage(covRes.data.data || []);
      setNaoVisitados(naoVisRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar dados de cobertura.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [date]);

  const counts = useMemo(() => ({
    ATENDIDO: coverage.filter(c => c.status === 'ATENDIDO').length,
    EM_ATENDIMENTO: coverage.filter(c => c.status === 'EM_ATENDIMENTO').length,
    NAO_ATENDIDO: coverage.filter(c => c.status === 'NAO_ATENDIDO').length,
  }), [coverage]);

  const points = useMemo(
    () => coverage.filter(c => c.latitude != null && c.longitude != null).map(c => [c.latitude as number, c.longitude as number] as [number, number]),
    [coverage]
  );

  const missingCoords = useMemo(() => coverage.filter(c => c.latitude == null || c.longitude == null), [coverage]);

  const filteredNaoVisitados = useMemo(
    () => naoVisitados.filter(p => p.daysSinceLastVisit === null || p.daysSinceLastVisit >= minDays),
    [naoVisitados, minDays]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <MapPin size={24} />
            </div>
            Cobertura
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Status de atendimento dos PDVs na rota do dia e ranking de PDVs sem visita.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input-field py-2.5 text-sm font-bold"
          />
          <button onClick={load} disabled={loading} className="p-2.5 bg-pluma-800 text-white rounded-xl hover:bg-pluma-700 disabled:opacity-40 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={20} /></div>
          <div><p className="text-2xl font-black text-gray-900">{counts.ATENDIDO}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Atendidos</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Clock size={20} /></div>
          <div><p className="text-2xl font-black text-gray-900">{counts.EM_ATENDIMENTO}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Em atendimento</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600"><XCircle size={20} /></div>
          <div><p className="text-2xl font-black text-gray-900">{counts.NAO_ATENDIDO}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Não atendidos</p></div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={18} className="text-pluma-600" />
            Mapa de cobertura
          </h3>
          <div className="flex items-center gap-3">
            {(['ATENDIDO', 'EM_ATENDIMENTO', 'NAO_ATENDIDO'] as CoverageStatus[]).map(s => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[420px] rounded-2xl overflow-hidden border border-gray-100 relative z-0">
          <MapContainer center={BRAZIL_CENTER} zoom={4} className="h-full w-full" style={{ background: '#f8fafc' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds points={points} />
            {coverage.filter(c => c.latitude != null && c.longitude != null).map(c => (
              <Marker key={c.rotaId} position={[c.latitude as number, c.longitude as number]} icon={statusIcon(c.status)}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-gray-800">{c.pdvName}</p>
                    <p className="text-gray-500">{c.pdvCity} · {c.promotorName}</p>
                    <p className="font-semibold" style={{ color: STATUS_COLOR[c.status] }}>{STATUS_LABEL[c.status]}</p>
                    {c.checkin && (
                      <>
                        <p className="text-gray-500">Check-in às {format(new Date(c.checkin.time), 'HH:mm', { locale: ptBR })}</p>
                        {c.checkin.latitude != null && c.checkin.longitude != null && (
                          <button
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${c.checkin!.latitude},${c.checkin!.longitude}`, '_blank')}
                            className="mt-1 w-full py-1 bg-gray-900 text-white text-[10px] font-bold rounded-lg hover:bg-black transition-colors"
                          >
                            Abrir local do check-in
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        {missingCoords.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <p>
              {missingCoords.length} PDV{missingCoords.length !== 1 ? 's' : ''} da rota de hoje sem coordenada não aparece{missingCoords.length !== 1 ? 'm' : ''} no mapa: {missingCoords.map(m => m.pdvName).join(', ')}.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Store size={18} className="text-pluma-600" />
            PDVs não visitados
          </h3>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
            Mín. dias sem visita
            <input
              type="number"
              min={0}
              value={minDays}
              onChange={e => setMinDays(Math.max(0, Number(e.target.value)))}
              className="input-field w-16 py-1.5 text-xs text-center"
            />
          </label>
        </div>
        {filteredNaoVisitados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum PDV parado há {minDays}+ dias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-2 pr-4">PDV</th>
                  <th className="py-2 pr-4">Cidade</th>
                  <th className="py-2 pr-4">Última visita</th>
                  <th className="py-2 pr-4">Dias sem visita</th>
                </tr>
              </thead>
              <tbody>
                {filteredNaoVisitados.map(p => (
                  <tr key={p.pdvId} className="border-b border-gray-50 last:border-b-0">
                    <td className="py-2.5 pr-4 font-bold text-gray-800">{p.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{p.city}</td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {p.lastVisitDate ? format(new Date(p.lastVisitDate), 'dd/MM/yyyy', { locale: ptBR }) : 'Nunca visitado'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        p.daysSinceLastVisit === null || p.daysSinceLastVisit >= 14
                          ? 'bg-red-50 text-red-600'
                          : p.daysSinceLastVisit >= 7
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-gray-50 text-gray-500'
                      }`}>
                        {p.daysSinceLastVisit === null ? 'Nunca' : `${p.daysSinceLastVisit} dias`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
