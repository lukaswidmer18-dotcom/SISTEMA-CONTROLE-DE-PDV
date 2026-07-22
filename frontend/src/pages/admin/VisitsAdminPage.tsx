import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Visit, ChecklistItem } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, AlertTriangle } from 'lucide-react';
import StarRating from '../../components/ui/StarRating';
import { getRequiredPhotoTotal } from '../../utils/checklist';

export default function VisitsAdminPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterPdv, setFilterPdv] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [pdvs, setPdvs] = useState<any[]>([]);
  const [requiredPhotoTotal, setRequiredPhotoTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterUser) params.append('promotorId', filterUser);
      if (filterPdv) params.append('pdvId', filterPdv);
      if (filterStatus) params.append('status', filterStatus);

      const [visitsRes, usersRes, pdvsRes, checklistRes] = await Promise.all([
        api.get(`/visits/all?${params}`),
        api.get('/users'),
        api.get('/pdvs'),
        api.get('/checklist'),
      ]);
      setVisits(visitsRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setPdvs(pdvsRes.data.data || []);
      setRequiredPhotoTotal(getRequiredPhotoTotal((checklistRes.data.data || []) as ChecklistItem[]));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterDate, filterUser, filterPdv, filterStatus]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Visitas</h2>

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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">PDV</label>
            <select className="input-field text-sm" value={filterPdv} onChange={e => setFilterPdv(e.target.value)}>
              <option value="">Todos</option>
              {pdvs.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select className="input-field text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="COMPLETED">Concluída</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : visits.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">Nenhuma visita encontrada.</div>
      ) : (
        <>
          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {visits.map(v => (
              <div key={v.id} className="card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{v.promotor?.name || '-'}</p>
                    <p className="text-xs text-gray-500">{v.pdv?.name || '-'}</p>
                    {v.outsideRoute && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                        <AlertTriangle size={11} /> Fora da rota
                      </span>
                    )}
                  </div>
                  <span className={v.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}>
                    {v.status === 'COMPLETED' ? 'Concluída' : 'Em andamento'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>Início: <strong className="text-gray-700">{format(new Date(v.startedAt), "dd/MM HH:mm", { locale: ptBR })}</strong></span>
                  <span>Fim: <strong className="text-gray-700">{v.completedAt ? format(new Date(v.completedAt), "dd/MM HH:mm", { locale: ptBR }) : '-'}</strong></span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span className={v._count?.photos && v._count.photos >= requiredPhotoTotal ? 'text-green-600 font-medium' : 'text-red-500'}>
                      {v._count?.photos || 0}/{requiredPhotoTotal} fotos
                    </span>
                    <span>{v.noProductsFound ? <span className="text-orange-500">S/ produtos</span> : `${v._count?.validities || 0} validades`}</span>
                  </div>
                  {v.rating ? (
                    <StarRating value={v.rating.score} size={13} />
                  ) : (
                    <span className="text-xs text-gray-300">Sem nota</span>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <Link to={`/admin/visitas/${v.id}`} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                    <Eye size={13} /> Ver
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Tabela — desktop */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Promotor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">PDV</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Início</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fim</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fotos</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Validades</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nota</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visits.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{v.promotor?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-2">
                        <span>{v.pdv?.name || '-'}</span>
                        {v.outsideRoute && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 shrink-0">
                            <AlertTriangle size={11} /> Fora da rota
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(v.startedAt), "dd/MM HH:mm", { locale: ptBR })}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{v.completedAt ? format(new Date(v.completedAt), "dd/MM HH:mm", { locale: ptBR }) : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={v.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}>
                        {v.status === 'COMPLETED' ? 'Concluída' : 'Em andamento'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className={v._count?.photos && v._count.photos >= requiredPhotoTotal ? 'text-green-600 font-medium' : 'text-red-500'}>
                        {v._count?.photos || 0}/{requiredPhotoTotal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {v.noProductsFound ? <span className="text-orange-500 text-xs">S/ produtos</span> : v._count?.validities || 0}
                    </td>
                    <td className="px-4 py-3">
                      {v.rating ? (
                        <StarRating value={v.rating.score} size={14} />
                      ) : (
                        <span className="text-xs text-gray-300">Sem nota</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/visitas/${v.id}`} className="p-1.5 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50 inline-flex">
                        <Eye size={15} />
                      </Link>
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
