import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { PDV, RotaVisita, User } from '../../types';
import { Plus, Trash2, MapPin, Route as RouteIcon, Store, Users } from 'lucide-react';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function DayColumn({ dayOfWeek, routes, availablePdvs, isToday, onAdd, onRemove }: {
  dayOfWeek: number;
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
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{DAYS_SHORT[dayOfWeek]}</span>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date().getDay();

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

  async function loadRoutes(promotorId: string) {
    if (!promotorId) {
      setRoutes([]);
      return;
    }
    const { data } = await api.get('/routes', { params: { promotorId } });
    setRoutes(data.data || []);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadRoutes(selectedPromotor); }, [selectedPromotor]);

  const routesByDay = useMemo(() => {
    const grouped: Record<number, RotaVisita[]> = {};
    for (let d = 0; d < 7; d++) grouped[d] = [];
    for (const r of routes) grouped[r.dayOfWeek]?.push(r);
    return grouped;
  }, [routes]);

  const selectedPromotorName = promotores.find(p => p.id === selectedPromotor)?.name;

  async function handleAdd(dayOfWeek: number, pdvId: string) {
    setError('');
    try {
      await api.post('/routes', { promotorId: selectedPromotor, pdvId, dayOfWeek });
      await loadRoutes(selectedPromotor);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao adicionar PDV à rota.');
    }
  }

  async function handleRemove(routeId: string) {
    setError('');
    try {
      await api.delete(`/routes/${routeId}`);
      await loadRoutes(selectedPromotor);
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
            Define quais PDVs cada promotor visita em cada dia da semana.
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 animate-fade-in">
          {DAYS.map((_, dayOfWeek) => (
            <DayColumn
              key={dayOfWeek}
              dayOfWeek={dayOfWeek}
              routes={routesByDay[dayOfWeek] || []}
              availablePdvs={pdvs}
              isToday={dayOfWeek === today}
              onAdd={(pdvId) => handleAdd(dayOfWeek, pdvId)}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
