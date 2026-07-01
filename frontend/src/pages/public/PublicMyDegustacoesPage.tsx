import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { DegustacaoSolicitacao } from '../../types';
import { ClipboardList, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PublicMyDegustacoesPage() {
  const [nome, setNome] = useState('');
  const [solicitacoes, setSolicitacoes] = useState<DegustacaoSolicitacao[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get('/degustacoes/public/minhas', { params: { nome: nome.trim() } });
      setSolicitacoes(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao buscar solicitações.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-gold-500 text-[10px] font-semibold tracking-[0.25em] uppercase">Grupo Pluma</p>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-2 mt-1">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <ClipboardList size={24} />
            </div>
            Minhas Solicitações
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Digite o nome que você usou ao solicitar pra ver o histórico.
          </p>
        </div>

        <form onSubmit={handleSearch} className="card flex gap-3">
          <input type="text" required placeholder="Seu nome" className="input-field py-3 text-sm font-bold flex-1" value={nome} onChange={e => setNome(e.target.value)} />
          <button type="submit" disabled={loading} className="btn-primary px-5 flex items-center gap-2 font-bold">
            <Search size={16} /> {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold">{error}</div>
        )}

        {solicitacoes !== null && (
          solicitacoes.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">Nenhuma solicitação encontrada com esse nome.</div>
          ) : (
            <div className="space-y-3">
              {solicitacoes.map(s => (
                <div key={s.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{s.store}</p>
                      <p className="text-sm text-gray-500">{s.productEvent}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full shrink-0">
                      {format(new Date(s.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <p><span className="font-bold text-gray-400 uppercase text-[10px]">Cidade</span><br />{s.city}</p>
                    <p><span className="font-bold text-gray-400 uppercase text-[10px]">Horário</span><br />{s.eventTime}</p>
                    <p className="col-span-2"><span className="font-bold text-gray-400 uppercase text-[10px]">Endereço</span><br />{s.address}</p>
                    {s.supervisor && <p className="col-span-2"><span className="font-bold text-gray-400 uppercase text-[10px]">Supervisor</span><br />{s.supervisor}</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        <Link to="/solicitar-degustacao" className="flex items-center justify-center gap-2 text-sm font-bold text-pluma-600 hover:text-pluma-800 transition-colors">
          <ArrowLeft size={16} />
          Nova solicitação
        </Link>
      </div>
    </div>
  );
}
