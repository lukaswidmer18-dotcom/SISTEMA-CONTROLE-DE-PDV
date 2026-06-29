import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { PDV, RotaVisita, User } from '../../types';
import { Plus, Trash2, MapPin, Route as RouteIcon, Store, Users, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DAY_COLORS = ['#EAB308', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4'];
const BRAZIL_CENTER: [number, number] = [-15.7801, -47.9292];

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView(BRAZIL_CENTER, 4);
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

function dayNumberIcon(color: string, order: number) {
  return L.divIcon({
    className: 'route-day-marker',
    html: `<div style="background:${color};width:22px;height:22px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:800;">${order}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function getWeekStart(weekOffset: number): Date {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return addDays(todayMidnight, -todayMidnight.getDay() + weekOffset * 7);
}

function DayColumn({ dayOfWeek, date, routes, availablePdvs, isToday, onAdd, onRemove }: {
  dayOfWeek: number;
  date: Date;
  routes: RotaVisita[];
  availablePdvs: PDV[];
  isToday: boolean;
  onAdd: (pdvId: string) => void;
  onRemove: (routeId: string) => void;
}) {
  const [selectedPdv, setSelectedPdv] = useState('');
  const assignedIds = new Set(routes.map(r => r.pdvId));
  const options = availablePdvs.filter(p => !assignedIds.has(p.id));

  function handleAdd() {
    if (!selectedPdv) return;
    onAdd(selectedPdv);
    setSelectedPdv('');
  }

  return (
    <div className={`card min-h-[220px] flex flex-col transition-all ${isToday ? 'border-pluma-300 shadow-glow-pluma' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{DAYS_SHORT[dayOfWeek]} · {format(date, 'dd/MM')}</span>
          <h4 className="text-sm font-black text-gray-900 tracking-tight">{DAYS[dayOfWeek]}</h4>
        </div>
        {isToday && (
          <span className="text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-gold-50 text-gold-700 border border-gold-200">
            Hoje
          </span>
        )}
      </div>

      <div className="space-y-1.5 flex-1">
        {routes.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
            <p className="text-[11px] text-gray-400 font-medium">Nenhum PDV</p>
          </div>
        ) : (
          routes.map((r, i) => (
            <div key={r.id} className="group flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-2.5 py-2 hover:border-pluma-200 hover:shadow-sm transition-all">
              <span className="shrink-0 w-5 h-5 rounded-full bg-pluma-50 text-pluma-700 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
              <Store size={13} className="text-pluma-300 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-800 truncate leading-tight">{r.pdv?.name}</p>
                {r.pdv?.city && <p className="text-[10px] text-gray-400 truncate leading-tight">{r.pdv.city}</p>}
              </div>
              <button onClick={() => onRemove(r.id)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
        <select
          className="input-field text-xs py-2 flex-1"
          value={selectedPdv}
          onChange={e => setSelectedPdv(e.target.value)}
          disabled={options.length === 0}
        >
          <option value="">{options.length === 0 ? 'Sem PDVs disponíveis' : 'Adicionar PDV...'}</option>
          {options.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={handleAdd} disabled={!selectedPdv} className="p-2 bg-pluma-800 text-white rounded-lg hover:bg-pluma-700 disabled:opacity-30 shrink-0 transition-colors">
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

export default function RoutesPage() {
  const [promotores, setPromotores] = useState<User[]>([]);
  const [pdvs, setPdvs] = useState<PDV[]>([]);
  const [routes, setRoutes] = useState<RotaVisita[]>([]);
  const [selectedPromotor, setSelectedPromotor] = useState('');
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const todayDate = new Date();

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [usersRes, pdvsRes] = await Promise.all([api.get('/users'), api.get('/pdvs')]);
      setPromotores((usersRes.data.data || []).filter((u: User) => u.role === 'PROMOTOR' && u.active));
      setPdvs((pdvsRes.data.data || []).filter((p: PDV) => p.active));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  async function loadRoutes(promotorId: string, dates: Date[]) {
    if (!promotorId) {
      setRoutes([]);
      return;
    }
    const { data } = await api.get('/routes', {
      params: { promotorId, from: format(dates[0], 'yyyy-MM-dd'), to: format(dates[6], 'yyyy-MM-dd') },
    });
    setRoutes(data.data || []);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadRoutes(selectedPromotor, weekDates); }, [selectedPromotor, weekOffset]);

  const routesByDay = useMemo(() => {
    const grouped: Record<number, RotaVisita[]> = {};
    for (let d = 0; d < 7; d++) grouped[d] = [];
    for (const r of routes) {
      const idx = weekDates.findIndex(d => format(d, 'yyyy-MM-dd') === r.date.slice(0, 10));
      if (idx !== -1) grouped[idx].push(r);
    }
    return grouped;
  }, [routes, weekDates]);

  const selectedPromotorName = promotores.find(p => p.id === selectedPromotor)?.name;

  const mapDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, dayOfWeek) => dayOfWeek)
      .filter(d => activeDays.has(d))
      .map(dayOfWeek => {
        const dayRoutes = routesByDay[dayOfWeek] || [];
        const points = dayRoutes
          .filter(r => r.pdv?.latitude != null && r.pdv?.longitude != null)
          .map((r, i) => ({
            position: [r.pdv!.latitude as number, r.pdv!.longitude as number] as [number, number],
            name: r.pdv!.name,
            order: i + 1,
          }));
        const missing = dayRoutes.filter(r => r.pdv?.latitude == null || r.pdv?.longitude == null);
        return { dayOfWeek, color: DAY_COLORS[dayOfWeek], points, missing };
      })
      .filter(d => d.points.length > 0 || d.missing.length > 0);
  }, [routesByDay, activeDays]);

  const allMapPoints = useMemo(() => mapDays.flatMap(d => d.points.map(p => p.position)), [mapDays]);
  const allMissing = useMemo(() => mapDays.flatMap(d => d.missing.map(r => ({ dayOfWeek: d.dayOfWeek, name: r.pdv?.name || '?' }))), [mapDays]);

  function toggleDay(dayOfWeek: number) {
    setActiveDays(prev => {
      const next = new Set(prev);
      if (next.has(dayOfWeek)) next.delete(dayOfWeek);
      else next.add(dayOfWeek);
      return next;
    });
  }

  async function handleAdd(date: Date, pdvId: string) {
    setError('');
    try {
      await api.post('/routes', { promotorId: selectedPromotor, pdvId, date: format(date, 'yyyy-MM-dd') });
      await loadRoutes(selectedPromotor, weekDates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao adicionar PDV à rota.');
    }
  }

  async function handleRemove(routeId: string) {
    setError('');
    try {
      await api.delete(`/routes/${routeId}`);
      await loadRoutes(selectedPromotor, weekDates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao remover PDV da rota.');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <RouteIcon size={24} />
            </div>
            Rotas de Visita
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Define quais PDVs cada promotor visita em datas específicas.
          </p>
        </div>
        {selectedPromotor && (
          <div className="flex items-center gap-2 px-4 py-2 bg-pluma-50 text-pluma-800 rounded-xl text-xs font-bold border border-pluma-100">
            <Users size={14} />
            {routes.length} PDV{routes.length !== 1 ? 's' : ''} na semana de {selectedPromotorName}
          </div>
        )}
      </div>

      <div className="card">
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
          <Users size={13} className="text-pluma-400" /> Promotor
        </label>
        <select
          className="input-field max-w-sm py-3 text-sm font-bold"
          value={selectedPromotor}
          onChange={e => setSelectedPromotor(e.target.value)}
        >
          <option value="">Selecione um promotor...</option>
          {promotores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p className="text-xs text-gray-400 mt-2">
          Promotor só consegue iniciar visita em PDV que estiver na rota do dia atual.
        </p>
      </div>

      {selectedPromotor && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekOffset(w => w - 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-pluma-200 hover:text-pluma-600 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <p className="text-sm font-black text-gray-800 tracking-tight min-w-[170px] text-center">
                Semana de {format(weekDates[0], 'dd/MM', { locale: ptBR })} a {format(weekDates[6], 'dd/MM', { locale: ptBR })}
              </p>
              <button
                type="button"
                onClick={() => setWeekOffset(w => w + 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-pluma-200 hover:text-pluma-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {weekOffset !== 0 && (
              <button type="button" onClick={() => setWeekOffset(0)} className="text-xs font-bold text-pluma-600 hover:text-pluma-800">
                Voltar pra hoje
              </button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Dias com visita
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((_, dayOfWeek) => {
                const active = activeDays.has(dayOfWeek);
                return (
                  <button
                    key={dayOfWeek}
                    type="button"
                    onClick={() => toggleDay(dayOfWeek)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      active
                        ? 'bg-pluma-800 text-white border-pluma-800 shadow-glow-pluma'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-pluma-200 hover:text-pluma-600'
                    }`}
                  >
                    {DAYS_SHORT[dayOfWeek]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Rota vale só pra essa semana específica — não se repete sozinha. Pra manter o mesmo PDV na semana seguinte, adicione de novo navegando pra ela. Desmarque o dia em que o promotor não atende pra ocultar a coluna.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center gap-3 animate-fade-in font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : !selectedPromotor ? (
        <div className="card text-center py-16 animate-fade-in">
          <div className="w-14 h-14 bg-pluma-50 text-pluma-300 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MapPin size={28} />
          </div>
          <p className="text-sm text-gray-400 font-medium">Selecione um promotor pra montar a rota da semana.</p>
        </div>
      ) : activeDays.size === 0 ? (
        <div className="card text-center py-12 text-gray-400 animate-fade-in">
          Nenhum dia selecionado. Marque ao menos um dia acima.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 animate-fade-in">
          {DAYS.map((_, dayOfWeek) => activeDays.has(dayOfWeek) && (
            <DayColumn
              key={dayOfWeek}
              dayOfWeek={dayOfWeek}
              date={weekDates[dayOfWeek]}
              routes={routesByDay[dayOfWeek] || []}
              availablePdvs={pdvs}
              isToday={isSameDay(weekDates[dayOfWeek], todayDate)}
              onAdd={(pdvId) => handleAdd(weekDates[dayOfWeek], pdvId)}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {selectedPromotor && activeDays.size > 0 && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={18} className="text-pluma-600" />
              Mapa da Rota
            </h3>
            {mapDays.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                {mapDays.map(d => (
                  <span key={d.dayOfWeek} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {DAYS_SHORT[d.dayOfWeek]}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="h-[420px] rounded-2xl overflow-hidden border border-gray-100 relative z-0">
            <MapContainer center={BRAZIL_CENTER} zoom={4} className="h-full w-full" style={{ background: '#f8fafc' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBounds points={allMapPoints} />
              {mapDays.map(d => (
                <React.Fragment key={d.dayOfWeek}>
                  {d.points.length > 1 && <Polyline positions={d.points.map(p => p.position)} color={d.color} weight={3} opacity={0.7} />}
                  {d.points.map((p, i) => (
                    <Marker key={`${d.dayOfWeek}-${i}`} position={p.position} icon={dayNumberIcon(d.color, p.order)}>
                      <Popup>
                        <div className="text-xs">
                          <p className="font-bold text-gray-800">{p.name}</p>
                          <p className="text-gray-500">{DAYS[d.dayOfWeek]} · {p.order}ª parada</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </React.Fragment>
              ))}
            </MapContainer>
          </div>

          {allMissing.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <p>
                {allMissing.length} PDV{allMissing.length !== 1 ? 's' : ''} sem coordenada não aparece{allMissing.length !== 1 ? 'm' : ''} no mapa: {allMissing.map(m => `${m.name} (${DAYS_SHORT[m.dayOfWeek]})`).join(', ')}. Configure o endereço do PDV na tela de PDVs pra geocodificar.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
