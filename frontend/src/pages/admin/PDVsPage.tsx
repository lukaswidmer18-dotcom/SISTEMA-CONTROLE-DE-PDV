import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { PDV } from '../../types';
import { Plus, Pencil, ToggleLeft, ToggleRight, Trash2, X, MapPin, MapPinOff, CheckCircle2, PencilLine } from 'lucide-react';

function isGeofenceReady(pdv: PDV): boolean {
  return pdv.latitude != null && pdv.longitude != null && pdv.radiusMeters != null;
}

function PDVModal({ pdv, onClose, onSaved }: { pdv?: PDV | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(pdv);
  const [form, setForm] = useState({
    name: pdv?.name || '',
    address: pdv?.address || '',
    city: pdv?.city || '',
    state: pdv?.state || '',
    radiusMeters: pdv?.radiusMeters ? String(pdv.radiusMeters) : '',
    manualCoord: ''
  });
  const UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  // Guarda o id assim que o PDV é criado, pra resubmissões (corrigindo endereço após falha de geocode) virarem update, não outro create.
  const [savedId, setSavedId] = useState<string | undefined>(pdv?.id);
  const hasSavedCoord = pdv?.latitude != null && pdv?.longitude != null;
  // Campo de coordenada manual só fica editável sob demanda quando o PDV já tem coordenada salva,
  // pra não dar a impressão de que o valor sumiu (ele reabre vazio de propósito — ver comentário no input abaixo).
  const [editingCoord, setEditingCoord] = useState(!hasSavedCoord);

  function parseManualCoord(value: string): { latitude: number; longitude: number } | null {
    const trimmed = value.trim();
    if (!trimmed) return { latitude: NaN, longitude: NaN }; // sentinel: campo vazio, não null (null = inválido)
    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length !== 2) return null;
    const latitude = Number(parts[0]);
    const longitude = Number(parts[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setWarning('');

    const manual = parseManualCoord(form.manualCoord);
    if (manual === null) {
      setError("Coordenada manual inválida. Use o formato 'lat, lng', ex: -24.9555, -53.4561.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { name: form.name, address: form.address, city: form.city, state: form.state, radiusMeters: form.radiusMeters };
      if (!Number.isNaN(manual.latitude)) {
        payload.latitude = manual.latitude;
        payload.longitude = manual.longitude;
      }

      const { data } = savedId
        ? await api.put(`/pdvs/${savedId}`, payload)
        : await api.post('/pdvs', payload);

      if (!savedId && data.data?.id) setSavedId(data.data.id);

      if (data.warning) {
        setWarning(data.warning);
        setLoading(false);
        onSaved();
        return;
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raio de tolerância (metros) *</label>
            <input
              type="number"
              min="1"
              className="input-field"
              required
              placeholder="Ex: 150"
              value={form.radiusMeters}
              onChange={e => setForm(f => ({ ...f, radiusMeters: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Distância máxima do endereço cadastrado para liberar ponto/visita neste PDV. Coordenada é obtida automaticamente a partir do endereço.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coordenada manual (opcional)</label>
            {hasSavedCoord && !editingCoord ? (
              <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                  <CheckCircle2 size={15} className="shrink-0" />
                  Coordenada salva: {pdv!.latitude}, {pdv!.longitude}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingCoord(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-pluma-700 hover:text-pluma-900 shrink-0"
                >
                  <PencilLine size={13} /> Alterar
                </button>
              </div>
            ) : (
              <>
                <input
                  className={`input-field ${warning ? 'border-amber-400 ring-1 ring-amber-200' : ''}`}
                  placeholder="-24.9555, -53.4561"
                  value={form.manualCoord}
                  onChange={e => setForm(f => ({ ...f, manualCoord: e.target.value }))}
                  autoFocus={hasSavedCoord}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {hasSavedCoord
                    ? 'Deixe em branco e salve pra manter a coordenada atual sem alteração.'
                    : 'Use só se o endereço não for encontrado no mapa. No Google Maps, clique com o botão direito no local exato e copie as coordenadas (formato "lat, lng"). Se preenchido, tem prioridade sobre o endereço e ignora o geocoding automático.'}
                </p>
              </>
            )}
          </div>
          {warning && <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded">{warning}</div>}
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

function DeletePDVModal({ pdv, onClose, onDeleted }: { pdv: PDV; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setError('');
    setLoading(true);
    try {
      await api.delete(`/pdvs/${pdv.id}`);
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao excluir PDV.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-1">Excluir PDV?</h3>
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-medium text-gray-700">{pdv.name}</span> será removido permanentemente. Essa ação não pode ser desfeita.
        </p>
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{error}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button type="button" onClick={handleDelete} disabled={loading} className="btn-primary flex-1 bg-red-600 border-red-600 hover:bg-red-700">
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PDVsPage() {
  const [pdvs, setPdvs] = useState<PDV[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; pdv?: PDV | null }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<PDV | null>(null);

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
                <div className="flex items-center gap-1 text-xs mt-1">
                  {isGeofenceReady(p) ? (
                    <span className="flex items-center gap-1 text-green-600"><MapPin size={12} /> Área configurada ({p.radiusMeters}m)</span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600"><MapPinOff size={12} /> Sem área — ponto/visita bloqueados</span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => setModal({ open: true, pdv: p })} className="p-2 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => toggleActive(p)} className={`p-2 rounded ${p.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    {p.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="p-2 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
                    <Trash2 size={15} />
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Geolocalização</th>
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
                      {isGeofenceReady(p) ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><MapPin size={13} /> {p.radiusMeters}m</span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 text-xs font-medium"><MapPinOff size={13} /> Não configurada</span>
                      )}
                    </td>
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
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
                          <Trash2 size={15} />
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

      {deleteTarget && (
        <DeletePDVModal pdv={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={load} />
      )}
    </div>
  );
}
