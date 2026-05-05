import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { Visit, PDV, Product, Validity } from '../../types';
import { getRequiredLocation } from '../../services/geolocation';
import { getOfflinePendingCount, isNetworkError, queueOfflineAction, syncOfflineQueue } from '../../services/offlineQueue';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Camera, Plus, Trash2, CheckCircle, AlertCircle, MapPin, X } from 'lucide-react';

const PDVS_CACHE_KEY = 'pdv-cache-pdvs';
const PRODUCTS_CACHE_KEY = 'pdv-cache-products';
const OFFLINE_ACTIVE_VISIT_KEY = 'pdv-offline-active-visit';

interface OfflineActiveVisit {
  localVisitId: string;
  pdvId: string;
  pdv?: PDV;
  startedAt: string;
  photos: { id: string; fileName: string; uploadedAt: string }[];
  validities: Validity[];
  noProductsFound: boolean;
}

function createLocalId(prefix: string) {
  if ('randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readCache<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
}

function writeCache<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getOfflineActiveVisit(): OfflineActiveVisit | null {
  return readCache<OfflineActiveVisit | null>(OFFLINE_ACTIVE_VISIT_KEY, null);
}

function saveOfflineActiveVisit(visit: OfflineActiveVisit) {
  writeCache(OFFLINE_ACTIVE_VISIT_KEY, visit);
}

function clearOfflineActiveVisit() {
  localStorage.removeItem(OFFLINE_ACTIVE_VISIT_KEY);
}

function updateOfflineActiveVisit(updater: (visit: OfflineActiveVisit) => OfflineActiveVisit) {
  const current = getOfflineActiveVisit();
  if (!current) return null;
  const updated = updater(current);
  saveOfflineActiveVisit(updated);
  return toVisit(updated);
}

function toVisit(offline: OfflineActiveVisit): Visit {
  return {
    id: offline.localVisitId,
    promotorId: 'offline',
    pdvId: offline.pdvId,
    status: 'IN_PROGRESS',
    startedAt: offline.startedAt,
    noProductsFound: offline.noProductsFound,
    pdv: offline.pdv,
    photos: offline.photos.map(photo => ({
      id: photo.id,
      visitId: offline.localVisitId,
      filePath: 'offline',
      fileName: photo.fileName,
      uploadedAt: photo.uploadedAt,
    })),
    validities: offline.validities,
  };
}

function isLocalVisit(visitId: string) {
  return visitId.startsWith('local-visit-');
}

function getVisitReference(visitId: string) {
  return isLocalVisit(visitId)
    ? { localVisitId: visitId }
    : { visitId };
}

function getErrorMessage(err: any, fallback: string) {
  return err.response?.data?.error || err.message || fallback;
}

async function trySyncOfflineQueue() {
  if (!navigator.onLine) return { synced: 0, remaining: await getOfflinePendingCount() };
  return syncOfflineQueue();
}

function StartVisitForm({ pdvs, onStart }: { pdvs: PDV[]; onStart: (visit?: Visit) => void }) {
  const [selectedPdv, setSelectedPdv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPdv) return;
    setError('');
    setLoading(true);

    let location: { latitude: number; longitude: number };
    try {
      location = await getRequiredLocation();
    } catch (err: any) {
      setError(err.message || 'Localização obrigatória para iniciar visita.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/visits', { pdvId: selectedPdv, ...location });
      onStart();
    } catch (err: any) {
      if (isNetworkError(err)) {
        const localVisitId = createLocalId('local-visit');
        const offlineVisit: OfflineActiveVisit = {
          localVisitId,
          pdvId: selectedPdv,
          pdv: pdvs.find(p => p.id === selectedPdv),
          startedAt: new Date().toISOString(),
          photos: [],
          validities: [],
          noProductsFound: false,
        };

        saveOfflineActiveVisit(offlineVisit);
        await queueOfflineAction({
          kind: 'startVisit',
          localVisitId,
          payload: { pdvId: selectedPdv, ...location },
        });
        onStart(toVisit(offlineVisit));
      } else {
        setError(getErrorMessage(err, 'Erro ao iniciar visita.'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Iniciar Visita</h2>
      <div className="card">
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o PDV *</label>
            <select className="input-field" required value={selectedPdv} onChange={e => setSelectedPdv(e.target.value)}>
              <option value="">-- Selecione --</option>
              {pdvs.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}` : ''}</option>
              ))}
            </select>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          <button type="submit" disabled={loading || !selectedPdv} className="btn-primary w-full py-3">
            {loading ? 'Iniciando...' : 'Iniciar Visita'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ValidityModal({ visitId, products, onClose, onAdded }: {
  visitId: string; products: Product[]; onClose: () => void; onAdded: (validity?: Validity) => void;
}) {
  const [form, setForm] = useState({ productId: '', expiryDate: '', quantity: '1' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/visits/${visitId}/validities`, form);
      onAdded();
      onClose();
    } catch (err: any) {
      if (isNetworkError(err)) {
        const queued = await queueOfflineAction({
          kind: 'validity',
          ...getVisitReference(visitId),
          payload: form,
        });
        onAdded({
          id: queued.id,
          visitId,
          productId: form.productId,
          expiryDate: form.expiryDate,
          quantity: Number(form.quantity) || 1,
          product: products.find(p => p.id === form.productId),
          createdAt: queued.createdAt,
        });
        onClose();
      } else {
        setError(getErrorMessage(err, 'Erro ao registrar validade.'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Registrar Validade</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
            <select className="input-field" required value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">-- Selecione --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Validade *</label>
            <input type="date" className="input-field" required value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
            <input type="number" min="1" className="input-field" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VisitPage() {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [pdvs, setPdvs] = useState<PDV[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [noProducts, setNoProducts] = useState(false);
  const [showValidityModal, setShowValidityModal] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refreshPendingCount() {
    setPendingCount(await getOfflinePendingCount());
  }

  async function load() {
    setLoading(true);
    try {
      const [visitRes, pdvsRes, productsRes] = await Promise.all([
        api.get('/visits/active'),
        api.get('/pdvs'),
        api.get('/products'),
      ]);

      const loadedPdvs = pdvsRes.data.data || [];
      const loadedProducts = productsRes.data.data || [];
      writeCache(PDVS_CACHE_KEY, loadedPdvs);
      writeCache(PRODUCTS_CACHE_KEY, loadedProducts);

      setPdvs(loadedPdvs);
      setProducts(loadedProducts);
      setVisit(visitRes.data.data || (getOfflineActiveVisit() ? toVisit(getOfflineActiveVisit()!) : null));
    } catch (err) {
      if (isNetworkError(err)) {
        setPdvs(readCache<PDV[]>(PDVS_CACHE_KEY, []));
        setProducts(readCache<Product[]>(PRODUCTS_CACHE_KEY, []));
        const offlineVisit = getOfflineActiveVisit();
        if (offlineVisit) setVisit(toVisit(offlineVisit));
        setError('Modo offline ativo. As ações serão salvas no aparelho e sincronizadas quando a internet voltar.');
      } else {
        setError('Erro ao carregar dados da visita.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    refreshPendingCount();

    async function handleOnline() {
      try {
        const result = await trySyncOfflineQueue();
        await refreshPendingCount();
        if (result.synced > 0) {
          if (result.remaining === 0) clearOfflineActiveVisit();
          setNotice(`${result.synced} ação(ões) offline sincronizada(s).`);
          load();
        }
      } catch (err: any) {
        setError(getErrorMessage(err, 'Não foi possível sincronizar as ações offline.'));
      }
    }

    function handleQueueUpdated() {
      refreshPendingCount();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline-queue-updated', handleQueueUpdated);
    if (navigator.onLine) handleOnline();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdated);
    };
  }, []);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !visit) return;
    setError('');

    for (const file of files) {
      setUploading(true);
      let location: { latitude: number; longitude: number };
      try {
        location = await getRequiredLocation();
      } catch (err: any) {
        setError(err.message || 'Localização obrigatória para enviar foto.');
        setUploading(false);
        break;
      }

      try {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('latitude', String(location.latitude));
        formData.append('longitude', String(location.longitude));
        await api.post(`/visits/${visit.id}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await load();
      } catch (err: any) {
        if (isNetworkError(err)) {
          const queued = await queueOfflineAction({
            kind: 'photo',
            ...getVisitReference(visit.id),
            payload: {
              file,
              fileName: file.name,
              latitude: location.latitude,
              longitude: location.longitude,
            },
          });
          const photo = {
            id: queued.id,
            visitId: visit.id,
            filePath: 'offline',
            fileName: file.name,
            latitude: location.latitude,
            longitude: location.longitude,
            uploadedAt: queued.createdAt,
          };

          setVisit(prev => prev ? { ...prev, photos: [...(prev.photos || []), photo] } : prev);
          if (isLocalVisit(visit.id)) {
            updateOfflineActiveVisit(current => ({
              ...current,
              photos: [...current.photos, { id: photo.id, fileName: photo.fileName, uploadedAt: photo.uploadedAt }],
            }));
          }
          setNotice('Foto salva em modo offline. Ela será enviada quando a internet voltar.');
          await refreshPendingCount();
        } else {
          setError(getErrorMessage(err, 'Erro ao enviar foto.'));
          break;
        }
      } finally {
        setUploading(false);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDeleteValidity(validityId: string) {
    if (!visit) return;
    if (validityId.startsWith('offline-')) {
      setVisit(prev => prev ? { ...prev, validities: (prev.validities || []).filter(v => v.id !== validityId) } : prev);
      if (isLocalVisit(visit.id)) {
        updateOfflineActiveVisit(current => ({
          ...current,
          validities: current.validities.filter(v => v.id !== validityId),
        }));
      }
      return;
    }

    try {
      await api.delete(`/visits/${visit.id}/validities/${validityId}`);
      load();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Erro ao remover validade.'));
    }
  }

  async function handleFinish() {
    if (!visit) return;
    setError('');

    const photoCount = visit.photos?.length || 0;
    if (photoCount < 10) {
      setError(`São necessárias 10 fotos. Você enviou ${photoCount}.`);
      return;
    }

    const validityCount = visit.validities?.length || 0;
    if (!noProducts && validityCount === 0) {
      setError('Registre ao menos uma data de validade ou marque "Não encontrei produtos no PDV".');
      return;
    }

    setFinishing(true);
    let location: { latitude: number; longitude: number };
    try {
      location = await getRequiredLocation();
    } catch (err: any) {
      setError(err.message || 'Localização obrigatória para finalizar visita.');
      setFinishing(false);
      return;
    }

    try {
      await api.patch(`/visits/${visit.id}/finish`, { ...location, noProductsFound: noProducts });
      setSuccess('Visita finalizada com sucesso!');
      setVisit(null);
      load();
    } catch (err: any) {
      if (isNetworkError(err)) {
        await queueOfflineAction({
          kind: 'finishVisit',
          ...getVisitReference(visit.id),
          payload: { ...location, noProductsFound: noProducts },
        });
        if (isLocalVisit(visit.id)) clearOfflineActiveVisit();
        setSuccess('Visita finalizada em modo offline. A sincronização será feita quando a internet voltar.');
        setVisit(null);
        await refreshPendingCount();
      } else {
        setError(getErrorMessage(err, 'Erro ao finalizar visita.'));
      }
    } finally {
      setFinishing(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" />
    </div>
  );

  if (success) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <CheckCircle size={48} className="text-green-500 mb-3" />
      <h3 className="text-xl font-bold text-gray-800 mb-1">Visita Finalizada!</h3>
      <p className="text-gray-500 text-sm mb-6">{success}</p>
      <button onClick={() => { setSuccess(''); load(); }} className="btn-primary">Iniciar Nova Visita</button>
    </div>
  );

  if (!visit) return (
    <>
      {pendingCount > 0 && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
          Modo offline: {pendingCount} ação(ões) aguardando sincronização.
        </div>
      )}
      <StartVisitForm
        pdvs={pdvs}
        onStart={(offlineVisit) => {
          if (offlineVisit) {
            setVisit(offlineVisit);
            setNotice('Visita iniciada em modo offline. Continue o registro normalmente; a sincronização será feita quando a internet voltar.');
            refreshPendingCount();
          } else {
            load();
          }
        }}
      />
    </>
  );

  const photoCount = visit.photos?.length || 0;
  const validityCount = visit.validities?.length || 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="card bg-pluma-50 border-pluma-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-pluma-600 font-medium uppercase tracking-wide">Visita em Andamento</p>
            <h2 className="text-lg font-bold text-gray-800 mt-0.5">{visit.pdv?.name}</h2>
            {visit.pdv?.city && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} />{visit.pdv.city}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Início</p>
            <p className="text-sm font-medium text-gray-700">{format(new Date(visit.startedAt), 'HH:mm')}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {notice}
        </div>
      )}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
          Modo offline: {pendingCount} ação(ões) aguardando sincronização.
        </div>
      )}

      {/* Photos section */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Camera size={16} />
            Fotos
            <span className={`text-sm font-normal ${photoCount >= 10 ? 'text-green-600' : 'text-gray-500'}`}>
              {photoCount}/10
            </span>
          </h3>
          {photoCount < 10 && (
            <label className={`btn-primary text-xs px-3 py-1.5 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? 'Enviando...' : <><Plus size={14} /> Foto</>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {photoCount >= 10 && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-2 text-xs mb-3">
            <CheckCircle size={14} /> 10 fotos enviadas!
          </div>
        )}

        {visit.photos && visit.photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {visit.photos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                {photo.filePath === 'offline' ? (
                  <div className="w-full h-full bg-amber-50 text-amber-700 flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-center px-1">
                    <Camera size={16} />
                    Pendente offline
                  </div>
                ) : (
                  <img src={`/uploads/${photo.fileName}`} alt="Foto da visita" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 10 - photoCount) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                <Camera size={16} className="text-gray-300" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            <Camera size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma foto ainda. Envie 10 fotos.</p>
          </div>
        )}
      </div>

      {/* Validities section */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Datas de Validade</h3>
          {!noProducts && (
            <button onClick={() => setShowValidityModal(true)} className="btn-primary text-xs px-3 py-1.5">
              <Plus size={14} /> Adicionar
            </button>
          )}
        </div>

        {visit.validities && visit.validities.length > 0 ? (
          <div className="space-y-2">
            {visit.validities.map((v: Validity) => (
              <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{v.product?.name}</p>
                  <p className="text-xs text-gray-500">Validade: {v.expiryDate} • Qtd: {v.quantity}</p>
                </div>
                <button onClick={() => handleDeleteValidity(v.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : !noProducts ? (
          <p className="text-sm text-gray-400">Nenhuma validade registrada.</p>
        ) : null}

        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 text-pluma-800 rounded"
            checked={noProducts}
            onChange={e => setNoProducts(e.target.checked)}
          />
          <span className="text-sm text-gray-600">Não encontrei produtos no PDV</span>
        </label>
      </div>

      {/* Finish button */}
      <button
        onClick={handleFinish}
        disabled={finishing || photoCount < 10}
        className="btn-success w-full py-4 text-base"
      >
        {finishing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Finalizando...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle size={18} />
            Finalizar Visita
          </span>
        )}
      </button>

      {photoCount < 10 && (
        <p className="text-center text-xs text-gray-400">
          Faltam {10 - photoCount} foto(s) para finalizar.
        </p>
      )}

      {showValidityModal && (
        <ValidityModal
          visitId={visit.id}
          products={products}
          onClose={() => setShowValidityModal(false)}
          onAdded={(validity) => {
            if (validity) {
              setVisit(prev => prev ? { ...prev, validities: [...(prev.validities || []), validity] } : prev);
              if (isLocalVisit(visit.id)) {
                updateOfflineActiveVisit(current => ({
                  ...current,
                  validities: [...current.validities, validity],
                }));
              }
              setNotice('Validade salva em modo offline. A sincronização será feita quando a internet voltar.');
              refreshPendingCount();
            } else {
              load();
            }
          }}
        />
      )}
    </div>
  );
}
