import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { ChecklistItem, ChecklistItemType } from '../../types';
import { Plus, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, ListChecks, Trash2, Check, X } from 'lucide-react';

interface DraftItem {
  label: string;
  type: ChecklistItemType;
  requiredCount: string;
  required: boolean;
  options: string[];
}

const TYPE_LABEL: Record<ChecklistItemType, string> = {
  TEXTO: 'Resposta escrita',
  MULTIPLA_ESCOLHA: 'Múltipla escolha',
  SIM_NAO: 'Sim ou Não',
  FOTO: 'Foto',
};

function draftFromItem(item: ChecklistItem): DraftItem {
  return {
    label: item.label,
    type: item.type,
    requiredCount: String(item.requiredCount),
    required: item.required,
    options: item.options && item.options.length > 0 ? item.options : ['', ''],
  };
}

function TypeSelector({ value, onChange }: { value: ChecklistItemType; onChange: (type: ChecklistItemType) => void }) {
  return (
    <select
      className="input-field py-1.5 text-sm font-semibold w-48"
      value={value}
      onChange={e => onChange(e.target.value as ChecklistItemType)}
    >
      {(Object.keys(TYPE_LABEL) as ChecklistItemType[]).map(type => (
        <option key={type} value={type}>{TYPE_LABEL[type]}</option>
      ))}
    </select>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-5 shrink-0">{String.fromCharCode(65 + i)}.</span>
          <input
            className="flex-1 text-sm text-gray-800 border-0 border-b-2 border-gray-200 focus:border-pluma-600 focus:outline-none focus:ring-0 py-1 bg-transparent"
            placeholder={`Opção ${i + 1}`}
            value={opt}
            onChange={e => onChange(options.map((o, j) => (j === i ? e.target.value : o)))}
          />
          <button
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            disabled={options.length <= 2}
            className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed rounded"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...options, ''])}
        className="text-xs font-bold text-pluma-600 hover:text-pluma-800 ml-7"
      >
        + Adicionar opção
      </button>
    </div>
  );
}

function TypeSpecificFields({ draft, onChange }: { draft: DraftItem; onChange: (draft: DraftItem) => void }) {
  if (draft.type === 'FOTO') {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Máx. de fotos</label>
        <input
          type="number"
          min="1"
          className="w-16 text-sm font-semibold text-gray-800 border-0 border-b-2 border-gray-200 focus:border-pluma-600 focus:outline-none focus:ring-0 py-1 bg-transparent text-center"
          value={draft.requiredCount}
          onChange={e => onChange({ ...draft, requiredCount: e.target.value })}
        />
      </div>
    );
  }
  if (draft.type === 'MULTIPLA_ESCOLHA') {
    return <OptionsEditor options={draft.options} onChange={options => onChange({ ...draft, options })} />;
  }
  if (draft.type === 'SIM_NAO') {
    return <p className="text-xs text-gray-400">Promotor responde "Sim" ou "Não".</p>;
  }
  return <p className="text-xs text-gray-400">Promotor digita uma resposta livre.</p>;
}

function validateDraft(draft: DraftItem): string | null {
  if (!draft.label.trim()) return 'Descrição do item é obrigatória.';
  if (draft.type === 'FOTO') {
    const count = Number(draft.requiredCount);
    if (!Number.isFinite(count) || count < 1) return 'Quantidade máxima de fotos inválida.';
  }
  if (draft.type === 'MULTIPLA_ESCOLHA') {
    const filled = draft.options.map(o => o.trim()).filter(Boolean);
    if (filled.length < 2) return 'Múltipla escolha precisa de pelo menos 2 opções preenchidas.';
  }
  return null;
}

function draftToPayload(draft: DraftItem) {
  return {
    label: draft.label.trim(),
    type: draft.type,
    requiredCount: draft.requiredCount,
    required: draft.required,
    options: draft.type === 'MULTIPLA_ESCOLHA' ? draft.options.map(o => o.trim()).filter(Boolean) : undefined,
  };
}

function ChecklistItemEditor({ draft, onChange, error }: { draft: DraftItem; onChange: (draft: DraftItem) => void; error: string }) {
  return (
    <div className="flex-1 min-w-0 space-y-4">
      <input
        autoFocus
        className="w-full text-lg font-semibold text-gray-900 border-0 border-b-2 border-gray-200 focus:border-pluma-600 focus:outline-none focus:ring-0 py-1.5 bg-transparent"
        placeholder="Descrição do item"
        value={draft.label}
        onChange={e => onChange({ ...draft, label: e.target.value })}
      />
      <TypeSelector value={draft.type} onChange={type => onChange({ ...draft, type })} />
      <TypeSpecificFields draft={draft} onChange={onChange} />
      <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer w-fit">
        <input type="checkbox" checked={draft.required} onChange={e => onChange({ ...draft, required: e.target.checked })} />
        Obrigatório pra concluir a visita
      </label>
      {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
    </div>
  );
}

function ChecklistItemCard({
  item, index, total, reordering, expanded, onExpand, onCollapse, onMove, onSave, onDelete, onToggleActive,
}: {
  item: ChecklistItem;
  index: number;
  total: number;
  reordering: boolean;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onMove: (direction: -1 | 1) => void;
  onSave: (draft: DraftItem) => Promise<void>;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const [draft, setDraft] = useState<DraftItem>(() => draftFromItem(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Só reseta o rascunho quando o card abre — reload em background (ex: clicar em Ativo)
  // não pode descartar edição em andamento.
  useEffect(() => {
    if (expanded) {
      setDraft(draftFromItem(item));
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  async function handleDone(): Promise<boolean> {
    const validationError = validateDraft(draft);
    if (validationError) { setError(validationError); return false; }
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar item.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (!expanded) {
    return (
      <div
        onClick={onExpand}
        className="bg-white rounded-xl border border-gray-100 hover:border-pluma-200 hover:shadow-sm transition-all cursor-pointer flex items-center gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => onMove(-1)} disabled={index === 0 || reordering} className="p-1 text-gray-300 hover:text-pluma-600 disabled:opacity-20 rounded hover:bg-pluma-50">
            <ArrowUp size={13} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1 || reordering} className="p-1 text-gray-300 hover:text-pluma-600 disabled:opacity-20 rounded hover:bg-pluma-50">
            <ArrowDown size={13} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{item.label}</p>
        </div>
        <span className="text-xs text-gray-400 font-medium shrink-0">
          {item.type === 'FOTO' ? `Máx. ${item.requiredCount} foto${item.requiredCount > 1 ? 's' : ''}` : TYPE_LABEL[item.type]}
        </span>
        <span className={`shrink-0 ${item.required ? 'badge-blue' : 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500'}`}>
          {item.required ? 'Obrigatório' : 'Opcional'}
        </span>
        <span className={`shrink-0 ${item.active ? 'badge-green' : 'badge-red'}`}>{item.active ? 'Ativo' : 'Inativo'}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-l-4 border-pluma-600 border-y border-r border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-0.5 pt-1">
          <button onClick={() => onMove(-1)} disabled={index === 0 || reordering} className="p-1 text-gray-300 hover:text-pluma-600 disabled:opacity-20 rounded hover:bg-pluma-50">
            <ArrowUp size={13} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1 || reordering} className="p-1 text-gray-300 hover:text-pluma-600 disabled:opacity-20 rounded hover:bg-pluma-50">
            <ArrowDown size={13} />
          </button>
        </div>
        <ChecklistItemEditor draft={draft} onChange={setDraft} error={error} />
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Excluir item">
            <Trash2 size={16} />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button onClick={onToggleActive} className={`flex items-center gap-1.5 text-xs font-bold ${item.active ? 'text-green-600' : 'text-gray-400'}`}>
            {item.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            Ativo
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCollapse} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50" title="Cancelar">
            <X size={16} />
          </button>
          <button
            onClick={async () => { if (await handleDone()) onCollapse(); }}
            disabled={saving}
            className="btn-primary text-xs py-2 px-4"
          >
            <Check size={14} /> {saving ? 'Salvando...' : 'Concluído'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewItemCard({ onSave, onCancel }: { onSave: (draft: DraftItem) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState<DraftItem>({ label: '', type: 'FOTO', requiredCount: '1', required: true, options: ['', ''] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleDone() {
    const validationError = validateDraft(draft);
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border-l-4 border-pluma-600 border-y border-r border-gray-100 shadow-sm px-5 py-4">
      <ChecklistItemEditor draft={draft} onChange={setDraft} error={error} />
      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
        <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50" title="Cancelar">
          <X size={16} />
        </button>
        <button onClick={handleDone} disabled={saving} className="btn-primary text-xs py-2 px-4">
          <Check size={14} /> {saving ? 'Salvando...' : 'Concluído'}
        </button>
      </div>
    </div>
  );
}

export default function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ChecklistItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/checklist');
      setItems(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveItem(id: string, draft: DraftItem) {
    await api.put(`/checklist/${id}`, draftToPayload(draft));
    await load();
  }

  async function createItem(draft: DraftItem) {
    await api.post('/checklist', draftToPayload(draft));
    await load();
    setCreating(false);
  }

  async function toggleActive(item: ChecklistItem) {
    await api.patch(`/checklist/${item.id}/toggle`);
    load();
  }

  async function confirmDelete() {
    if (!itemToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/checklist/${itemToDelete.id}`);
      if (expandedId === itemToDelete.id) setExpandedId(null);
      setItemToDelete(null);
      load();
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Erro ao excluir item.');
    } finally {
      setDeleting(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setItems(reordered);
    setReordering(true);
    try {
      await api.patch('/checklist/reorder', { orderedIds: reordered.map(i => i.id) });
    } finally {
      setReordering(false);
      load();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ListChecks size={24} className="text-pluma-700" />
            Checklist de Fotos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Define as perguntas e fotos que o promotor precisa preencher pra concluir uma visita. Vale pra todos os PDVs.
          </p>
        </div>
        <button
          onClick={() => { setExpandedId(null); setCreating(true); }}
          disabled={creating}
          className="btn-primary disabled:opacity-40"
        >
          <Plus size={16} /> Novo Item
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : items.length === 0 && !creating ? (
        <div className="card text-center py-8 text-gray-400">
          Nenhum item cadastrado. Sem itens ativos, o promotor pode finalizar a visita sem nenhuma foto obrigatória.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <ChecklistItemCard
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              reordering={reordering}
              expanded={expandedId === item.id}
              onExpand={() => { setCreating(false); setExpandedId(item.id); }}
              onCollapse={() => setExpandedId(null)}
              onMove={direction => move(index, direction)}
              onSave={draft => saveItem(item.id, draft)}
              onDelete={() => { setDeleteError(''); setItemToDelete(item); }}
              onToggleActive={() => toggleActive(item)}
            />
          ))}
          {creating && <NewItemCard onSave={createItem} onCancel={() => setCreating(false)} />}
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir item?</h3>
            <p className="text-sm text-gray-500 mb-4">
              "{itemToDelete.label}" será removido permanentemente. Essa ação não pode ser desfeita.
            </p>
            {deleteError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{deleteError}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setItemToDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="flex-1 py-2.5 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
