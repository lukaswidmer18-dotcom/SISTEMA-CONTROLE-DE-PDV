import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Ponto, PontoType, Visit, Product, Validity, RupturaRegistro, PriceCheck, ChecklistItem } from '../../types';
import { useManualLocationFallback } from '../../hooks/useManualLocationFallback';
import { isNetworkError, queueOfflineAction, removeFromOfflineQueue } from '../../services/offlineQueue';
import { useOfflineSyncContext } from '../../contexts/OfflineSyncContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../../utils/format';
import { compressImage } from '../../utils/imageCompression';
import { CheckCircle, Clock, MapPin, AlertCircle, ClipboardList, Camera, Plus, Trash2, Store, X, Play, Lock } from 'lucide-react';
import {
  getOfflineActiveVisit,
  toVisit,
  isLocalVisit,
  getVisitReference,
  updateOfflineActiveVisit,
  PRODUCTS_CACHE_KEY,
  CHECKLIST_CACHE_KEY,
  readCache,
  writeCache,
} from '../../services/visitService';

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

function getErrorMessage(err: any, fallback: string) {
  return err.response?.data?.error || err.message || fallback;
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

  if (products.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-24 lg:pb-4">
        <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 lg:p-8 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Registrar Validade</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={24} /></button>
          </div>
          <p className="text-sm text-gray-500 text-center py-6">
            Nenhum produto cadastrado pra este PDV. Fale com o administrador pra vincular produtos a ele, ou marque "Não encontrei produtos no PDV".
          </p>
          <button type="button" onClick={onClose} className="btn-secondary w-full py-3.5">Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-24 lg:pb-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 lg:p-8 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
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

function RupturaModal({ visitId, products, onClose, onAdded }: {
  visitId: string; products: Product[]; onClose: () => void; onAdded: (ruptura?: RupturaRegistro) => void;
}) {
  const [form, setForm] = useState({ productId: '', qtyGondola: '0', qtyDeposito: '0', qtySeparadoTroca: '0' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      productId: form.productId,
      qtyGondola: parseInt(form.qtyGondola) || 0,
      qtyDeposito: parseInt(form.qtyDeposito) || 0,
      qtySeparadoTroca: parseInt(form.qtySeparadoTroca) || 0,
    };
    try {
      const { data } = await api.post(`/visits/${visitId}/ruptura`, payload);
      onAdded(data.data);
      onClose();
    } catch (err: any) {
      if (isNetworkError(err)) {
        const queued = await queueOfflineAction({
          kind: 'ruptura',
          ...getVisitReference(visitId),
          payload,
        });
        onAdded({
          id: queued.id,
          visitId,
          ...payload,
          product: products.find(p => p.id === form.productId),
        });
        onClose();
      } else {
        setError(getErrorMessage(err, 'Erro ao registrar ruptura.'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (products.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-24 lg:pb-4">
        <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 lg:p-8 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Registrar Ruptura</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={24} /></button>
          </div>
          <p className="text-sm text-gray-500 text-center py-6">
            Nenhum produto cadastrado pra este PDV. Fale com o administrador pra vincular produtos a ele.
          </p>
          <button type="button" onClick={onClose} className="btn-secondary w-full py-3.5">Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-24 lg:pb-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 lg:p-8 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Registrar Ruptura</h3>
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Gôndola</label>
              <input type="number" min="0" className="input-field py-3 text-sm font-bold" value={form.qtyGondola} onChange={e => setForm(f => ({ ...f, qtyGondola: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Depósito</label>
              <input type="number" min="0" className="input-field py-3 text-sm font-bold" value={form.qtyDeposito} onChange={e => setForm(f => ({ ...f, qtyDeposito: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">P/ Troca</label>
              <input type="number" min="0" className="input-field py-3 text-sm font-bold" value={form.qtySeparadoTroca} onChange={e => setForm(f => ({ ...f, qtySeparadoTroca: e.target.value }))} />
            </div>
          </div>
          {error && <div className="text-sm font-bold text-red-600 bg-red-50 p-4 rounded-xl">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3.5 font-bold">Cancelar</button>
            <button type="submit" disabled={loading || !form.productId} className="btn-primary flex-1 py-3.5 font-bold">{loading ? 'Salvando...' : 'Salvar Registro'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PriceCheckModal({ visitId, products, onClose, onAdded }: {
  visitId: string; products: Product[]; onClose: () => void; onAdded: (priceCheck?: PriceCheck) => void;
}) {
  const [form, setForm] = useState({ productId: '', ownPrice: '', competitorName: '', competitorPrice: '' });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const compressedFile = file ? await compressImage(file) : null;

    const formData = new FormData();
    formData.append('productId', form.productId);
    formData.append('ownPrice', form.ownPrice);
    formData.append('competitorName', form.competitorName);
    formData.append('competitorPrice', form.competitorPrice);
    if (compressedFile) formData.append('photo', compressedFile, compressedFile.name);

    try {
      const { data } = await api.post(`/visits/${visitId}/price-checks`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onAdded(data.data);
      onClose();
    } catch (err: any) {
      if (isNetworkError(err)) {
        const queued = await queueOfflineAction({
          kind: 'priceCheck',
          ...getVisitReference(visitId),
          payload: { ...form, file: compressedFile || undefined, fileName: compressedFile?.name },
        });
        onAdded({
          id: queued.id,
          visitId,
          productId: form.productId,
          ownPrice: Number(form.ownPrice) || 0,
          competitorName: form.competitorName || null,
          competitorPrice: form.competitorPrice ? Number(form.competitorPrice) : null,
          product: products.find(p => p.id === form.productId),
        });
        onClose();
      } else {
        setError(getErrorMessage(err, 'Erro ao registrar pesquisa de preço.'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (products.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-24 lg:pb-4">
        <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 lg:p-8 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Pesquisa de Preço</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={24} /></button>
          </div>
          <p className="text-sm text-gray-500 text-center py-6">
            Nenhum produto cadastrado pra este PDV. Fale com o administrador pra vincular produtos a ele.
          </p>
          <button type="button" onClick={onClose} className="btn-secondary w-full py-3.5">Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-24 lg:pb-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 lg:p-8 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Pesquisa de Preço</h3>
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
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Nosso preço (R$) *</label>
            <input type="number" min="0.01" step="0.01" className="input-field py-3 text-sm font-bold" required value={form.ownPrice} onChange={e => setForm(f => ({ ...f, ownPrice: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Concorrente</label>
              <input type="text" placeholder="Nome/marca" className="input-field py-3 text-sm font-bold" value={form.competitorName} onChange={e => setForm(f => ({ ...f, competitorName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Preço concorrente (R$)</label>
              <input type="number" min="0.01" step="0.01" className="input-field py-3 text-sm font-bold" value={form.competitorPrice} onChange={e => setForm(f => ({ ...f, competitorPrice: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Foto (opcional)</label>
            <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-pluma-300 hover:bg-pluma-50 transition-colors">
              <Camera size={16} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-500">{file ? file.name : 'Tirar foto da etiqueta/gôndola'}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          {error && <div className="text-sm font-bold text-red-600 bg-red-50 p-4 rounded-xl">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3.5 font-bold">Cancelar</button>
            <button type="submit" disabled={loading || !form.productId || !form.ownPrice} className="btn-primary flex-1 py-3.5 font-bold">{loading ? 'Salvando...' : 'Salvar Registro'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PontoPage() {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Visit States
  const [visit, setVisit] = useState<Visit | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showValidityModal, setShowValidityModal] = useState(false);
  const [showRupturaModal, setShowRupturaModal] = useState(false);
  const [showPriceCheckModal, setShowPriceCheckModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const { pendingCount, refreshCount, lastSyncTime } = useOfflineSyncContext();
  const { resolveLocation, modal: locationFallbackModal } = useManualLocationFallback();

  async function load() {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const [pontoRes, visitRes, productsRes, checklistRes] = await Promise.all([
        api.get('/ponto/today'),
        api.get('/visits/active'),
        api.get('/products'),
        api.get('/checklist'),
      ]);

      setPontos(pontoRes.data.data || []);

      const loadedProducts = productsRes.data.data || [];
      const loadedChecklist = checklistRes.data.data || [];
      writeCache(PRODUCTS_CACHE_KEY, loadedProducts);
      writeCache(CHECKLIST_CACHE_KEY, loadedChecklist);
      setProducts(loadedProducts);
      setChecklistItems(loadedChecklist);

      const activeVisit = visitRes.data.data || (getOfflineActiveVisit() ? toVisit(getOfflineActiveVisit()!) : null);
      setVisit(activeVisit);

    } catch (err: any) {
      if (isNetworkError(err)) {
        setError('Modo offline ativo. Os registros serão sincronizados quando a internet voltar.');
        setProducts(readCache<Product[]>(PRODUCTS_CACHE_KEY, []));
        setChecklistItems(readCache<ChecklistItem[]>(CHECKLIST_CACHE_KEY, []));
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


  // Visit Action Handlers
  async function executePhotoUpload(rawFile: File, checklistItemId: string, location: { latitude: number; longitude: number }, locationAvailable = true) {
    if (!visit) return;
    setUploading(true);
    const file = await compressImage(rawFile);
    try {
      const formData = new FormData();
      formData.append('photo', file, file.name);
      formData.append('checklistItemId', checklistItemId);
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
            checklistItemId,
            latitude: location.latitude ?? 0,
            longitude: location.longitude ?? 0,
            locationAvailable
          },
        });
        const photo = {
          id: queued.id,
          visitId: visit.id,
          checklistItemId,
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
            photos: [...current.photos, { id: photo.id, fileName: photo.fileName, uploadedAt: photo.uploadedAt, checklistItemId }],
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, checklistItemId: string) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !visit) return;
    setError('');

    for (const file of files) {
      const location = await resolveLocation();
      await executePhotoUpload(file, checklistItemId, location, location.locationAvailable);
    }

    e.target.value = '';
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

  async function handleDeleteRuptura(rupturaId: string) {
    if (!visit) return;
    if (rupturaId.startsWith('offline-')) {
      setVisit(prev => prev ? { ...prev, rupturas: (prev.rupturas || []).filter(r => r.id !== rupturaId) } : prev);
      if (isLocalVisit(visit.id)) {
        updateOfflineActiveVisit(current => ({
          ...current,
          rupturas: current.rupturas.filter(r => r.id !== rupturaId),
        }));
      }
      return;
    }

    try {
      await api.delete(`/visits/${visit.id}/ruptura/${rupturaId}`);
      load();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Erro ao remover registro de ruptura.'));
    }
  }

  async function handleDeletePriceCheck(priceCheckId: string) {
    if (!visit) return;
    if (priceCheckId.startsWith('offline-')) {
      setVisit(prev => prev ? { ...prev, priceChecks: (prev.priceChecks || []).filter(p => p.id !== priceCheckId) } : prev);
      if (isLocalVisit(visit.id)) {
        updateOfflineActiveVisit(current => ({
          ...current,
          priceChecks: current.priceChecks.filter(p => p.id !== priceCheckId),
        }));
      }
      return;
    }

    try {
      await api.delete(`/visits/${visit.id}/price-checks/${priceCheckId}`);
      load();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Erro ao remover pesquisa de preço.'));
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

  const hasEntrada = pontos.some(p => p.type === 'ENTRADA');
  const hasSaida = pontos.some(p => p.type === 'SAIDA');

  const visitProducts = useMemo(() => {
    if (!visit) return [];
    return products.filter(p => p.pdvs?.some(pdv => pdv.id === visit.pdvId));
  }, [products, visit]);

  const checklistStatus = useMemo(() => {
    const photosByItem = new Map<string, NonNullable<Visit['photos']>>();
    for (const photo of visit?.photos || []) {
      if (!photo.checklistItemId) continue;
      const existing = photosByItem.get(photo.checklistItemId) || [];
      photosByItem.set(photo.checklistItemId, [...existing, photo]);
    }
    const isCovered = (item: ChecklistItem) => (photosByItem.get(item.id)?.length || 0) >= item.requiredCount;
    const missing = checklistItems.filter(item => !isCovered(item));
    const firstPendingIndex = checklistItems.findIndex(item => !isCovered(item));
    return { photosByItem, missing, firstPendingIndex, isCovered };
  }, [visit, checklistItems]);

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
              <Clock size={18} className="text-pluma-600" />
              Jornada no PDV
            </h3>
            
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
            ) : !visit ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 animate-fade-in">
                <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400 font-medium">Nenhuma visita ativa.<br/>Inicie uma visita na tela Início.</p>
              </div>
            ) : pontos.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 animate-fade-in">
                <Play size={32} className="mx-auto text-pluma-300 mb-2" />
                <p className="text-sm text-gray-400 font-medium">Visita iniciada!<br/>Registre o <span className="text-pluma-600 font-bold uppercase">Início</span> no botão ao lado.</p>
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
              {/* Status da Jornada - Visible ONLY if there's a visit active. Registro de ponto (bateria/próximo passo) fica só na Início. */}
              {visit ? (
                <div className="card overflow-hidden">
                  <div className="bg-gray-900 -mx-6 -mt-6 p-6 -mb-6">
                    <p className="text-pluma-300 text-xs font-bold uppercase tracking-widest mb-1">Status da Visita</p>
                    <h4 className="text-white text-xl font-black">
                      {hasSaida ? 'Visita no PDV Encerrada' : hasEntrada ? 'Trabalhando no PDV' : 'Aguardando Início'}
                    </h4>
                  </div>
                </div>
              ) : (
                /* No Active Visit - Point back to Início, onde a visita é iniciada */
                <div className="card text-center py-10">
                  <MapPin size={32} className="mx-auto text-gray-300 mb-3" />
                  <h4 className="font-black text-gray-900 tracking-tight mb-1">Nenhuma visita ativa</h4>
                  <p className="text-sm text-gray-400 mb-5">Inicie uma visita na tela Início pra começar a trabalhar num PDV.</p>
                  <Link to="/promotor" className="btn-primary inline-block px-6 py-3 text-sm shadow-glow-pluma">
                    Ir pra Início
                  </Link>
                </div>
              )}

              {/* Visit Management Section (Photos/Products) - Only if Visit is Active */}
              {visit && (
                <div className="animate-fade-in space-y-6">
                  {/* Active Visit Checklist Card */}
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
                        <div className={`px-3 py-1 rounded-full text-xs font-black ${checklistItems.length === 0 ? 'bg-gray-100 text-gray-500' : checklistStatus.missing.length === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {checklistItems.length === 0 ? 'Sem checklist' : `${checklistItems.length - checklistStatus.missing.length}/${checklistItems.length} Itens`}
                        </div>
                      </div>

                      {/* Checklist de Fotos */}
                      <div className="space-y-2 mb-6">
                        {checklistItems.length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic text-center py-4">Nenhum item de checklist configurado pelo administrador.</p>
                        ) : (
                          checklistItems.map((item, index) => {
                            const photos = checklistStatus.photosByItem.get(item.id) || [];
                            const covered = checklistStatus.isCovered(item);
                            const locked = !covered && checklistStatus.firstPendingIndex !== -1 && index > checklistStatus.firstPendingIndex;
                            return (
                              <div key={item.id} className={`border rounded-xl p-2.5 ${locked ? 'bg-gray-50/50 border-gray-100 opacity-60' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-bold text-gray-800">{item.label}</p>
                                  <span className={`text-[10px] font-black uppercase tracking-wide shrink-0 ml-2 ${covered ? 'text-green-600' : locked ? 'text-gray-400' : 'text-amber-600'}`}>
                                    {locked ? 'Aguardando item anterior' : `${photos.length}/${item.requiredCount}`}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {photos.map(photo => (
                                    <div key={photo.id} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-gray-200 bg-white">
                                      {photo.filePath === 'offline' ? (
                                        <div className="w-full h-full bg-amber-50 flex items-center justify-center"><Camera size={16} className="text-amber-400" /></div>
                                      ) : (
                                        <img
                                          src={photo.filePath}
                                          className="w-full h-full object-cover cursor-pointer"
                                          onClick={() => setExpandedPhoto(photo.filePath)}
                                          alt={item.label}
                                        />
                                      )}
                                      <button onClick={() => setPhotoToDelete(photo.id)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-md">
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  ))}
                                  {!covered && !locked && (
                                    <label className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-pluma-300 hover:bg-pluma-50 transition-colors shrink-0">
                                      <Plus size={18} className="text-gray-300" />
                                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoUpload(e, item.id)} disabled={uploading} />
                                    </label>
                                  )}
                                  {locked && photos.length === 0 && (
                                    <div className="w-14 h-14 rounded-lg border border-gray-100 bg-white flex items-center justify-center shrink-0">
                                      <Lock size={16} className="text-gray-300" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Validity Checklist */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Produtos & Validades</h5>
                          <button onClick={() => setShowValidityModal(true)} className="text-[10px] font-black text-pluma-600 hover:text-pluma-800 transition-colors">ADICIONAR</button>
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
                        ) : (
                          <p className="text-[11px] text-gray-400 italic text-center py-4">Nenhuma validade registrada.</p>
                        )}
                      </div>

                      {/* Ruptura */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Ruptura de Estoque</h5>
                          <button onClick={() => setShowRupturaModal(true)} className="text-[10px] font-black text-pluma-600 hover:text-pluma-800 transition-colors">ADICIONAR</button>
                        </div>

                        {visit.rupturas && visit.rupturas.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto pr-1 space-y-2">
                            {visit.rupturas.map((r: RupturaRegistro) => (
                              <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">{r.product?.name}</p>
                                  <p className="text-[10px] text-gray-500 font-bold">
                                    Gôndola: {r.qtyGondola} · Depósito: {r.qtyDeposito} · Troca: {r.qtySeparadoTroca}
                                  </p>
                                </div>
                                <button onClick={() => handleDeleteRuptura(r.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic text-center py-4">Nenhum registro de estoque ainda.</p>
                        )}
                      </div>

                      {/* Pesquisa de Preço */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Pesquisa de Preço</h5>
                          <button onClick={() => setShowPriceCheckModal(true)} className="text-[10px] font-black text-pluma-600 hover:text-pluma-800 transition-colors">ADICIONAR</button>
                        </div>

                        {visit.priceChecks && visit.priceChecks.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto pr-1 space-y-2">
                            {visit.priceChecks.map((p: PriceCheck) => (
                              <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="flex items-center gap-3 min-w-0">
                                  {p.photoPath ? (
                                    <img
                                      src={p.photoPath}
                                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200 cursor-pointer"
                                      onClick={() => setExpandedPhoto(p.photoPath!)}
                                      alt={p.product?.name}
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                      <Camera size={14} className="text-gray-300" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-900 truncate">{p.product?.name}</p>
                                    <p className="text-[10px] text-gray-500 font-bold">
                                      Nosso: {formatCurrency(p.ownPrice)}
                                      {p.competitorPrice != null && ` · ${p.competitorName}: ${formatCurrency(p.competitorPrice)}`}
                                    </p>
                                  </div>
                                </div>
                                <button onClick={() => handleDeletePriceCheck(p.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0"><Trash2 size={14} /></button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic text-center py-4">Nenhuma pesquisa de preço ainda.</p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-100 text-center">
                        <p className="text-[11px] text-gray-400 font-semibold">
                          Pra encerrar essa visita, volte à tela Início e use o botão "Encerrar Jornada" no card Jornada de Hoje.
                        </p>
                      </div>
                    </div>
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
        <ValidityModal visitId={visit.id} products={visitProducts} onClose={() => setShowValidityModal(false)} onAdded={() => load()} />
      )}

      {showRupturaModal && visit && (
        <RupturaModal visitId={visit.id} products={visitProducts} onClose={() => setShowRupturaModal(false)} onAdded={() => load()} />
      )}

      {showPriceCheckModal && visit && (
        <PriceCheckModal visitId={visit.id} products={visitProducts} onClose={() => setShowPriceCheckModal(false)} onAdded={() => load()} />
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

      {locationFallbackModal}
    </div>
  );
}
