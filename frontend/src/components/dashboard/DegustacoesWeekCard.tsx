import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { DegustacaoSolicitacao } from '../../types';
import { UtensilsCrossed, ChevronLeft, ChevronRight, ClipboardList, ArrowUpRight, Trash2, AlertTriangle } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DAY_COLORS = ['#EAB308', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4'];

const STATUS_LABEL: Record<DegustacaoSolicitacao['status'], string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
};

const STATUS_BADGE: Record<DegustacaoSolicitacao['status'], string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  aprovada: 'bg-green-50 text-green-700 border-green-200',
  reprovada: 'bg-red-50 text-red-700 border-red-200',
};

function getWeekStart(weekOffset: number): Date {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return addDays(todayMidnight, -todayMidnight.getDay() + weekOffset * 7);
}

function ConfirmDeleteDegustacaoModal({ solicitacao, loading, onConfirm, onCancel }: {
  solicitacao: DegustacaoSolicitacao; loading: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Excluir solicitação</h3>
            <p className="text-sm text-gray-500 mt-1">
              Excluir a solicitação de degustação da loja <span className="font-semibold text-gray-700">"{solicitacao.store}"</span>? Essa ação não pode ser desfeita.
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
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DayCard({ dayOfWeek, date, items, isToday, onDelete }: {
  dayOfWeek: number;
  date: Date;
  items: DegustacaoSolicitacao[];
  isToday: boolean;
  onDelete: (item: DegustacaoSolicitacao) => void;
}) {
  const dayColor = DAY_COLORS[dayOfWeek];

  return (
    <div className={`card min-h-[260px] flex flex-col transition-all ${isToday ? 'border-pluma-300 shadow-glow-pluma' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{DAYS_SHORT[dayOfWeek]} · {format(date, 'dd/MM')}</span>
          <h4 className="text-sm font-black text-gray-900 tracking-tight">{DAYS[dayOfWeek]}</h4>
        </div>
        {isToday && (
          <span className="text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-gold-50 text-gold-700 border border-gold-200">
            Hoje
          </span>
        )}
      </div>

      <div className="space-y-2 flex-1">
        {items.length === 0 ? (
          <div className="flex items-center gap-1.5 py-3 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            <p className="text-xs text-gray-300 font-medium">Sem degustação nesse dia</p>
          </div>
        ) : (
          items.map((item, i) => (
            <div key={item.id} className="border-b border-gray-100 last:border-b-0 py-2.5">
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-bold text-gray-800 leading-snug break-words flex items-baseline gap-1.5">
                  <span className="shrink-0 text-[10px] font-black" style={{ color: dayColor }}>{i + 1}</span>
                  {item.store}
                </p>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  title="Excluir"
                  className="shrink-0 p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-xs text-gray-400 leading-tight ml-4">
                {item.city} · {item.eventTime}
              </p>
              <div className="ml-4 mt-1 space-y-1">
                <p className="text-xs text-gray-500 leading-tight break-words">Solicitado por {item.requesterName}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function DegustacoesWeekCard() {
  const [solicitacoes, setSolicitacoes] = useState<DegustacaoSolicitacao[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | DegustacaoSolicitacao['status']>('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<DegustacaoSolicitacao | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const todayDate = new Date();

  async function load(dates: Date[]) {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        from: format(dates[0], 'yyyy-MM-dd'),
        to: format(dates[6], 'yyyy-MM-dd'),
      };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/admin/degustacoes', { params });
      setSolicitacoes(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar degustações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(weekDates); }, [weekOffset, statusFilter]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/admin/degustacoes/${deleting.id}`);
      setDeleting(null);
      load(weekDates);
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Erro ao excluir solicitação de degustação.');
    } finally {
      setDeleteLoading(false);
    }
  }

  const byDay = useMemo(() => {
    const grouped: Record<number, DegustacaoSolicitacao[]> = {};
    for (let d = 0; d < 7; d++) grouped[d] = [];
    for (const s of solicitacoes) {
      const idx = weekDates.findIndex(d => format(d, 'yyyy-MM-dd') === s.date.slice(0, 10));
      if (idx !== -1) grouped[idx].push(s);
    }
    return grouped;
  }, [solicitacoes, weekDates]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <UtensilsCrossed size={24} />
            </div>
            Degustações
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Solicitações de degustação agendadas nesta semana.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-pluma-50 text-pluma-800 rounded-xl text-xs font-bold border border-pluma-100">
            <ClipboardList size={14} />
            {solicitacoes.length} degustaç{solicitacoes.length !== 1 ? 'ões' : 'ão'} na semana
          </div>
          <Link
            to="/admin/degustacoes"
            className="flex items-center gap-1.5 px-4 py-2 bg-pluma-800 text-white rounded-xl text-xs font-bold hover:bg-pluma-700 transition-colors"
          >
            Ver todas <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div className="card">
        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
          Status
        </label>
        <select
          className="input-field max-w-sm py-3 text-sm font-bold"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as '' | DegustacaoSolicitacao['status'])}
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovada">Aprovada</option>
          <option value="reprovada">Reprovada</option>
        </select>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-pluma-200 hover:text-pluma-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-black text-gray-800 tracking-tight min-w-[170px] text-center">
              Semana de {format(weekDates[0], 'dd/MM', { locale: ptBR })} a {format(weekDates[6], 'dd/MM', { locale: ptBR })}
            </p>
            <button
              type="button"
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-pluma-200 hover:text-pluma-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {weekOffset !== 0 && (
            <button type="button" onClick={() => setWeekOffset(0)} className="text-xs font-bold text-pluma-600 hover:text-pluma-800">
              Voltar pra hoje
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold">{error}</div>
      )}
      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold">{deleteError}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 animate-fade-in">
          {DAYS.map((_, dayOfWeek) => (
            <DayCard
              key={dayOfWeek}
              dayOfWeek={dayOfWeek}
              date={weekDates[dayOfWeek]}
              items={byDay[dayOfWeek] || []}
              isToday={isSameDay(weekDates[dayOfWeek], todayDate)}
              onDelete={item => { setDeleteError(''); setDeleting(item); }}
            />
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDeleteDegustacaoModal
          solicitacao={deleting}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
