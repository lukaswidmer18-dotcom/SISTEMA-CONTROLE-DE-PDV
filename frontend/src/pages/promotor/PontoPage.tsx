import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { Ponto, Visit, PDV, Product, Validity } from '../../types';
import { getRequiredLocation } from '../../services/geolocation';
import { isNetworkError, queueOfflineAction, removeFromOfflineQueue } from '../../services/offlineQueue';
import { useOfflineSyncContext } from '../../contexts/OfflineSyncContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, MapPin, AlertCircle, ClipboardList, Camera, Plus, Trash2, Store, X } from 'lucide-react';
import { 
  createLocalId, 
  saveOfflineActiveVisit, 
  getOfflineActiveVisit, 
  toVisit, 
  isLocalVisit, 
  getVisitReference, 
  updateOfflineActiveVisit, 
  clearOfflineActiveVisit,
  PDVS_CACHE_KEY,
  PRODUCTS_CACHE_KEY,
  readCache,
  writeCache,
  OfflineActiveVisit
} from '../../services/visitService';

const PONTO_SEQUENCE = ['ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA'] as const;
type PontoType = typeof PONTO_SEQUENCE[number];

const PONTO_LABELS: Record<PontoType, string> = {
  ENTRADA: 'Início',
  SAIDA_ALMOCO: 'Almoço',
  RETORNO_ALMOCO: 'Retorno',
  SAIDA: 'Encerramento',
};

const PONTO_COLORS: Record<PontoType, string> = {
  ENTRADA: 'bg-green-100 text-green-800',
  SAIDA_ALMOCO: 'bg-yellow-100 text-yellow-800',
  RETORNO_ALMOCO: 'bg-pluma-100 text-pluma-800',
  SAIDA: 'bg-red-100 text-red-800',
};

function getNextPonto(pontos: Ponto[]): PontoType | null {
  const types = pontos.map(p => p.type as PontoType);
  const hasSaida = types.includes('SAIDA');
  if (hasSaida) return null;

  if (!types.includes('ENTRADA')) return 'ENTRADA';
  if (!types.includes('SAIDA_ALMOCO')) {
    // Can go to lunch or skip to saida
    return 'SAIDA_ALMOCO';
  }
  if (!types.includes('RETORNO_ALMOCO')) return 'RETORNO_ALMOCO';
  return 'SAIDA';
}

function canRegister(type: PontoType, pontos: Ponto[]): boolean {
  const types = pontos.map(p => p.type as PontoType);
  if (types.includes(type)) return false;

  if (type === 'ENTRADA') return !types.includes('ENTRADA');
  if (type === 'SAIDA_ALMOCO') return types.includes('ENTRADA') && !types.includes('SAIDA');
  if (type === 'RETORNO_ALMOCO') return types.includes('SAIDA_ALMOCO') && !types.includes('RETORNO_ALMOCO');
  if (type === 'SAIDA') return types.includes('ENTRADA');
  return false;
}

function getErrorMessage(err: any, fallback: string) {
  return err.response?.data?.error || err.message || fallback;
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
    <div className="animate-fade-in space-y-6">
      <div className="text-center bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200">
        <div className="w-12 h-12 bg-white text-pluma-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
          <MapPin size={24} />
        </div>
        <h4 className="font-black text-gray-900 tracking-tight">Nova Visita no PDV</h4>
        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Selecione o estabelecimento</p>
      </div>

      <form onSubmit={handleStart} className="space-y-4">
        <div>
          <select className="input-field py-3 text-sm font-bold" required value={selectedPdv} onChange={e => setSelectedPdv(e.target.value)}>
            <option value="">Selecione o PDV...</option>
            {pdvs.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}` : ''}</option>
            ))}
          </select>
        </div>
        {error && <div className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl flex items-center gap-2"><AlertCircle size={14} />{error}</div>}
        <button type="submit" disabled={loading || !selectedPdv} className="btn-primary w-full py-4 text-base shadow-glow-pluma font-black">
          {loading ? 'Iniciando...' : 'COMEÇAR VISITA'}
        </button>
      </form>
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
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 lg:p-8 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Registrar Validade</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Produto *</label>
            <select className="input-field py-3 text-sm font-bold" required value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">Selecione o produto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Vencimento *</label>
              <input type="date" className="input-field py-3 text-sm font-bold" required value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Quantidade</label>
              <input type="number" min="1" className="input-field py-3 text-sm font-bold" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>
          {error && <div className="text-sm font-bold text-red-600 bg-red-50 p-4 rounded-xl">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3.5 font-bold">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3.5 font-bold">{loading ? 'Salvando...' : 'Salvar Registro'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PontoPage() {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Visit States
  const [visit, setVisit] = useState<Visit | null>(null);
  const [pdvs, setPdvs] = useState<PDV[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [noProducts, setNoProducts] = useState(false);
  const [showValidityModal, setShowValidityModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { pendingCount, refreshCount, lastSyncTime } = useOfflineSyncContext();

  async function load() {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const [pontoRes, visitRes, pdvsRes, productsRes] = await Promise.all([
        api.get('/ponto/today'),
        api.get('/visits/active'),
        api.get('/pdvs'),
        api.get('/products'),
      ]);

      setPontos(pontoRes.data.data || []);
      
      const loadedPdvs = pdvsRes.data.data || [];
      const loadedProducts = productsRes.data.data || [];
      writeCache(PDVS_CACHE_KEY, loadedPdvs);
      writeCache(PRODUCTS_CACHE_KEY, loadedProducts);
      setPdvs(loadedPdvs);
      setProducts(loadedProducts);
      
      const activeVisit = visitRes.data.data || (getOfflineActiveVisit() ? toVisit(getOfflineActiveVisit()!) : null);
      setVisit(activeVisit);
      if (activeVisit) setNoProducts(activeVisit.noProductsFound || false);

    } catch (err: any) {
      if (isNetworkError(err)) {
        setError('Modo offline ativo. Os registros serão sincronizados quando a internet voltar.');
        setPdvs(readCache<PDV[]>(PDVS_CACHE_KEY, []));
        setProducts(readCache<Product[]>(PRODUCTS_CACHE_KEY, []));
        const offlineVisit = getOfflineActiveVisit();
        if (offlineVisit) setVisit(toVisit(offlineVisit));
      } else {
        setError(getErrorMessage(err, 'Erro ao carregar dados.'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [lastSyncTime]);


  async function executeRegister(type: PontoType, location: { latitude: number; longitude: number }, locationAvailable = true) {
    try {
      await api.post('/ponto', { type, ...location, locationAvailable });
      setSuccess(locationAvailable 
        ? `Atividade de ${PONTO_LABELS[type]} registrada com sucesso!`
        : `Atividade de ${PONTO_LABELS[type]} registrada em Modo de Contingência (Sem GPS).`
      );
      load();
    } catch (err: any) {
      if (isNetworkError(err)) {
        const { latitude, longitude } = location;
        const queued = await queueOfflineAction({ kind: 'ponto', payload: { type, latitude, longitude, locationAvailable } });
        setPontos(prev => [
          ...prev,
          {
            id: queued.id,
            userId: 'offline',
            type,
            timestamp: queued.createdAt,
            latitude,
            longitude,
            locationAvailable,
          },
        ]);
        setSuccess(`Atividade de ${PONTO_LABELS[type]} salva em modo offline.`);
        await refreshCount();
      } else {
        setError(err.response?.data?.error || err.message || 'Erro ao registrar.');
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleRegister(type: PontoType) {
    setError('');
    setSuccess('');
    setRegistering(true);

    try {
      const location = await getRequiredLocation();
      await executeRegister(type, location, true);
    } catch (err: any) {
      console.warn('GPS falhou, usando modo de contingência automático.');
      const dummyLocation = { latitude: 0, longitude: 0 };
      await executeRegister(type, dummyLocation, false);
    }
  }

  // Visit Action Handlers
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

  const nextPonto = getNextPonto(pontos);
  const hasEntrada = pontos.some(p => p.type === 'ENTRADA');
  const hasSaida = pontos.some(p => p.type === 'SAIDA');

  return (
    <div className="p-4 lg:p-0 space-y-6 animate-fade-in">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <Clock size={24} />
            </div>
            Jornada de Atividade
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-pluma-50 text-pluma-800 rounded-xl text-xs font-bold border border-pluma-100">
          <MapPin size={14} />
          Localização Obrigatória
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Records Timeline */}
        <div className="space-y-4">
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 flex items-center gap-3 animate-pulse">
              <AlertCircle size={20} className="shrink-0" />
              <p className="font-semibold">Modo offline: {pendingCount} ação(ões) aguardando sincronização.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center gap-3 animate-fade-in">
              <AlertCircle size={20} className="shrink-0" />
              <p className="font-semibold">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-4 flex items-center gap-3 animate-fade-in">
              <CheckCircle size={20} className="shrink-0" />
              <p className="font-semibold">{success}</p>
            </div>
          )}

          {!navigator.onLine && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <div>
                <p className="font-bold">Você está offline</p>
                <p className="text-xs opacity-80">As atividades serão salvas no aparelho e enviadas quando houver sinal.</p>
              </div>
            </div>
          )}

          <div className="card h-full">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ClipboardList size={18} className="text-pluma-600" />
              Minha Jornada
            </h3>
            
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
            ) : pontos.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                <Clock size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400 font-medium">Nenhum registro ainda hoje.</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-4 bottom-4 w-1 bg-gradient-to-b from-pluma-100 via-pluma-200 to-pluma-100 rounded-full" />
                <div className="space-y-6">
                  {pontos.map((p) => (
                    <div key={p.id} className="flex items-center gap-6 pl-14 relative group">
                      <div className="absolute left-[18px] w-4 h-4 rounded-full bg-white border-4 border-pluma-600 shadow-sm group-hover:scale-125 transition-transform" />
                      <div className="flex-1 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${PONTO_COLORS[p.type as PontoType]}`}>
                            {PONTO_LABELS[p.type as PontoType]}
                          </span>
                          <span className="font-black text-gray-900 text-lg">
                            {format(new Date(p.timestamp), 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                          <MapPin size={12} className="text-pluma-300" />
                          {p.locationAvailable ? 'Coordenadas Capturadas' : 'Sem Localização'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Action Buttons & Visit Management */}
        <div className="space-y-6 sticky top-24">
          {!loading && (
            <div className="space-y-6">
              {/* Status da Jornada */}
              <div className="card overflow-hidden">
                <div className="bg-gray-900 -mx-6 -mt-6 p-6 mb-6">
                  <p className="text-pluma-300 text-xs font-bold uppercase tracking-widest mb-1">Status da Jornada</p>
                  <h4 className="text-white text-xl font-black">
                    {hasSaida ? 'Jornada Finalizada' : hasEntrada ? 'Em Trabalho' : 'Aguardando Início'}
                  </h4>
                </div>

                {hasSaida ? (
                  <div className="text-center py-6">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={40} className="text-green-500" />
                    </div>
                    <p className="font-black text-gray-900 text-xl mb-1">Tudo certo por hoje!</p>
                    <p className="text-sm text-gray-500">Seus horários foram registrados com sucesso.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nextPonto && (
                      <div className="bg-pluma-50 border border-pluma-100 rounded-2xl p-4 mb-2">
                        <p className="text-[10px] font-bold text-pluma-600 uppercase mb-2">Próximo Passo:</p>
                        <button
                          onClick={() => handleRegister(nextPonto)}
                          disabled={registering}
                          className="btn-primary w-full py-4 text-lg shadow-glow-pluma font-black"
                        >
                          {registering ? (
                            <span className="flex items-center justify-center gap-3">
                              <span className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent" />
                              Processando...
                            </span>
                          ) : nextPonto === 'ENTRADA' ? 'Iniciar Jornada' : `Registrar ${PONTO_LABELS[nextPonto]}`}
                        </button>
                      </div>
                    )}

                    {hasEntrada && !pontos.some(p => p.type === 'SAIDA_ALMOCO') && !hasSaida && (
                      <button
                        onClick={() => handleRegister('SAIDA')}
                        disabled={registering}
                        className="w-full py-3 bg-white border-2 border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600 rounded-xl font-bold transition-all text-sm"
                      >
                        Pular almoço e Finalizar Dia
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Visit Management Section - Only if Clocked In and not Clocked Out */}
              {hasEntrada && !hasSaida && (
                <div className="animate-fade-in space-y-6">
                  {visit ? (
                    /* Active Visit Checklist */
                    <div className="card border-l-4 border-l-pluma-600">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-pluma-50 text-pluma-700 rounded-xl">
                            <Store size={22} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-pluma-400">Visita no PDV</p>
                            <h4 className="text-lg font-black text-gray-900 truncate max-w-[180px]">{visit.pdv?.name}</h4>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-black ${(visit.photos?.length || 0) >= 10 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {(visit.photos?.length || 0)}/10 Fotos
                        </div>
                      </div>

                      {/* Photo Gallery Grid */}
                      <div className="grid grid-cols-5 gap-2 mb-6">
                        {(visit.photos || []).map(photo => (
                          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group cursor-pointer" onClick={() => photo.filePath !== 'offline' && setExpandedPhoto(`/uploads/${photo.fileName}`)}>
                            {photo.filePath === 'offline' ? (
                              <div className="w-full h-full bg-amber-50 flex items-center justify-center"><Camera size={14} className="text-amber-400" /></div>
                            ) : (
                              <img src={`/uploads/${photo.fileName}`} className="w-full h-full object-cover" alt="Visita" />
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setPhotoToDelete(photo.id); }} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                          </div>
                        ))}
                        {Array.from({ length: Math.max(0, 10 - (visit.photos?.length || 0)) }).map((_, i) => (
                          <label key={`empty-${i}`} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 cursor-pointer hover:border-pluma-300 transition-colors">
                            <Plus size={16} className="text-gray-300" />
                            <input ref={i === 0 ? fileInputRef : null} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                          </label>
                        ))}
                      </div>

                      {/* Validity Checklist */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Produtos & Validades</h5>
                          {!noProducts && <button onClick={() => setShowValidityModal(true)} className="text-[10px] font-black text-pluma-600 hover:text-pluma-800 transition-colors">ADICIONAR</button>}
                        </div>

                        {visit.validities && visit.validities.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto pr-1 space-y-2">
                            {visit.validities.map((v: Validity) => (
                              <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">{v.product?.name}</p>
                                  <p className="text-[10px] text-red-500 font-bold">Vence: {v.expiryDate}</p>
                                </div>
                                <button onClick={() => handleDeleteValidity(v.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                              </div>
                            ))}
                          </div>
                        ) : !noProducts ? (
                          <p className="text-[11px] text-gray-400 italic text-center py-4">Nenhuma validade registrada.</p>
                        ) : null}

                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 text-pluma-800 rounded border-gray-300" checked={noProducts} onChange={e => setNoProducts(e.target.checked)} />
                          <span className="text-[11px] font-bold text-gray-600">Não encontrei produtos</span>
                        </label>
                      </div>

                      {/* Finish Button */}
                      <div className="pt-4 border-t border-gray-100">
                        <button 
                          onClick={handleFinish} 
                          disabled={finishing || (visit.photos?.length || 0) < 10} 
                          className={`w-full py-4 rounded-xl font-black transition-all flex items-center justify-center gap-2 ${ (visit.photos?.length || 0) >= 10 ? 'bg-pluma-800 text-white shadow-glow-pluma' : 'bg-gray-100 text-gray-400 cursor-not-allowed' }`}
                        >
                          {finishing ? 'Finalizando...' : <><CheckCircle size={18} /> FINALIZAR VISITA</>}
                        </button>
                        {(visit.photos?.length || 0) < 10 && (
                          <p className="text-[10px] text-center text-amber-600 font-bold mt-2 uppercase tracking-tight italic">Faltam {10 - (visit.photos?.length || 0)} fotos para liberar</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Start Visit Component */
                    <div className="card">
                      <StartVisitForm pdvs={pdvs} onStart={() => load()} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-gold-500" />
              Lembrete Importante
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Certifique-se de estar no local de trabalho antes de registrar sua atividade. A geolocalização é validada automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Modals & Overlays */}
      {showValidityModal && visit && (
        <ValidityModal visitId={visit.id} products={products} onClose={() => setShowValidityModal(false)} onAdded={() => load()} />
      )}

      {photoToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 animate-slide-up shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 text-center mb-2">Excluir foto?</h3>
            <p className="text-gray-500 text-center text-sm mb-8">Esta ação é permanente.</p>
            <div className="flex gap-4">
              <button type="button" onClick={() => setPhotoToDelete(null)} className="btn-secondary flex-1 py-3.5">Cancelar</button>
              <button type="button" onClick={confirmDeletePhoto} className="btn-primary flex-1 py-3.5 bg-red-600 border-red-600 shadow-glow-pluma">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {expandedPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md" onClick={() => setExpandedPhoto(null)}>
          <img src={expandedPhoto} alt="Expandida" className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
