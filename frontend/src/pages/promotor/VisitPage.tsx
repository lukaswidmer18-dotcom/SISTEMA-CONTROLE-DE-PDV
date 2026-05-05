import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { Visit, PDV, Product, Validity } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Camera, Plus, Trash2, CheckCircle, AlertCircle, MapPin, X } from 'lucide-react';

async function getLocation(): Promise<{ latitude?: number; longitude?: number }> {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
    );
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return {};
  }
}

function StartVisitForm({ pdvs, onStart }: { pdvs: PDV[]; onStart: (pdvId: string) => void }) {
  const [selectedPdv, setSelectedPdv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPdv) return;
    setError('');
    setLoading(true);
    try {
      const loc = await getLocation();
      await api.post('/visits', { pdvId: selectedPdv, ...loc });
      onStart(selectedPdv);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao iniciar visita.');
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
  visitId: string; products: Product[]; onClose: () => void; onAdded: () => void;
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
      setError(err.response?.data?.error || 'Erro ao registrar validade.');
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
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [visitRes, pdvsRes, productsRes] = await Promise.all([
        api.get('/visits/active'),
        api.get('/pdvs'),
        api.get('/products'),
      ]);
      setVisit(visitRes.data.data);
      setPdvs(pdvsRes.data.data || []);
      setProducts(productsRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !visit) return;
    setError('');

    for (const file of files) {
      setUploading(true);
      try {
        const loc = await getLocation();
        const formData = new FormData();
        formData.append('photo', file);
        if (loc.latitude) formData.append('latitude', String(loc.latitude));
        if (loc.longitude) formData.append('longitude', String(loc.longitude));
        await api.post(`/visits/${visit.id}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await load();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao enviar foto.');
        break;
      } finally {
        setUploading(false);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDeleteValidity(validityId: string) {
    if (!visit) return;
    try {
      await api.delete(`/visits/${visit.id}/validities/${validityId}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao remover validade.');
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
    try {
      const loc = await getLocation();
      await api.patch(`/visits/${visit.id}/finish`, { ...loc, noProductsFound: noProducts });
      setSuccess('Visita finalizada com sucesso!');
      setVisit(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao finalizar visita.');
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

  if (!visit) return <StartVisitForm pdvs={pdvs} onStart={() => load()} />;

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
                <img src={`/uploads/${photo.fileName}`} alt="Foto da visita" className="w-full h-full object-cover" />
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
          onAdded={load}
        />
      )}
    </div>
  );
}
