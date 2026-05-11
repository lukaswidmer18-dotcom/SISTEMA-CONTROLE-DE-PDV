import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { Visit, PDV, Product, Validity } from '../../types';
import { getRequiredLocation } from '../../services/geolocation';
import { getOfflinePendingCount, isNetworkError, queueOfflineAction, removeFromOfflineQueue, syncOfflineQueue } from '../../services/offlineQueue';
import { useOfflineSyncContext } from '../../contexts/OfflineSyncContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Camera, Plus, Trash2, CheckCircle, AlertCircle, MapPin, X, Store, Clock, ChevronRight, ClipboardList } from 'lucide-react';

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
  async function handleStartAction(location: { latitude: number; longitude: number }, locationAvailable = true) {
    setLoading(true);
    setError('');
    try {
      await api.post('/visits', { pdvId: selectedPdv, latitude: location.latitude, longitude: location.longitude, locationAvailable });
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
          payload: { pdvId: selectedPdv, latitude: location.latitude, longitude: location.longitude, locationAvailable },
        });
        onStart(toVisit(offlineVisit));
      } else {
        setError(getErrorMessage(err, 'Erro ao iniciar visita.'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPdv) return;
    setError('');
    
    try {
      const location = await getRequiredLocation();
      await handleStartAction(location, true);
    } catch (err: any) {
      console.warn('GPS falhou ao iniciar visita, usando contingência.');
      await handleStartAction({ latitude: 0, longitude: 0 }, false);
    }
  }

  return (
    <div className="p-4 lg:p-0 animate-fade-in max-w-2xl mx-auto mt-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-pluma-50 text-pluma-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <MapPin size={32} />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Iniciar Nova Visita</h2>
        <p className="text-gray-500 mt-2">Selecione o ponto de venda para começar o registro.</p>
      </div>

      <div className="card lg:p-10 shadow-xl border-gray-100">
        <form onSubmit={handleStart} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ponto de Venda (PDV) *</label>
            <select className="input-field py-4 lg:text-lg" required value={selectedPdv} onChange={e => setSelectedPdv(e.target.value)}>
              <option value="">Selecione o estabelecimento...</option>
              {pdvs.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}` : ''}</option>
              ))}
            </select>
          </div>
          {error && (
            <div className="text-sm font-bold text-red-600 bg-red-50 p-4 rounded-xl flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          <button type="submit" disabled={loading || !selectedPdv} className="btn-primary w-full py-5 text-xl shadow-glow-pluma">
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent" />
                Iniciando...
              </span>
            ) : 'Começar Agora'}
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
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 lg:p-8 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Registrar Validade</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Produto *</label>
            <select className="input-field py-3" required value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">Selecione o produto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Vencimento *</label>
              <input type="date" className="input-field py-3" required value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Quantidade</label>
              <input type="number" min="1" className="input-field py-3" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>
          {error && <div className="text-sm font-bold text-red-600 bg-red-50 p-4 rounded-xl">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3.5">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3.5">{loading ? 'Salvando...' : 'Salvar Registro'}</button>
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
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pendingPhotosRef = useRef<File[]>([]);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { pendingCount, refreshCount, lastSyncTime } = useOfflineSyncContext();

  async function load() {
    setLoading(true);
    setError('');
    setNotice('');
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
    } catch (err: any) {
      if (isNetworkError(err)) {
        setPdvs(readCache<PDV[]>(PDVS_CACHE_KEY, []));
        setProducts(readCache<Product[]>(PRODUCTS_CACHE_KEY, []));
        const offlineVisit = getOfflineActiveVisit();
        if (offlineVisit) setVisit(toVisit(offlineVisit));
        setError('Modo offline ativo. Os dados serão sincronizados quando a internet voltar.');
      } else {
        setError(getErrorMessage(err, 'Erro ao carregar dados da visita.'));
      }
    } finally {
      setLoading(false);
      refreshCount();
    }
  }

  useEffect(() => {
    load();
  }, [lastSyncTime]);

  async function executePhotoUpload(file: File, location: { latitude: number; longitude: number }, locationAvailable = true) {
    if (!visit) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('latitude', String(location.latitude ?? 0));
      formData.append('longitude', String(location.longitude ?? 0));
      formData.append('locationAvailable', String(locationAvailable));

      await api.post(`/visits/${visit.id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
      setNotice(locationAvailable ? 'Foto enviada!' : 'Foto enviada (Modo de Contingência - Sem GPS).');
    } catch (err: any) {
      if (isNetworkError(err)) {
        const queued = await queueOfflineAction({
          kind: 'photo',
          ...getVisitReference(visit.id),
          payload: {
            file,
            fileName: file.name,
            latitude: location.latitude ?? 0,
            longitude: location.longitude ?? 0,
            locationAvailable
          },
        });
        const photo = {
          id: queued.id,
          visitId: visit.id,
          filePath: 'offline',
          fileName: file.name,
          latitude: location.latitude ?? 0,
          longitude: location.longitude ?? 0,
          uploadedAt: queued.createdAt,
        };

        setVisit(prev => prev ? { ...prev, photos: [...(prev.photos || []), photo] } : prev);
        if (isLocalVisit(visit.id)) {
          updateOfflineActiveVisit(current => ({
            ...current,
            photos: [...current.photos, { id: photo.id, fileName: photo.fileName, uploadedAt: photo.uploadedAt }],
          }));
        }
        setNotice('Foto salva offline.' + (locationAvailable ? '' : ' (Sem GPS)'));
        await refreshCount();
      } else {
        setError(getErrorMessage(err, 'Erro ao enviar foto.'));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !visit) return;
    setError('');

    for (const file of files) {
      try {
        const location = await getRequiredLocation();
        await executePhotoUpload(file, location, true);
      } catch (err: any) {
        console.warn('GPS falhou no upload de foto, usando contingência.');
        const dummyLocation = { latitude: 0, longitude: 0 };
        await executePhotoUpload(file, dummyLocation, false);
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

  async function confirmDeletePhoto() {
    if (!visit || !photoToDelete) return;
    setDeletingPhoto(true);
    const photoId = photoToDelete;
    setPhotoToDelete(null);

    if (photoId.startsWith('offline-')) {
      setVisit(prev => prev ? { ...prev, photos: (prev.photos || []).filter(p => p.id !== photoId) } : prev);
      if (isLocalVisit(visit.id)) {
        updateOfflineActiveVisit(current => ({
          ...current,
          photos: current.photos.filter(p => p.id !== photoId),
        }));
      }
      await removeFromOfflineQueue(photoId);
      await refreshCount();
      setDeletingPhoto(false);
      return;
    }

    try {
      await api.delete(`/visits/${visit.id}/photos/${photoId}`);
      await load();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Erro ao remover foto.'));
    } finally {
      setDeletingPhoto(false);
    }
  }

  async function executeFinish(location: { latitude: number; longitude: number }, locationAvailable = true) {
    if (!visit) return;
    setFinishing(true);
    try {
      await api.patch(`/visits/${visit.id}/finish`, { ...location, noProductsFound: noProducts, locationAvailable });
      setSuccess(locationAvailable ? 'Visita finalizada com sucesso!' : 'Visita finalizada (Modo de Contingência - Sem GPS).');
      setVisit(null);
      load();
    } catch (err: any) {
      if (isNetworkError(err)) {
        await queueOfflineAction({
          kind: 'finishVisit',
          ...getVisitReference(visit.id),
          payload: { ...location, noProductsFound: noProducts, locationAvailable },
        });
        if (isLocalVisit(visit.id)) clearOfflineActiveVisit();
        setSuccess('Visita finalizada offline.' + (locationAvailable ? '' : ' (Sem GPS)'));
        setVisit(null);
        await refreshCount();
      } else {
        setError(getErrorMessage(err, 'Erro ao finalizar visita.'));
      }
    } finally {
      setFinishing(false);
    }
  }

  async function handleFinish() {
    if (!visit) return;
    setError('');

    const photoCount = visit.photos?.length || 0;
    if (photoCount < 10) {
      setError(`São necessárias 10 fotos para finalizar. Você enviou apenas ${photoCount}.`);
      return;
    }

    const validityCount = visit.validities?.length || 0;
    if (!noProducts && validityCount === 0) {
      setError('Registre ao menos uma data de validade ou marque a opção de produtos não encontrados.');
      return;
    }

    try {
      const location = await getRequiredLocation();
      await executeFinish(location, true);
    } catch (err: any) {
      console.warn('GPS falhou ao finalizar visita, usando contingência.');
      await executeFinish({ latitude: 0, longitude: 0 }, false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" />
    </div>
  );

  if (success) return (
    <div className="p-4 lg:p-0 flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-glow-pluma">
        <CheckCircle size={48} className="text-green-500" />
      </div>
      <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Visita Finalizada!</h3>
      <p className="text-gray-500 font-medium mb-8 max-w-sm">{success}</p>
      <button onClick={() => { setSuccess(''); load(); }} className="btn-primary px-10 py-4 text-lg">Iniciar Nova Visita</button>
    </div>
  );

  if (!visit) return (
    <div className="animate-fade-in space-y-4">
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span>Sincronização pendente: {pendingCount} ação(ões).</span>
        </div>
      )}

      {!navigator.onLine && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <div>
            <p className="font-bold">Modo Offline Ativo</p>
            <p className="text-xs opacity-80">As fotos e registros serão salvos localmente até que o sinal retorne.</p>
          </div>
        </div>
      )}

      <StartVisitForm
        pdvs={pdvs}
        onStart={(offlineVisit) => {
          if (offlineVisit) {
            setVisit(offlineVisit);
            setNotice('Visita iniciada em modo offline. Continue o registro normalmente.');
            refreshCount();
          } else {
            load();
          }
        }}
      />
    </div>
  );

  const photoCount = visit.photos?.length || 0;
  const validityCount = visit.validities?.length || 0;

  return (
    <div className="p-4 lg:p-0 space-y-6 animate-fade-in">
      
      {/* Active Visit Info Card */}
      <div className="bg-gradient-to-br from-pluma-950 via-pluma-800 to-pluma-900 text-white rounded-2xl p-6 lg:p-8 shadow-glow-pluma border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-2xl ring-1 ring-white/20">
              <Store size={28} className="text-gold-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-pluma-300 mb-1">Visita em Andamento</p>
              <h2 className="text-xl lg:text-2xl font-black tracking-tight">{visit.pdv?.name}</h2>
              {visit.pdv?.city && <p className="text-xs text-pluma-200 flex items-center gap-1.5 mt-1 font-medium"><MapPin size={12} className="text-gold-400" />{visit.pdv.city} {visit.pdv.state ? `— ${visit.pdv.state}` : ''}</p>}
            </div>
          </div>
          <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-8">
            <div className="text-center lg:text-left">
              <p className="text-[10px] uppercase tracking-widest text-pluma-400 font-bold mb-1">Início da Visita</p>
              <p className="text-lg lg:text-xl font-black text-white flex items-center gap-2"><Clock size={16} className="text-gold-400" /> {format(new Date(visit.startedAt), 'HH:mm')}</p>
            </div>
          </div>
        </div>
      </div>

      {(error || notice || pendingCount > 0 || !navigator.onLine) && (
        <div className="space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center gap-3 font-bold animate-fade-in">
              <AlertCircle size={20} className="shrink-0" />
              <p className="flex-1">{error}</p>
            </div>
          )}
          {notice && <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 flex items-center gap-3 font-bold"><AlertCircle size={20} className="shrink-0" />{notice}</div>}
          
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <span>Sincronização pendente: {pendingCount} ação(ões).</span>
            </div>
          )}

          {!navigator.onLine && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <div>
                <p className="font-bold">Modo Offline</p>
                <p className="text-xs opacity-80">Suas fotos e dados estão seguros no aparelho.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid for PC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Col: Photos - Occupies 7 columns on desktop */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-gray-900 flex items-center gap-2 text-lg">
                <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg"><Camera size={20} /></div>
                Galeria de Fotos
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-black ${photoCount >= 10 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {photoCount}/10
                </span>
              </h3>
              {photoCount < 10 && (
                <label className={`btn-primary px-5 py-2.5 cursor-pointer flex items-center gap-2 text-sm shadow-glow-pluma ${uploading ? 'opacity-50' : ''}`}>
                  {uploading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : <><Plus size={18} /> Adicionar</>}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              )}
            </div>

            {photoCount >= 10 && (
              <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-2xl p-4 text-sm font-bold mb-6 border border-green-100">
                <CheckCircle size={20} className="shrink-0" /> Meta de 10 fotos atingida! Agora registre as validades para finalizar.
              </div>
            )}

            {visit.photos && visit.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {visit.photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 group cursor-pointer shadow-sm hover:shadow-md transition-all" onClick={() => { if (photo.filePath !== 'offline') setExpandedPhoto(`/uploads/${photo.fileName}`); }}>
                    {photo.filePath === 'offline' ? (
                      <div className="w-full h-full bg-amber-50 text-amber-700 flex flex-col items-center justify-center gap-2 text-[10px] font-black text-center px-2 uppercase leading-tight">
                        <Camera size={24} className="opacity-40" />
                        Aguardando Rede
                      </div>
                    ) : (
                      <img src={`/uploads/${photo.fileName}`} alt="Foto da visita" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setPhotoToDelete(photo.id); }} className="absolute top-2 right-2 z-10 p-2.5 bg-red-600 text-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700 active:scale-95" title="Excluir foto" type="button">
                      <Trash2 size={16} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[9px] font-bold uppercase truncate">{photo.fileName}</p>
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 10 - photoCount) }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50/50">
                    <Camera size={24} className="text-gray-300 mb-1" />
                    <span className="text-[10px] font-black text-gray-400 uppercase">Vazio</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Camera size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold text-lg">Nenhuma foto enviada</p>
                <p className="text-gray-400 text-sm">Você precisa de 10 fotos para finalizar a visita.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Validities & Action - Occupies 5 columns on desktop */}
        <div className="lg:col-span-5 space-y-6 sticky top-24">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-gray-900 flex items-center gap-2 text-lg">
                <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg"><ClipboardList size={20} /></div>
                Checklist da Visita
              </h3>
              {!noProducts && (
                <button onClick={() => setShowValidityModal(true)} className="btn-secondary px-4 py-2 text-xs font-black shadow-sm">
                  <Plus size={16} /> ADICIONAR VALIDADE
                </button>
              )}
            </div>

            <div className="space-y-4">
              {visit.validities && visit.validities.length > 0 ? (
                <div className="space-y-3">
                  {visit.validities.map((v: Validity) => (
                    <div key={v.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-pluma-200 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{v.product?.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Vence: {v.expiryDate}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Qtd: {v.quantity}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteValidity(v.id)} className="p-2 text-gray-300 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : !noProducts ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400 font-medium italic">Nenhum produto registrado.</p>
                </div>
              ) : null}

              <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer group hover:bg-pluma-50 transition-colors">
                <input type="checkbox" className="w-5 h-5 text-pluma-800 rounded-lg border-gray-300 focus:ring-pluma-500 transition-all" checked={noProducts} onChange={e => setNoProducts(e.target.checked)} />
                <span className="text-sm font-bold text-gray-700 group-hover:text-pluma-800 transition-colors">Não encontrei produtos para conferência</span>
              </label>

              <div className="pt-6 border-t border-gray-100">
                <button 
                  onClick={handleFinish} 
                  disabled={finishing || photoCount < 10} 
                  className={`w-full py-5 text-xl font-black rounded-2xl transition-all flex items-center justify-center gap-3 ${photoCount >= 10 ? 'bg-pluma-800 text-white shadow-glow-pluma hover:bg-pluma-900' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  {finishing ? (
                    <><span className="animate-spin rounded-full h-5 w-5 border-3 border-current border-t-transparent" /> Finalizando...</>
                  ) : (
                    <><CheckCircle size={22} /> Finalizar Visita</>
                  )}
                </button>
                
                {photoCount < 10 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-gray-400 uppercase">Progresso de Fotos</span>
                      <span className="text-pluma-600">{photoCount}/10</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-pluma-600 transition-all duration-500" 
                        style={{ width: `${(photoCount / 10) * 100}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase text-center italic">
                      Faltam {10 - photoCount} fotos para liberar a finalização
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showValidityModal && (
        <ValidityModal visitId={visit.id} products={products} onClose={() => setShowValidityModal(false)} onAdded={(validity) => { if (validity) { setVisit(prev => prev ? { ...prev, validities: [...(prev.validities || []), validity] } : prev); if (isLocalVisit(visit.id)) { updateOfflineActiveVisit(current => ({ ...current, validities: [...current.validities, validity] })); } setNotice('Validade salva offline.'); refreshCount(); } else { load(); } }} />
      )}

      {photoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 animate-slide-up shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 text-center mb-2">Excluir foto?</h3>
            <p className="text-gray-500 text-center text-sm mb-8 leading-relaxed">Esta ação é permanente e removerá a imagem dos servidores do Grupo Pluma.</p>
            <div className="flex gap-4">
              <button type="button" onClick={() => setPhotoToDelete(null)} className="btn-secondary flex-1 py-3.5" disabled={deletingPhoto}>Cancelar</button>
              <button type="button" onClick={confirmDeletePhoto} className="btn-primary flex-1 py-3.5 bg-red-600 hover:bg-red-700 border-red-600 shadow-glow-pluma" disabled={deletingPhoto}>{deletingPhoto ? 'Excluindo...' : 'Sim, Excluir'}</button>
            </div>
          </div>
        </div>
      )}

      {expandedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md" onClick={() => setExpandedPhoto(null)}>
          <button type="button" className="absolute top-6 right-6 p-3 text-white bg-white/10 rounded-2xl hover:bg-white/20 transition-all border border-white/10" onClick={() => setExpandedPhoto(null)}><X size={32} /></button>
          <img src={expandedPhoto} alt="Foto expandida" className="max-w-[95vw] max-h-[90vh] object-contain rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
