import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { DegustacaoSolicitacao } from '../../types';
import { UtensilsCrossed, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

export default function DegustacoesAdminPage() {
  const [solicitacoes, setSolicitacoes] = useState<DegustacaoSolicitacao[]>([]);
  const [filterCity, setFilterCity] = useState('');
  const [filterRequester, setFilterRequester] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedCity = useDebouncedValue(filterCity, 300);
  const debouncedRequester = useDebouncedValue(filterRequester, 300);
  const debouncedStore = useDebouncedValue(filterStore, 300);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (debouncedCity) params.city = debouncedCity;
      if (debouncedRequester) params.requesterName = debouncedRequester;
      if (debouncedStore) params.store = debouncedStore;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const { data } = await api.get('/admin/degustacoes', { params });
      setSolicitacoes(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar solicitações de degustação.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [debouncedCity, debouncedRequester, debouncedStore, filterFrom, filterTo]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <UtensilsCrossed size={24} />
            </div>
            Degustações
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Solicitações de degustação enviadas pelo portal público.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="text" placeholder="Filtrar cidade..." className="input-field text-sm py-2.5 w-36" value={filterCity} onChange={e => setFilterCity(e.target.value)} />
          <input type="text" placeholder="Filtrar solicitante..." className="input-field text-sm py-2.5 w-40" value={filterRequester} onChange={e => setFilterRequester(e.target.value)} />
          <input type="text" placeholder="Filtrar loja..." className="input-field text-sm py-2.5 w-40" value={filterStore} onChange={e => setFilterStore(e.target.value)} />
          <input type="date" className="input-field text-sm py-2.5" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          <input type="date" className="input-field text-sm py-2.5" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          <button onClick={load} disabled={loading} className="p-2.5 bg-pluma-800 text-white rounded-xl hover:bg-pluma-700 disabled:opacity-40 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold">{error}</div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
        ) : solicitacoes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Nenhuma solicitação de degustação ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Cidade</th>
                <th className="py-2 pr-4">Endereço</th>
                <th className="py-2 pr-4">Loja</th>
                <th className="py-2 pr-4">Produto/Evento</th>
                <th className="py-2 pr-4">Horário</th>
                <th className="py-2 pr-4">Solicitante</th>
                <th className="py-2 pr-4">Supervisor</th>
                <th className="py-2 pr-4">Justificativa</th>
                <th className="py-2 pr-4">Pedidos (PDF)</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="py-2.5 pr-4 font-bold text-gray-800 whitespace-nowrap">{format(new Date(s.date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{s.city}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{s.address}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{s.store}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{s.productEvent}</td>
                  <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{s.eventTime}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{s.requesterName}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{s.supervisor || '-'}</td>
                  <td className="py-2.5 pr-4 text-gray-500 max-w-[220px] truncate" title={s.justification}>{s.justification || '-'}</td>
                  <td className="py-2.5 pr-4">
                    {s.documentFileName ? (
                      <a
                        href={`/uploads/${s.documentFileName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-pluma-700 hover:text-pluma-900 font-bold text-xs"
                      >
                        <FileText size={14} /> Ver PDF
                      </a>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
