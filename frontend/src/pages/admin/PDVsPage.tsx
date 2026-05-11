import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { PDV } from '../../types';
import { Plus, Pencil, ToggleLeft, ToggleRight, X } from 'lucide-react';

function PDVModal({ pdv, onClose, onSaved }: { pdv?: PDV | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(pdv);
  const [form, setForm] = useState({ 
    name: pdv?.name || '', 
    address: pdv?.address || '', 
    city: pdv?.city || '',
    state: pdv?.state || ''
  });
  const UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit && pdv) {
        await api.put(`/pdvs/${pdv.id}`, form);
      } else {
        await api.post('/pdvs', form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar PDV.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">{isEdit ? 'Editar PDV' : 'Novo PDV'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input className="input-field" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input className="input-field" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input className="input-field" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
            <select 
              className="input-field" 
              value={form.state} 
              onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
            >
              <option value="">Selecione...</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
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

export default function PDVsPage() {
  const [pdvs, setPdvs] = useState<PDV[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; pdv?: PDV | null }>({ open: false });

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/pdvs');
      setPdvs(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(pdv: PDV) {
    await api.patch(`/pdvs/${pdv.id}/toggle`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">PDVs</h2>
        <button onClick={() => setModal({ open: true })} className="btn-primary">
          <Plus size={16} /> Novo PDV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : pdvs.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">Nenhum PDV cadastrado.</div>
      ) : (
        <>
          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {pdvs.map(p => (
              <div key={p.id} className="card">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                    {(p.address || p.city || p.state) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[p.address, p.city, p.state].filter(Boolean).join(' — ')}
                      </p>
                    )}
                  </div>
                  <span className={p.active ? 'badge-green' : 'badge-red'}>{p.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => setModal({ open: true, pdv: p })} className="p-2 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => toggleActive(p)} className={`p-2 rounded ${p.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    {p.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tabela — desktop */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Endereço</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">UF</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pdvs.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.address || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.city || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.state || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={p.active ? 'badge-green' : 'badge-red'}>{p.active ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setModal({ open: true, pdv: p })} className="p-1.5 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => toggleActive(p)} className={`p-1.5 rounded ${p.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                          {p.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal.open && (
        <PDVModal pdv={modal.pdv} onClose={() => setModal({ open: false })} onSaved={load} />
      )}
    </div>
  );
}
