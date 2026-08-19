import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { PromotorRanking } from '../../types';
import { Trophy, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import StarRating from '../../components/ui/StarRating';

function ConfirmHideModal({ promotor, loading, onConfirm, onCancel }: {
  promotor: PromotorRanking; loading: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Remover do ranking</h3>
            <p className="text-sm text-gray-500 mt-1">
              Tirar <span className="font-semibold text-gray-700">"{promotor.promotorName}"</span> da lista de ranking? A conta continua ativa normalmente, só deixa de entrar nesse cálculo.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary flex-1">Cancelar</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 text-white rounded-lg font-semibold text-sm py-2 hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<PromotorRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hiding, setHiding] = useState<PromotorRanking | null>(null);
  const [hideLoading, setHideLoading] = useState(false);
  const [hideError, setHideError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/ranking');
      setRanking(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar ranking.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function confirmHide() {
    if (!hiding) return;
    setHideLoading(true);
    setHideError('');
    try {
      await api.patch(`/admin/ranking/${hiding.promotorId}/hide`);
      setHiding(null);
      load();
    } catch (err: any) {
      setHideError(err.response?.data?.error || 'Erro ao remover promotor do ranking.');
    } finally {
      setHideLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <Trophy size={24} />
            </div>
            Ranking de Promotores
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Nota média das visitas avaliadas, taxa de cobertura e taxa de justificativa — acumulado desde o início.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="p-2.5 bg-pluma-800 text-white rounded-xl hover:bg-pluma-700 disabled:opacity-40 transition-colors self-start lg:self-auto">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold">{error}</div>
      )}
      {hideError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold">{hideError}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : ranking.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">Nenhum promotor ativo pra rankear.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Promotor</th>
                <th className="py-2 pr-4">Qualidade das fotos</th>
                <th className="py-2 pr-4">Cobertura</th>
                <th className="py-2 pr-4">Justificativas</th>
                <th className="py-2 pr-4">Score final</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.promotorId} className="border-b border-gray-50 last:border-b-0">
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                      i === 0 ? 'bg-gold-50 text-gold-700' : 'bg-gray-50 text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-bold text-gray-800">{r.promotorName}</td>
                  <td className="py-3 pr-4">
                    {r.ratedVisitsCount > 0 ? (
                      <div className="flex items-center gap-2">
                        <StarRating value={r.avgRating} size={15} />
                        <span className="text-xs text-gray-400">({r.ratedVisitsCount})</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">Sem avaliação</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {r.coverageRate != null ? (
                      <span className="font-semibold text-gray-700">{Math.round(r.coverageRate * 100)}%</span>
                    ) : (
                      <span className="text-xs text-gray-300">Sem rota</span>
                    )}
                    <span className="text-xs text-gray-400 ml-1">({r.visitadas}/{r.totalRotas})</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-gray-700">{r.justificadas}</span>
                    <span className="text-xs text-gray-400 ml-1">({Math.round(r.justificationRate * 100)}%)</span>
                  </td>
                  <td className="py-3 pr-4">
                    {r.finalScore != null ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-pluma-50 text-pluma-800">
                        {r.finalScore.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => { setHideError(''); setHiding(r); }}
                      title="Remover do ranking"
                      className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiding && (
        <ConfirmHideModal
          promotor={hiding}
          loading={hideLoading}
          onConfirm={confirmHide}
          onCancel={() => setHiding(null)}
        />
      )}
    </div>
  );
}
