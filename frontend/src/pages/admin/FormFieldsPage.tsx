import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { FormFieldConfig, FormType } from '../../types';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, ArrowUp, ArrowDown, SlidersHorizontal, Trash2, Lock } from 'lucide-react';

const FORM_TYPES: { key: FormType; title: string; description: string }[] = [
  { key: 'VALIDADE', title: 'Registrar Validade', description: 'Campos do formulário de validade de produto.' },
  { key: 'RUPTURA', title: 'Registrar Ruptura', description: 'Campos do formulário de ruptura de estoque.' },
  { key: 'PRECO', title: 'Pesquisa de Preço', description: 'Campos do formulário de pesquisa de preço.' },
];

const FIELD_TYPE_LABEL: Record<string, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  DATE: 'Data',
  CURRENCY: 'Moeda',
  PHOTO: 'Foto',
};

function EditFieldModal({ field, onClose, onSaved }: { field: FormFieldConfig; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(field.label);
  const [required, setRequired] = useState(field.required);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put(`/form-fields/${field.id}`, { label, required });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar campo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">Editar Campo</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rótulo *</label>
            <input className="input-field" required value={label} onChange={e => setLabel(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={required}
              disabled={field.lockedRequired}
              onChange={e => setRequired(e.target.checked)}
            />
            Obrigatório
            {field.lockedRequired && <span className="text-xs text-gray-400">(sempre obrigatório)</span>}
          </label>
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

type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY';

function NewFieldModal({ formType, onClose, onSaved }: { formType: FormType; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('TEXT');
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/form-fields', { formType, label, fieldType, required });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar campo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">Novo Campo</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rótulo *</label>
            <input className="input-field" required placeholder="Ex: Observação" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select className="input-field" value={fieldType} onChange={e => setFieldType(e.target.value as CustomFieldType)}>
              <option value="TEXT">Texto</option>
              <option value="NUMBER">Número</option>
              <option value="DATE">Data</option>
              <option value="CURRENCY">Moeda</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
            Obrigatório
          </label>
          <p className="text-xs text-gray-400">
            Esse campo é só informativo — não entra em nenhum cálculo ou relatório do sistema.
          </p>
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

function FormFieldsSection({ formType, title, description, fields, reload }: {
  formType: FormType; title: string; description: string; fields: FormFieldConfig[]; reload: () => void;
}) {
  const [editField, setEditField] = useState<FormFieldConfig | null>(null);
  const [newFieldOpen, setNewFieldOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<FormFieldConfig | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [reordering, setReordering] = useState(false);

  async function toggleActive(field: FormFieldConfig) {
    if (field.lockedActive && field.active) return;
    await api.put(`/form-fields/${field.id}`, { active: !field.active });
    reload();
  }

  async function confirmDelete() {
    if (!fieldToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/form-fields/${fieldToDelete.id}`);
      setFieldToDelete(null);
      reload();
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Erro ao excluir campo.');
    } finally {
      setDeleting(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const reordered = [...fields];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setReordering(true);
    try {
      await api.patch('/form-fields/reorder', { orderedIds: reordered.map(f => f.id) });
    } finally {
      setReordering(false);
      reload();
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <button onClick={() => setNewFieldOpen(true)} className="btn-secondary text-xs py-1.5 px-3">
          <Plus size={14} /> Novo Campo
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-16">Ordem</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">Rótulo</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-24">Tipo</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-24">Obrigatório</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-20">Ativo</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {fields.map((field, index) => (
            <tr key={field.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1">
                  <button onClick={() => move(index, -1)} disabled={index === 0 || reordering} className="p-1 text-gray-400 hover:text-pluma-600 disabled:opacity-20 rounded hover:bg-pluma-50">
                    <ArrowUp size={13} />
                  </button>
                  <button onClick={() => move(index, 1)} disabled={index === fields.length - 1 || reordering} className="p-1 text-gray-400 hover:text-pluma-600 disabled:opacity-20 rounded hover:bg-pluma-50">
                    <ArrowDown size={13} />
                  </button>
                </div>
              </td>
              <td className="px-4 py-2.5 font-medium text-gray-800">
                <div className="flex items-center gap-1.5">
                  {field.label}
                  {!field.core && <span className="text-[10px] font-semibold text-pluma-700 bg-pluma-50 border border-pluma-100 rounded-full px-1.5 py-0.5">extra</span>}
                </div>
              </td>
              <td className="px-4 py-2.5 text-gray-500">{FIELD_TYPE_LABEL[field.fieldType] || field.fieldType}</td>
              <td className="px-4 py-2.5 text-gray-600">{field.required ? 'Sim' : 'Não'}</td>
              <td className="px-4 py-2.5">
                <button
                  onClick={() => toggleActive(field)}
                  disabled={field.lockedActive && field.active}
                  className={`p-1 rounded ${field.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={field.lockedActive && field.active ? 'Esse campo alimenta um cálculo do sistema e não pode ser desativado' : undefined}
                >
                  {field.lockedActive && field.active ? <Lock size={16} /> : field.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setEditField(field)} className="p-1.5 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50">
                    <Pencil size={14} />
                  </button>
                  {!field.core && (
                    <button onClick={() => { setDeleteError(''); setFieldToDelete(field); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editField && <EditFieldModal field={editField} onClose={() => setEditField(null)} onSaved={reload} />}
      {newFieldOpen && <NewFieldModal formType={formType} onClose={() => setNewFieldOpen(false)} onSaved={reload} />}

      {fieldToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir campo?</h3>
            <p className="text-sm text-gray-500 mb-4">
              "{fieldToDelete.label}" será removido permanentemente do formulário. Registros já salvos mantêm o valor no histórico.
            </p>
            {deleteError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{deleteError}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setFieldToDelete(null)} className="btn-secondary flex-1">Cancelar</button>
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

export default function FormFieldsPage() {
  const [fields, setFields] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/form-fields');
      setFields(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <SlidersHorizontal size={24} className="text-pluma-700" />
          Campos dos Formulários
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Edite os rótulos de Validade, Ruptura e Pesquisa de Preço, e crie campos extras. Campos com <Lock size={12} className="inline -mt-0.5" /> alimentam cálculo do sistema e não podem ser desativados.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : (
        <div className="space-y-6">
          {FORM_TYPES.map(ft => (
            <FormFieldsSection
              key={ft.key}
              formType={ft.key}
              title={ft.title}
              description={ft.description}
              fields={fields.filter(f => f.formType === ft.key)}
              reload={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
