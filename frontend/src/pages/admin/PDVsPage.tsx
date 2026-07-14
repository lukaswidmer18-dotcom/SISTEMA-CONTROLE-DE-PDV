import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import api from '../../services/api';
import { PDV } from '../../types';
import { Plus, Pencil, ToggleLeft, ToggleRight, Trash2, X, MapPin, MapPinOff, CheckCircle2, PencilLine, Undo2, LocateFixed } from 'lucide-react';

// Fix for default marker icons in Leaflet with React (bundler não resolve os assets sem isso)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface GpsSuggestion {
  suggestion: { latitude: number; longitude: number } | null;
  samples: number;
  distanceMeters: number | null;
}

// Divergência menor que isso é ruído normal de GPS; não vale sugerir troca.
const GPS_SUGGESTION_MIN_DIVERGENCE_METERS = 25;

function isGeofenceReady(pdv: PDV): boolean {
  return pdv.latitude != null && pdv.longitude != null && pdv.radiusMeters != null;
}

function PDVLocationPicker({ latitude, longitude, radiusMeters, onChange }: {
  latitude: number; longitude: number; radiusMeters: number | null; onChange: (lat: number, lng: number) => void;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 220 }}>
      <MapContainer center={[latitude, longitude]} zoom={16} className="h-full w-full" style={{ background: '#f8fafc' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker
          draggable
          position={[latitude, longitude]}
          eventHandlers={{
            dragend: (e) => {
              const pos = (e.target as L.Marker).getLatLng();
              onChange(pos.lat, pos.lng);
            },
          }}
        />
        {radiusMeters != null && radiusMeters > 0 && (
          <Circle center={[latitude, longitude]} radius={radiusMeters} pathOptions={{ color: '#2563eb', fillOpacity: 0.08 }} />
        )}
      </MapContainer>
    </div>
  );
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
  const [clearCoord, setClearCoord] = useState(false);
  const [gpsSuggestion, setGpsSuggestion] = useState<GpsSuggestion | null>(null);
  const [gpsAdopted, setGpsAdopted] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    if (!pdv?.id) return;
    let cancelled = false;
    api.get(`/pdvs/${pdv.id}/gps-sugestao`)
      .then(({ data }) => { if (!cancelled) setGpsSuggestion(data.data); })
      .catch(() => { /* sugestão é opcional; falha aqui não pode travar o formulário */ });
    return () => { cancelled = true; };
  }, [pdv?.id]);

  // Sugere quando há check-ins e: PDV sem coordenada, ou coordenada divergindo além do ruído de GPS.
  const showGpsSuggestion =
    !gpsAdopted &&
    !clearCoord &&
    gpsSuggestion?.suggestion != null &&
    (gpsSuggestion.distanceMeters === null || gpsSuggestion.distanceMeters >= GPS_SUGGESTION_MIN_DIVERGENCE_METERS);

  function adoptGpsSuggestion() {
    if (!gpsSuggestion?.suggestion) return;
    const { latitude, longitude } = gpsSuggestion.suggestion;
    setForm(f => ({ ...f, manualCoord: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
    setEditingCoord(true);
    setGpsAdopted(true);
    setMapVersion(v => v + 1);
  }

  // Coordenada exibida no mapa: prioriza edição manual em andamento, depois a salva, depois a sugestão de GPS.
  const manualCoordParsed = editingCoord ? parseManualCoord(form.manualCoord) : null;
  const manualCoordValid = manualCoordParsed != null && !Number.isNaN(manualCoordParsed.latitude);
  const mapCoord = clearCoord
    ? null
    : manualCoordValid
    ? manualCoordParsed
    : hasSavedCoord && !editingCoord
    ? { latitude: pdv!.latitude!, longitude: pdv!.longitude! }
    : gpsSuggestion?.suggestion ?? null;

  function handleMapDrag(latitude: number, longitude: number) {
    setForm(f => ({ ...f, manualCoord: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
    setEditingCoord(true);
  }

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

    const manual = clearCoord ? { latitude: NaN, longitude: NaN } : parseManualCoord(form.manualCoord);
    if (manual === null) {
      setError("Coordenada manual inválida. Use o formato 'lat, lng', ex: -24.9555, -53.4561.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { name: form.name, address: form.address, city: form.city, state: form.state, radiusMeters: form.radiusMeters };
      if (clearCoord) {
        payload.clearCoordinates = true;
      } else if (!Number.isNaN(manual.latitude)) {
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
            {clearCoord ? (
              <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm text-amber-700 font-medium">
                  <Trash2 size={15} className="shrink-0" />
                  Coordenada manual será removida ao salvar. Se o endereço estiver preenchido, a localização volta a ser calculada automaticamente a partir dele.
                </span>
                <button
                  type="button"
                  onClick={() => setClearCoord(false)}
                  className="flex items-center gap-1 text-xs font-semibold text-pluma-700 hover:text-pluma-900 shrink-0"
                >
                  <Undo2 size={13} /> Desfazer
                </button>
              </div>
            ) : hasSavedCoord && !editingCoord ? (
              <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                  <CheckCircle2 size={15} className="shrink-0" />
                  Coordenada salva: {pdv!.latitude}, {pdv!.longitude}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingCoord(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-pluma-700 hover:text-pluma-900"
                  >
                    <PencilLine size={13} /> Alterar
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearCoord(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={13} /> Apagar
                  </button>
                </div>
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
          {showGpsSuggestion && gpsSuggestion?.suggestion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 space-y-1.5">
              <p className="flex items-start gap-1.5 text-sm text-blue-800 font-medium">
                <LocateFixed size={15} className="shrink-0 mt-0.5" />
                <span>
                  {gpsSuggestion.distanceMeters === null
                    ? `GPS dos check-ins dos promotores (${gpsSuggestion.samples} ${gpsSuggestion.samples === 1 ? 'visita' : 'visitas'}) indica a localização real deste PDV.`
                    : `GPS dos check-ins (${gpsSuggestion.samples} ${gpsSuggestion.samples === 1 ? 'visita' : 'visitas'}) aponta ~${gpsSuggestion.distanceMeters}m de distância da coordenada cadastrada.`}
                </span>
              </p>
              <button
                type="button"
                onClick={adoptGpsSuggestion}
                className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                <MapPin size={13} /> Usar coordenada dos check-ins ({gpsSuggestion.suggestion.latitude.toFixed(6)}, {gpsSuggestion.suggestion.longitude.toFixed(6)})
              </button>
            </div>
          )}
          {gpsAdopted && (
            <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
              Coordenada dos check-ins preenchida no campo acima. Revise e salve pra aplicar.
            </div>
          )}
          {mapCoord && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conferir no mapa</label>
              <PDVLocationPicker
                key={mapVersion}
                latitude={mapCoord.latitude}
                longitude={mapCoord.longitude}
                radiusMeters={Number(form.radiusMeters) || null}
                onChange={handleMapDrag}
              />
              <p className="text-xs text-gray-400 mt-1">Arraste o marcador pra ajustar a coordenada exata do PDV.</p>
            </div>
          )}
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
