import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { PdvCostSummary, VisitCostEntry } from '../../types';
import { DollarSign, RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatCurrency(value: number | null): string {
  return value != null ? `R$ ${value.toFixed(2)}` : '—';
}

export default function CustoPage() {
  const [pdvSummary, setPdvSummary] = useState<PdvCostSummary[]>([]);
  const [visitCosts, setVisitCosts] = useState<VisitCostEntry[]>([]);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const [summaryRes, visitsRes] = await Promise.all([
        api.get('/admin/custos/pdvs', { params }),
        api.get('/admin/custos/visitas', { params }),
      ]);
      setPdvSummary(summaryRes.data.data || []);
      setVisitCosts(visitsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar custo por atendimento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterFrom, filterTo]);

  const missingHourlyCost = visitCosts.some(v => v.hourlyCost == null);
  const missingRevenue = visitCosts.some(v => v.revenue == null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <DollarSign size={24} />
            </div>
            Custo por Atendimento
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Custo de mão de obra vs. faturamento gerado, por PDV. Ratio abaixo de 1 = custando mais do que retornando.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {(missingHourlyCost || missingRevenue) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <p>
            {missingHourlyCost && 'Alguns promotores não têm custo/hora configurado (Usuários → editar). '}
            {missingRevenue && 'Algumas visitas não têm faturamento informado — o promotor preenche isso ao finalizar a visita.'}
          </p>
        </div>
      )}

      <div className="card overflow-x-auto">
        <h3 className="font-bold text-gray-900 mb-4">Por PDV</h3>
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
        ) : pdvSummary.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Nenhuma visita concluída no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="py-2 pr-4">PDV</th>
                <th className="py-2 pr-4">Visitas</th>
                <th className="py-2 pr-4">Custo</th>
                <th className="py-2 pr-4">Faturamento</th>
                <th className="py-2 pr-4">Líquido</th>
                <th className="py-2 pr-4">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {pdvSummary.map(p => (
                <tr key={p.pdvId} className="border-b border-gray-50 last:border-b-0">
                  <td className="py-2.5 pr-4 font-bold text-gray-800">{p.pdvName}<span className="text-gray-400 font-medium"> · {p.pdvCity}</span></td>
                  <td className="py-2.5 pr-4 text-gray-500">{p.visitCount}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{formatCurrency(p.cost)}{p.costPartial && <span className="text-[10px] text-amber-500 ml-1">parcial</span>}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{formatCurrency(p.revenue)}{p.revenuePartial && <span className="text-[10px] text-amber-500 ml-1">parcial</span>}</td>
                  <td className={`py-2.5 pr-4 font-bold ${p.net != null && p.net < 0 ? 'text-red-600' : p.net != null && p.net > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {formatCurrency(p.net)}
                  </td>
                  <td className="py-2.5 pr-4">
                    {p.ratio != null ? (
                      <span className={`inline-flex items-center gap-1 font-bold ${p.ratio >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {p.ratio >= 1 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {p.ratio.toFixed(2)}x
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow-x-auto">
        <h3 className="font-bold text-gray-900 mb-4">Por visita</h3>
        {visitCosts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma visita concluída no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">PDV</th>
                <th className="py-2 pr-4">Promotor</th>
                <th className="py-2 pr-4">Duração</th>
                <th className="py-2 pr-4">Custo</th>
                <th className="py-2 pr-4">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {visitCosts.map(v => (
                <tr key={v.visitId} className="border-b border-gray-50 last:border-b-0">
                  <td className="py-2.5 pr-4 text-gray-400 text-xs whitespace-nowrap">{format(new Date(v.completedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</td>
                  <td className="py-2.5 pr-4 font-bold text-gray-800">{v.pdvName}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{v.promotorName}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{v.durationHours.toFixed(1)}h</td>
                  <td className="py-2.5 pr-4 text-gray-700">{formatCurrency(v.cost)}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{formatCurrency(v.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
