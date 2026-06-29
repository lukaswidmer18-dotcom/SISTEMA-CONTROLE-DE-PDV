import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { PDV, RotaVisita, User } from '../../types';
import { Plus, Trash2, MapPin } from 'lucide-react';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function DayColumn({ dayOfWeek, routes, availablePdvs, onAdd, onRemove }: {
  dayOfWeek: number;
  routes: RotaVisita[];
  availablePdvs: PDV[];
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
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 min-h-[160px] flex flex-col">
      <h4 className="text-xs font-black text-gray-600 uppercase tracking-wide mb-2">{DAYS[dayOfWeek]}</h4>
      <div className="space-y-1.5 flex-1">
        {routes.length === 0 ? (
          <p className="text-[11px] text-gray-400 italic py-2">Nenhum PDV.</p>
        ) : (
          routes.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
              <span className="text-xs font-medium text-gray-700 truncate">{r.pdv?.name}</span>
              <button onClick={() => onRemove(r.id)} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-1 mt-2 pt-2 border-t border-gray-200">
        <select
          className="input-field text-xs py-1.5 flex-1"
          value={selectedPdv}
          onChange={e => setSelectedPdv(e.target.value)}
          disabled={options.length === 0}
        >
          <option value="">{options.length === 0 ? 'Sem PDVs' : 'Adicionar...'}</option>
          {options.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={handleAdd} disabled={!selectedPdv} className="p-1.5 bg-pluma-800 text-white rounded-lg disabled:opacity-30 shrink-0">
          <Plus size={14} />
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Rotas de Visita</h2>
      </div>

      <div className="card mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Promotor</label>
        <select
          className="input-field max-w-sm"
          value={selectedPromotor}
          onChange={e => setSelectedPromotor(e.target.value)}
        >
          <option value="">Selecione um promotor...</option>
          {promotores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p className="text-xs text-gray-400 mt-2">
          Define quais PDVs cada promotor pode visitar em cada dia da semana. Promotor só consegue iniciar visita em PDV que estiver na rota do dia.
        </p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl mb-4">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : !selectedPromotor ? (
        <div className="card text-center py-12 text-gray-400">
          <MapPin size={28} className="mx-auto mb-2 text-gray-300" />
          Selecione um promotor pra montar a rota da semana.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {DAYS.map((_, dayOfWeek) => (
            <DayColumn
              key={dayOfWeek}
              dayOfWeek={dayOfWeek}
              routes={routesByDay[dayOfWeek] || []}
              availablePdvs={pdvs}
              onAdd={(pdvId) => handleAdd(dayOfWeek, pdvId)}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
