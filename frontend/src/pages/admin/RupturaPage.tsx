import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { RupturaAlerta, RupturaRiskLevel } from '../../types';
import { PackageX, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RISK_STYLE: Record<RupturaRiskLevel, { label: string; badge: string }> = {
  CRITICO: { label: 'Crítico', badge: 'bg-red-50 text-red-600' },
  ATENCAO: { label: 'Atenção', badge: 'bg-amber-50 text-amber-600' },
  OK: { label: 'OK', badge: 'bg-emerald-50 text-emerald-600' },
};

export default function RupturaPage() {
  const [alertas, setAlertas] = useState<RupturaAlerta[]>([]);
  const [limiteEstoque, setLimiteEstoque] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/ruptura/alertas', { params: { limiteEstoque } });
      setAlertas(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar alertas de ruptura.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [limiteEstoque]);

  const counts = useMemo(() => ({
    CRITICO: alertas.filter(a => a.riskLevel === 'CRITICO').length,
    ATENCAO: alertas.filter(a => a.riskLevel === 'ATENCAO').length,
    OK: alertas.filter(a => a.riskLevel === 'OK').length,
  }), [alertas]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <PackageX size={24} />
            </div>
            Ruptura
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Última leitura de estoque informada por PDV e produto. Crítico = zero na gôndola agora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
            Estoque baixo se gôndola+depósito ≤
            <input
              type="number"
              min={0}
              value={limiteEstoque}
              onChange={e => setLimiteEstoque(Math.max(0, Number(e.target.value)))}
              className="input-field w-16 py-1.5 text-xs text-center"
            />
          </label>
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
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600"><AlertTriangle size={20} /></div>
          <div><p className="text-2xl font-black text-gray-900">{counts.CRITICO}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Críticos</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><AlertTriangle size={20} /></div>
          <div><p className="text-2xl font-black text-gray-900">{counts.ATENCAO}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Atenção</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><PackageX size={20} /></div>
          <div><p className="text-2xl font-black text-gray-900">{counts.OK}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Estoque OK</p></div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
        ) : alertas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Nenhum registro de estoque ainda. Assim que promotores começarem a informar gôndola/depósito nas visitas, aparece aqui.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="py-2 pr-4">Risco</th>
                <th className="py-2 pr-4">PDV</th>
                <th className="py-2 pr-4">Produto</th>
                <th className="py-2 pr-4">Gôndola</th>
                <th className="py-2 pr-4">Depósito</th>
                <th className="py-2 pr-4">P/ Troca</th>
                <th className="py-2 pr-4">Promotor</th>
                <th className="py-2 pr-4">Última leitura</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map(a => (
                <tr key={a.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="py-2.5 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${RISK_STYLE[a.riskLevel].badge}`}>
                      {RISK_STYLE[a.riskLevel].label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-bold text-gray-800">{a.pdvName}<span className="text-gray-400 font-medium"> · {a.pdvCity}</span></td>
                  <td className="py-2.5 pr-4 text-gray-700">{a.productName}</td>
                  <td className={`py-2.5 pr-4 font-bold ${a.qtyGondola === 0 ? 'text-red-600' : 'text-gray-700'}`}>{a.qtyGondola}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{a.qtyDeposito}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{a.qtySeparadoTroca}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{a.promotorName}</td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">{format(new Date(a.checkedAt), 'dd/MM HH:mm', { locale: ptBR })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
