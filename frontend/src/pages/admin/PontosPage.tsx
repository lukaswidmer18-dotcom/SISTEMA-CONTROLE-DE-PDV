import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Ponto } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PONTO_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA_ALMOCO: 'Saída Almoço',
  RETORNO_ALMOCO: 'Retorno Almoço',
  SAIDA: 'Saída',
};

const PONTO_COLORS: Record<string, string> = {
  ENTRADA: 'badge-green',
  SAIDA_ALMOCO: 'badge-yellow',
  RETORNO_ALMOCO: 'badge-blue',
  SAIDA: 'badge-red',
};

export default function PontosPage() {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterUser, setFilterUser] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterUser) params.append('userId', filterUser);

      const [pontosRes, usersRes] = await Promise.all([
        api.get(`/ponto/all?${params}`),
        api.get('/users'),
      ]);
      setPontos(pontosRes.data.data || []);
      setUsers(usersRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterDate, filterUser]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Registros de Ponto</h2>

      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
            <input type="date" className="input-field text-sm" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Promotor</label>
            <select className="input-field text-sm" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="">Todos</option>
              {users.filter(u => u.role === 'PROMOTOR').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : pontos.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">Nenhum registro encontrado.</div>
      ) : (
        <>
          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {pontos.map(p => (
              <div key={p.id} className="card flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{p.user?.name || '-'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(p.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <span className={PONTO_COLORS[p.type] || 'badge-blue'}>{PONTO_LABELS[p.type] || p.type}</span>
              </div>
            ))}
          </div>

          {/* Tabela — desktop */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Promotor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Horário</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Localização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pontos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.user?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={PONTO_COLORS[p.type] || 'badge-blue'}>{PONTO_LABELS[p.type] || p.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {format(new Date(p.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.locationAvailable && p.latitude && p.longitude
                        ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
                        : 'Não disponível'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
