import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { PromotorRanking } from '../../types';
import { Trophy, RefreshCw } from 'lucide-react';
import StarRating from '../../components/ui/StarRating';

export default function RankingPage() {
  const [ranking, setRanking] = useState<PromotorRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
