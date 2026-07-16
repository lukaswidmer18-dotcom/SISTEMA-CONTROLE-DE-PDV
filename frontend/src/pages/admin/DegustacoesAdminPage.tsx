import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { DegustacaoSolicitacao } from '../../types';
import { UtensilsCrossed, RefreshCw, FileText, Check, X, Link2, Copy, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

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

const EDIT_FIELDS: { key: keyof EditForm; label: string; type: 'text' | 'date' | 'textarea' }[] = [
  { key: 'requesterName', label: 'Supervisor', type: 'text' },
  { key: 'date', label: 'Data', type: 'date' },
  { key: 'city', label: 'Cidade', type: 'text' },
  { key: 'address', label: 'Endereço', type: 'text' },
  { key: 'store', label: 'Loja', type: 'text' },
  { key: 'clifor', label: 'Clifor', type: 'text' },
  { key: 'productEvent', label: 'Produto/Evento', type: 'text' },
  { key: 'eventTime', label: 'Horário', type: 'text' },
  { key: 'supervisor', label: 'Vendedor', type: 'text' },
  { key: 'sellerName', label: 'Promotor', type: 'text' },
  { key: 'justification', label: 'Justificativa', type: 'textarea' },
];

interface EditForm {
  requesterName: string;
  date: string;
  city: string;
  address: string;
  store: string;
  clifor: string;
  productEvent: string;
  eventTime: string;
  supervisor: string;
  sellerName: string;
  justification: string;
}

function toEditForm(s: DegustacaoSolicitacao): EditForm {
  return {
    requesterName: s.requesterName,
    date: s.date.slice(0, 10),
    city: s.city,
    address: s.address,
    store: s.store,
    clifor: s.clifor,
    productEvent: s.productEvent,
    eventTime: s.eventTime,
    supervisor: s.supervisor,
    sellerName: s.sellerName,
    justification: s.justification,
  };
}

function EditDegustacaoModal({ solicitacao, onClose, onSaved }: {
  solicitacao: DegustacaoSolicitacao; onClose: () => void; onSaved: (updated: DegustacaoSolicitacao) => void;
}) {
  const [form, setForm] = useState<EditForm>(toEditForm(solicitacao));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.put(`/admin/degustacoes/${solicitacao.id}`, form);
      onSaved(data.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar solicitação de degustação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">Editar Degustação</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {EDIT_FIELDS.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label} *</label>
              {field.type === 'textarea' ? (
                <textarea
                  className="input-field"
                  rows={3}
                  required
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              ) : (
                <input
                  type={field.type}
                  className="input-field"
                  required
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
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

export default function DegustacoesAdminPage() {
  const [solicitacoes, setSolicitacoes] = useState<DegustacaoSolicitacao[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | DegustacaoSolicitacao['status']>('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [editing, setEditing] = useState<DegustacaoSolicitacao | null>(null);
  const [deleting, setDeleting] = useState<DegustacaoSolicitacao | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  async function copyRequestLink() {
    const url = `${window.location.origin}/solicitar-degustacao`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar o link. Copie manualmente: ' + url);
    }
  }

  const debouncedSearch = useDebouncedValue(search, 300);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.q = debouncedSearch;
      if (filterStatus) params.status = filterStatus;
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

  useEffect(() => { load(); }, [debouncedSearch, filterStatus, filterFrom, filterTo]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus, filterFrom, filterTo]);

  const totalPages = Math.max(1, Math.ceil(solicitacoes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => solicitacoes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [solicitacoes, currentPage]
  );

  async function updateStatus(id: string, status: 'aprovada' | 'reprovada') {
    setUpdatingId(id);
    setError('');
    try {
      const { data } = await api.patch(`/admin/degustacoes/${id}/status`, { status });
      setSolicitacoes(prev => prev.map(s => (s.id === id ? data.data : s)));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar status da degustação.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setError('');
    setDeletingId(deleting.id);
    try {
      await api.delete(`/admin/degustacoes/${deleting.id}`);
      setSolicitacoes(prev => prev.filter(s => s.id !== deleting.id));
      setDeleting(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao excluir solicitação de degustação.');
    } finally {
      setDeletingId(null);
    }
  }

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
          <button
            onClick={copyRequestLink}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 bg-pluma-50 text-pluma-700 border border-pluma-200 rounded-xl text-xs font-bold hover:bg-pluma-100 transition-colors"
          >
            {linkCopied ? <Check size={14} /> : <Link2 size={14} />}
            {linkCopied ? 'Link copiado!' : 'Compartilhar link de solicitação'}
            {!linkCopied && <Copy size={12} className="opacity-60" />}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 w-full lg:w-auto lg:min-w-[640px]">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cidade, loja, endereço, clifor, produto, supervisor, vendedor, promotor, justificativa..."
              className="input-field text-sm py-2.5 pl-9 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field text-sm py-2.5"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as '' | DegustacaoSolicitacao['status'])}
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovada</option>
            <option value="reprovada">Reprovada</option>
          </select>
          <input type="date" title="Data inicial" className="input-field text-sm py-2.5" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          <div className="flex gap-2">
            <input type="date" title="Data final" className="input-field text-sm py-2.5 flex-1" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            <button onClick={load} disabled={loading} className="p-2.5 bg-pluma-800 text-white rounded-xl hover:bg-pluma-700 disabled:opacity-40 transition-colors flex items-center justify-center shrink-0">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
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
                <th className="py-2 pr-4">Clifor</th>
                <th className="py-2 pr-4">Produto/Evento</th>
                <th className="py-2 pr-4">Horário</th>
                <th className="py-2 pr-4">Supervisor</th>
                <th className="py-2 pr-4">Vendedor</th>
                <th className="py-2 pr-4">Promotor</th>
                <th className="py-2 pr-4">Justificativa</th>
                <th className="py-2 pr-4">Pedidos (PDF)</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="py-2.5 pr-4 font-bold text-gray-800 whitespace-nowrap">{format(new Date(s.date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{s.city}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{s.address}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{s.store}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{s.clifor}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{s.productEvent}</td>
                  <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{s.eventTime}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{s.requesterName}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{s.supervisor || '-'}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{s.sellerName || '-'}</td>
                  <td className="py-2.5 pr-4 text-gray-500 max-w-[220px] truncate" title={s.justification}>{s.justification || '-'}</td>
                  <td className="py-2.5 pr-4">
                    {s.documentPath ? (
                      <a
                        href={s.documentPath}
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
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_BADGE[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {s.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => updateStatus(s.id, 'aprovada')}
                            disabled={updatingId === s.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-40 transition-colors"
                          >
                            <Check size={13} /> Aprovar
                          </button>
                          <button
                            onClick={() => updateStatus(s.id, 'reprovada')}
                            disabled={updatingId === s.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-40 transition-colors"
                          >
                            <X size={13} /> Reprovar
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEditing(s)}
                        className="p-1.5 text-gray-500 hover:text-pluma-600 rounded-lg hover:bg-pluma-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleting(s)}
                        disabled={deletingId === s.id}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && solicitacoes.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs text-gray-400 font-semibold">
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}
              –{Math.min(currentPage * PAGE_SIZE, solicitacoes.length)} de {solicitacoes.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-gray-600">Página {currentPage} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <EditDegustacaoModal
          solicitacao={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => setSolicitacoes(prev => prev.map(s => (s.id === updated.id ? updated : s)))}
        />
      )}

      {deleting && (
        <ConfirmDeleteDegustacaoModal
          solicitacao={deleting}
          loading={deletingId === deleting.id}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
