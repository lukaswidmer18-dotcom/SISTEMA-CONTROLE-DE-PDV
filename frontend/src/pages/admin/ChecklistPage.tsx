import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { ChecklistItem } from '../../types';
import { Plus, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, ListChecks, Trash2, Check, X } from 'lucide-react';

interface DraftItem {
  label: string;
  requiredCount: string;
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
  const [draft, setDraft] = useState<DraftItem>({ label: item.label, requiredCount: String(item.requiredCount) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (expanded) {
      setDraft({ label: item.label, requiredCount: String(item.requiredCount) });
      setError('');
    }
  }, [expanded, item]);

  async function handleDone() {
    if (!draft.label.trim()) { setError('Descrição do item é obrigatória.'); return false; }
    const count = Number(draft.requiredCount);
    if (!Number.isFinite(count) || count < 1) { setError('Quantidade máxima de fotos inválida.'); return false; }
    setSaving(true);
    setError('');
    try {
      await onSave({ label: draft.label.trim(), requiredCount: draft.requiredCount });
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
        <span className="text-xs text-gray-400 font-medium shrink-0">Máx. {item.requiredCount} foto{item.requiredCount > 1 ? 's' : ''}</span>
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
        <div className="flex-1 min-w-0 space-y-4">
          <input
            autoFocus
            className="w-full text-lg font-semibold text-gray-900 border-0 border-b-2 border-gray-200 focus:border-pluma-600 focus:outline-none focus:ring-0 py-1.5 bg-transparent"
            placeholder="Descrição do item"
            value={draft.label}
            onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Máx. de fotos</label>
            <input
              type="number"
              min="1"
              className="w-16 text-sm font-semibold text-gray-800 border-0 border-b-2 border-gray-200 focus:border-pluma-600 focus:outline-none focus:ring-0 py-1 bg-transparent text-center"
              value={draft.requiredCount}
              onChange={e => setDraft(d => ({ ...d, requiredCount: e.target.value }))}
            />
          </div>
          <p className="text-xs text-gray-400">A 1ª foto desse item é sempre obrigatória. Fotos extras, até esse número, são opcionais.</p>
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        </div>
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
  const [draft, setDraft] = useState<DraftItem>({ label: '', requiredCount: '1' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleDone() {
    if (!draft.label.trim()) { setError('Descrição do item é obrigatória.'); return; }
    const count = Number(draft.requiredCount);
    if (!Number.isFinite(count) || count < 1) { setError('Quantidade máxima de fotos inválida.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ label: draft.label.trim(), requiredCount: draft.requiredCount });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border-l-4 border-pluma-600 border-y border-r border-gray-100 shadow-sm px-5 py-4">
      <div className="space-y-4">
        <input
          autoFocus
          className="w-full text-lg font-semibold text-gray-900 border-0 border-b-2 border-gray-200 focus:border-pluma-600 focus:outline-none focus:ring-0 py-1.5 bg-transparent"
          placeholder="Ex: Foto da fachada do PDV"
          value={draft.label}
          onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Máx. de fotos</label>
          <input
            type="number"
            min="1"
            className="w-16 text-sm font-semibold text-gray-800 border-0 border-b-2 border-gray-200 focus:border-pluma-600 focus:outline-none focus:ring-0 py-1 bg-transparent text-center"
            value={draft.requiredCount}
            onChange={e => setDraft(d => ({ ...d, requiredCount: e.target.value }))}
          />
        </div>
        <p className="text-xs text-gray-400">A 1ª foto desse item é sempre obrigatória. Fotos extras, até esse número, são opcionais.</p>
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
      </div>
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
    await api.put(`/checklist/${id}`, { label: draft.label, requiredCount: draft.requiredCount });
    await load();
  }

  async function createItem(draft: DraftItem) {
    await api.post('/checklist', { label: draft.label, requiredCount: draft.requiredCount });
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
            Define os itens que o promotor precisa fotografar pra concluir uma visita. Vale pra todos os PDVs.
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
