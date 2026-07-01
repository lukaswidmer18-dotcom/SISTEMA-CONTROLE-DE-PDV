import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { ChecklistItem } from '../../types';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, ArrowUp, ArrowDown, ListChecks, Trash2 } from 'lucide-react';

function ChecklistModal({ item, onClose, onSaved }: { item?: ChecklistItem | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(item);
  const [label, setLabel] = useState(item?.label || '');
  const [requiredCount, setRequiredCount] = useState(String(item?.requiredCount ?? 1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit && item) {
        await api.put(`/checklist/${item.id}`, { label, requiredCount });
      } else {
        await api.post('/checklist', { label, requiredCount });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar item.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">{isEdit ? 'Editar Item' : 'Novo Item do Checklist'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do item *</label>
            <input
              className="input-field"
              required
              placeholder="Ex: Foto da fachada do PDV"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de fotos exigidas *</label>
            <input
              type="number"
              min="1"
              className="input-field"
              required
              value={requiredCount}
              onChange={e => setRequiredCount(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Quantas fotos o promotor precisa enviar pra esse item ser considerado completo.</p>
          </div>
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

export default function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item?: ChecklistItem | null }>({ open: false });
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
        <button onClick={() => setModal({ open: true })} className="btn-primary">
          <Plus size={16} /> Novo Item
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          Nenhum item cadastrado. Sem itens ativos, o promotor pode finalizar a visita sem nenhuma foto obrigatória.
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Ordem</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Fotos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || reordering}
                        className="p-1 text-gray-400 hover:text-pluma-600 disabled:opacity-20 rounded hover:bg-pluma-50"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        disabled={index === items.length - 1 || reordering}
                        className="p-1 text-gray-400 hover:text-pluma-600 disabled:opacity-20 rounded hover:bg-pluma-50"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.label}</td>
                  <td className="px-4 py-3 text-gray-600">{item.requiredCount}</td>
                  <td className="px-4 py-3">
                    <span className={item.active ? 'badge-green' : 'badge-red'}>{item.active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setModal({ open: true, item })} className="p-1.5 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => toggleActive(item)} className={`p-1.5 rounded ${item.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                        {item.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => { setDeleteError(''); setItemToDelete(item); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <ChecklistModal item={modal.item} onClose={() => setModal({ open: false })} onSaved={load} />
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
