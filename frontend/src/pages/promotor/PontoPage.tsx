import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Visit, Product, Validity, RupturaRegistro, PriceCheck, ChecklistItem, FormFieldConfig, FormTypeConfig, FormType } from '../../types';
import { useManualLocationFallback } from '../../hooks/useManualLocationFallback';
import { useLocationPing } from '../../hooks/useLocationPing';
import { isNetworkError, queueOfflineAction, removeFromOfflineQueue } from '../../services/offlineQueue';
import { useOfflineSyncContext } from '../../contexts/OfflineSyncContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, centsInputToDisplay, centsInputToNumber } from '../../utils/format';
import { compressImage } from '../../utils/imageCompression';
import { CheckCircle, Clock, MapPin, AlertCircle, ClipboardList, Camera, Plus, Trash2, Store, X, Lock } from 'lucide-react';
import {
  getOfflineActiveVisit,
  toVisit,
  isLocalVisit,
  getVisitReference,
  updateOfflineActiveVisit,
  PRODUCTS_CACHE_KEY,
  CHECKLIST_CACHE_KEY,
  FORM_FIELDS_CACHE_KEY,
  FORM_TITLES_CACHE_KEY,
  readCache,
  writeCache,
} from '../../services/visitService';

function getErrorMessage(err: any, fallback: string) {
  return err.response?.data?.error || err.message || fallback;
}

const FORM_TYPE_FALLBACK_TITLE: Record<FormType, string> = {
  VALIDADE: 'Registrar Validade',
  RUPTURA: 'Registrar Ruptura',
  PRECO: 'Pesquisa de Preço',
};

function formTypeTitle(titles: FormTypeConfig[], formType: FormType): string {
  return titles.find(t => t.formType === formType)?.title || FORM_TYPE_FALLBACK_TITLE[formType];
}

function getFieldConfig(fields: FormFieldConfig[], key: string): FormFieldConfig | undefined {
  return fields.find(f => f.fieldKey === key);
}

function fieldLabel(fields: FormFieldConfig[], key: string, fallback: string, opts?: { suffix?: string; forceRequired?: boolean }): string {
  const cfg = getFieldConfig(fields, key);
  const label = cfg?.label || fallback;
  const required = cfg ? cfg.required : opts?.forceRequired ?? false;
  const suffix = opts?.suffix ? ` ${opts.suffix}` : '';
  return `${label}${suffix}${required ? ' *' : ''}`;
}

function isFieldActive(fields: FormFieldConfig[], key: string, fallback = true): boolean {
  const cfg = getFieldConfig(fields, key);
  return cfg ? cfg.active : fallback;
}

function isFieldRequired(fields: FormFieldConfig[], key: string, fallback = false): boolean {
  const cfg = getFieldConfig(fields, key);
  return cfg ? cfg.required : fallback;
}

function customFieldsOf(fields: FormFieldConfig[], formType: 'VALIDADE' | 'RUPTURA' | 'PRECO'): FormFieldConfig[] {
  return fields.filter(f => f.formType === formType && !f.core && f.active);
}

function buildExtraFieldsPayload(customFields: FormFieldConfig[], values: Record<string, string>): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const field of customFields) {
    const raw = values[field.fieldKey];
    if (raw === undefined || raw === '') continue;
    result[field.fieldKey] = field.fieldType === 'NUMBER' || field.fieldType === 'CURRENCY' ? Number(raw) : raw;
  }
  return result;
}

const EXTRA_FIELD_INPUT_TYPE: Record<string, string> = {
  NUMBER: 'number',
  CURRENCY: 'number',
  DATE: 'date',
  TEXT: 'text',
};

function ExtraFieldsInputs({ fields, values, onChange }: {
  fields: FormFieldConfig[]; values: Record<string, string>; onChange: (key: string, value: string) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <>
      {fields.map(field => (
        <div key={field.id}>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
            {field.label}{field.required ? ' *' : ''}
          </label>
          <input
            type={EXTRA_FIELD_INPUT_TYPE[field.fieldType] || 'text'}
            step={field.fieldType === 'CURRENCY' ? '0.01' : undefined}
            className="input-field py-3 text-sm font-bold"
            required={field.required}
            value={values[field.fieldKey] || ''}
            onChange={e => onChange(field.fieldKey, e.target.value)}
          />
        </div>
      ))}
    </>
  );
}

type PhotoT = NonNullable<Visit['photos']>[number];

function ChecklistPhotoAnswer({ item, photos, locked, uploading, uploadingPreview, onPhotoChange, onDeletePhoto, onExpandPhoto }: {
  item: ChecklistItem;
  photos: PhotoT[];
  locked: boolean;
  uploading: boolean;
  uploadingPreview: { itemId: string; url: string } | null;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeletePhoto: (photoId: string) => void;
  onExpandPhoto: (path: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map(photo => (
        <div key={photo.id} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-gray-200 bg-white">
          {photo.filePath === 'offline' ? (
            <div className="w-full h-full bg-amber-50 flex items-center justify-center"><Camera size={16} className="text-amber-400" /></div>
          ) : (
            <img src={photo.filePath} className="w-full h-full object-cover cursor-pointer" onClick={() => onExpandPhoto(photo.filePath)} alt={item.label} />
          )}
          <button onClick={() => onDeletePhoto(photo.id)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-md">
            <Trash2 size={10} />
          </button>
        </div>
      ))}
      {uploadingPreview?.itemId === item.id && (
        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-gray-200 bg-white">
          <img src={uploadingPreview.url} className="w-full h-full object-cover opacity-50" alt="Enviando..." />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <span className="w-4 h-4 border-2 border-pluma-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
      {photos.length < item.requiredCount && !locked && (
        <label className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-pluma-300 hover:bg-pluma-50 transition-colors shrink-0">
          <Plus size={18} className="text-gray-300" />
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhotoChange} disabled={uploading} />
        </label>
      )}
      {locked && photos.length === 0 && (
        <div className="w-14 h-14 rounded-lg border border-gray-100 bg-white flex items-center justify-center shrink-0">
          <Lock size={16} className="text-gray-300" />
        </div>
      )}
    </div>
  );
}

function ChecklistTextAnswer({ value, locked, onSubmit }: { value: string; locked: boolean; onSubmit: (value: string) => Promise<void> }) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const dirty = draft.trim() !== value.trim();

  return (
    <div className="flex items-center gap-2">
      <input
        className="input-field py-2 text-sm flex-1"
        placeholder="Digite a resposta..."
        value={draft}
        disabled={locked}
        onChange={e => setDraft(e.target.value)}
      />
      <button
        onClick={async () => { if (!draft.trim()) return; setSaving(true); await onSubmit(draft.trim()); setSaving(false); }}
        disabled={locked || saving || !draft.trim() || !dirty}
        className="btn-primary text-xs py-2 px-3 shrink-0"
      >
        {saving ? '...' : 'Salvar'}
      </button>
    </div>
  );
}

function ChecklistYesNoAnswer({ value, locked, onSubmit }: { value: string | undefined; locked: boolean; onSubmit: (value: string) => void }) {
  return (
    <div className="flex gap-2">
      {['Sim', 'Não'].map(opt => (
        <button
          key={opt}
          onClick={() => onSubmit(opt)}
          disabled={locked}
          className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${value === opt ? 'bg-pluma-600 text-white border-pluma-600' : 'bg-white text-gray-600 border-gray-200 hover:border-pluma-300'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ChecklistMultipleChoiceAnswer({ options, value, locked, onSubmit }: { options: string[]; value: string | undefined; locked: boolean; onSubmit: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSubmit(opt)}
          disabled={locked}
          className={`w-full text-left py-2 px-3 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${value === opt ? 'bg-pluma-600 text-white border-pluma-600' : 'bg-white text-gray-600 border-gray-200 hover:border-pluma-300'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ChecklistItemRow({ item, photos, value, covered, locked, uploading, uploadingPreview, onPhotoChange, onDeletePhoto, onExpandPhoto, onSubmitResponse }: {
  item: ChecklistItem;
  photos: PhotoT[];
  value: string | undefined;
  covered: boolean;
  locked: boolean;
  uploading: boolean;
  uploadingPreview: { itemId: string; url: string } | null;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeletePhoto: (photoId: string) => void;
  onExpandPhoto: (path: string) => void;
  onSubmitResponse: (value: string) => Promise<void>;
}) {
  return (
    <div className={`border rounded-xl p-2.5 ${locked ? 'bg-gray-50/50 border-gray-100 opacity-60' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-800">
          {item.label}{!item.required && <span className="text-gray-400 font-medium"> (opcional)</span>}
        </p>
        <span className={`text-[10px] font-black uppercase tracking-wide shrink-0 ml-2 ${covered ? 'text-green-600' : locked ? 'text-gray-400' : 'text-amber-600'}`}>
          {locked ? 'Aguardando item anterior' : item.type === 'FOTO' ? `${photos.length}/${item.requiredCount}` : covered ? 'Respondido' : 'Pendente'}
        </span>
      </div>
      {item.type === 'FOTO' ? (
        <ChecklistPhotoAnswer item={item} photos={photos} locked={locked} uploading={uploading} uploadingPreview={uploadingPreview} onPhotoChange={onPhotoChange} onDeletePhoto={onDeletePhoto} onExpandPhoto={onExpandPhoto} />
      ) : item.type === 'TEXTO' ? (
        <ChecklistTextAnswer value={value || ''} locked={locked} onSubmit={onSubmitResponse} />
      ) : item.type === 'SIM_NAO' ? (
        <ChecklistYesNoAnswer value={value} locked={locked} onSubmit={onSubmitResponse} />
      ) : (
        <ChecklistMultipleChoiceAnswer options={item.options || []} value={value} locked={locked} onSubmit={onSubmitResponse} />
      )}
    </div>
  );
}

function ValidityModal({ visitId, products, fields, title, onClose, onAdded }: {
  visitId: string; products: Product[]; fields: FormFieldConfig[]; title: string; onClose: () => void; onAdded: (validity?: Validity) => void;
}) {
  const [form, setForm] = useState({ productId: '', expiryDate: '', quantity: '1' });
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showQuantity = isFieldActive(fields, 'quantity');
  const customFields = customFieldsOf(fields, 'VALIDADE');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const extraFields = buildExtraFieldsPayload(customFields, extraValues);
    const payload = { ...form, extraFields };
    try {
      if (isLocalVisit(visitId)) throw new Error('OFFLINE_VISIT');
      await api.post(`/visits/${visitId}/validities`, payload);
      onAdded();
      onClose();
    } catch (err: any) {
      if (err.message === 'OFFLINE_VISIT' || isNetworkError(err)) {
        const queued = await queueOfflineAction({
          kind: 'validity',
          ...getVisitReference(visitId),
          payload,
        });
        onAdded({
          id: queued.id,
          visitId,
          productId: form.productId,
          expiryDate: form.expiryDate,
          quantity: Number(form.quantity) || 1,
          extraFields,
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
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
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
          <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'productId', 'Produto', { forceRequired: true })}</label>
            <select className="input-field py-3 text-sm font-bold" required value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">Selecione o produto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>)}
            </select>
          </div>
          <div className={showQuantity ? 'grid grid-cols-2 gap-4' : ''}>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'expiryDate', 'Vencimento', { forceRequired: true })}</label>
              <input type="date" className="input-field py-3 text-sm font-bold" required value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
            {showQuantity && (
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'quantity', 'Quantidade de Caixas Aberta')}</label>
                <input type="number" min="1" className="input-field py-3 text-sm font-bold" required={isFieldRequired(fields, 'quantity')} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
            )}
          </div>
          <ExtraFieldsInputs fields={customFields} values={extraValues} onChange={(key, value) => setExtraValues(v => ({ ...v, [key]: value }))} />
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

function RupturaModal({ visitId, products, fields, title, onClose, onAdded }: {
  visitId: string; products: Product[]; fields: FormFieldConfig[]; title: string; onClose: () => void; onAdded: (ruptura?: RupturaRegistro) => void;
}) {
  const [form, setForm] = useState({ productId: '', qtyGondola: '0', qtyDeposito: '0', qtySeparadoTroca: '0' });
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showTroca = isFieldActive(fields, 'qtySeparadoTroca');
  const customFields = customFieldsOf(fields, 'RUPTURA');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const extraFields = buildExtraFieldsPayload(customFields, extraValues);
    const payload = {
      productId: form.productId,
      qtyGondola: parseInt(form.qtyGondola) || 0,
      qtyDeposito: parseInt(form.qtyDeposito) || 0,
      qtySeparadoTroca: parseInt(form.qtySeparadoTroca) || 0,
      extraFields,
    };
    try {
      if (isLocalVisit(visitId)) throw new Error('OFFLINE_VISIT');
      const { data } = await api.post(`/visits/${visitId}/ruptura`, payload);
      onAdded(data.data);
      onClose();
    } catch (err: any) {
      if (err.message === 'OFFLINE_VISIT' || isNetworkError(err)) {
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
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
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
          <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'productId', 'Produto', { forceRequired: true })}</label>
            <select className="input-field py-3 text-sm font-bold" required value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">Selecione o produto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>)}
            </select>
          </div>
          <div className={`grid gap-3 ${showTroca ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'qtyGondola', 'Gôndola')}</label>
              <input type="number" min="0" className="input-field py-3 text-sm font-bold" required={isFieldRequired(fields, 'qtyGondola')} value={form.qtyGondola} onChange={e => setForm(f => ({ ...f, qtyGondola: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'qtyDeposito', 'Depósito')}</label>
              <input type="number" min="0" className="input-field py-3 text-sm font-bold" required={isFieldRequired(fields, 'qtyDeposito')} value={form.qtyDeposito} onChange={e => setForm(f => ({ ...f, qtyDeposito: e.target.value }))} />
            </div>
            {showTroca && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'qtySeparadoTroca', 'P/ Troca')}</label>
                <input type="number" min="0" className="input-field py-3 text-sm font-bold" required={isFieldRequired(fields, 'qtySeparadoTroca')} value={form.qtySeparadoTroca} onChange={e => setForm(f => ({ ...f, qtySeparadoTroca: e.target.value }))} />
              </div>
            )}
          </div>
          <ExtraFieldsInputs fields={customFields} values={extraValues} onChange={(key, value) => setExtraValues(v => ({ ...v, [key]: value }))} />
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

function PriceCheckModal({ visitId, products, fields, title, onClose, onAdded }: {
  visitId: string; products: Product[]; fields: FormFieldConfig[]; title: string; onClose: () => void; onAdded: (priceCheck?: PriceCheck) => void;
}) {
  const [form, setForm] = useState({ productId: '', ownPrice: '', competitorName: '', competitorPrice: '' });
  const [file, setFile] = useState<File | null>(null);
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showCompetitorName = isFieldActive(fields, 'competitorName');
  const showCompetitorPrice = isFieldActive(fields, 'competitorPrice');
  const showPhoto = isFieldActive(fields, 'photoPath');
  const customFields = customFieldsOf(fields, 'PRECO');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const compressedFile = file ? await compressImage(file) : null;
    const ownPriceValue = centsInputToNumber(form.ownPrice);
    const competitorPriceValue = form.competitorPrice ? centsInputToNumber(form.competitorPrice) : null;
    const extraFields = buildExtraFieldsPayload(customFields, extraValues);

    const formData = new FormData();
    formData.append('productId', form.productId);
    formData.append('ownPrice', String(ownPriceValue));
    formData.append('competitorName', form.competitorName);
    formData.append('competitorPrice', competitorPriceValue != null ? String(competitorPriceValue) : '');
    formData.append('extraFields', JSON.stringify(extraFields));
    if (compressedFile) formData.append('photo', compressedFile, compressedFile.name);

    try {
      if (isLocalVisit(visitId)) throw new Error('OFFLINE_VISIT');
      const { data } = await api.post(`/visits/${visitId}/price-checks`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onAdded(data.data);
      onClose();
    } catch (err: any) {
      if (err.message === 'OFFLINE_VISIT' || isNetworkError(err)) {
        const queued = await queueOfflineAction({
          kind: 'priceCheck',
          ...getVisitReference(visitId),
          payload: {
            productId: form.productId,
            ownPrice: String(ownPriceValue),
            competitorName: form.competitorName,
            competitorPrice: competitorPriceValue != null ? String(competitorPriceValue) : '',
            file: compressedFile || undefined,
            fileName: compressedFile?.name,
            extraFields,
          },
        });
        onAdded({
          id: queued.id,
          visitId,
          productId: form.productId,
          ownPrice: ownPriceValue,
          competitorName: form.competitorName || null,
          competitorPrice: competitorPriceValue,
          extraFields,
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
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
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
          <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'productId', 'Produto', { forceRequired: true })}</label>
            <select className="input-field py-3 text-sm font-bold" required value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">Selecione o produto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'ownPrice', 'Nosso Preço', { suffix: '(R$)', forceRequired: true })}</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              className="input-field py-3 text-sm font-bold"
              required
              value={centsInputToDisplay(form.ownPrice)}
              onChange={e => setForm(f => ({ ...f, ownPrice: e.target.value.replace(/\D/g, '') }))}
            />
          </div>
          {(showCompetitorName || showCompetitorPrice) && (
            <div className={`grid gap-4 ${showCompetitorName && showCompetitorPrice ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {showCompetitorName && (
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'competitorName', 'Concorrente')}</label>
                  <input type="text" placeholder="Nome/marca" className="input-field py-3 text-sm font-bold" required={isFieldRequired(fields, 'competitorName')} value={form.competitorName} onChange={e => setForm(f => ({ ...f, competitorName: e.target.value }))} />
                </div>
              )}
              {showCompetitorPrice && (
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'competitorPrice', 'Preço Concorrente', { suffix: '(R$)' })}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    className="input-field py-3 text-sm font-bold"
                    required={isFieldRequired(fields, 'competitorPrice')}
                    value={centsInputToDisplay(form.competitorPrice)}
                    onChange={e => setForm(f => ({ ...f, competitorPrice: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
              )}
            </div>
          )}
          {showPhoto && (
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{fieldLabel(fields, 'photoPath', 'Foto', { suffix: '(opcional)' })}</label>
              <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-pluma-300 hover:bg-pluma-50 transition-colors">
                <Camera size={16} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500">{file ? file.name : 'Tirar foto da etiqueta/gôndola'}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}
          <ExtraFieldsInputs fields={customFields} values={extraValues} onChange={(key, value) => setExtraValues(v => ({ ...v, [key]: value }))} />
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Visit States
  const [visit, setVisit] = useState<Visit | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);
  const [formTitles, setFormTitles] = useState<FormTypeConfig[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState<{ itemId: string; url: string } | null>(null);
  const [showValidityModal, setShowValidityModal] = useState(false);
  const [showRupturaModal, setShowRupturaModal] = useState(false);
  const [showPriceCheckModal, setShowPriceCheckModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const { refreshCount, lastSyncTime } = useOfflineSyncContext();
  const { resolveLocation, modal: locationFallbackModal } = useManualLocationFallback();
  useLocationPing(!!visit && visit.status === 'IN_PROGRESS');

  async function load() {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const [visitRes, productsRes, checklistRes, formFieldsRes, formTitlesRes] = await Promise.all([
        api.get('/visits/active'),
        api.get('/products'),
        api.get('/checklist'),
        api.get('/form-fields'),
        api.get('/form-types'),
      ]);

      const loadedProducts = productsRes.data.data || [];
      const loadedChecklist = checklistRes.data.data || [];
      const loadedFormFields = formFieldsRes.data.data || [];
      const loadedFormTitles = formTitlesRes.data.data || [];
      writeCache(PRODUCTS_CACHE_KEY, loadedProducts);
      writeCache(CHECKLIST_CACHE_KEY, loadedChecklist);
      writeCache(FORM_FIELDS_CACHE_KEY, loadedFormFields);
      writeCache(FORM_TITLES_CACHE_KEY, loadedFormTitles);
      setProducts(loadedProducts);
      setChecklistItems(loadedChecklist);
      setFormFields(loadedFormFields);
      setFormTitles(loadedFormTitles);

      const activeVisit = visitRes.data.data || (getOfflineActiveVisit() ? toVisit(getOfflineActiveVisit()!) : null);
      setVisit(activeVisit);

    } catch (err: any) {
      if (isNetworkError(err)) {
        setError('Modo offline ativo. Os registros serão sincronizados quando a internet voltar.');
        setProducts(readCache<Product[]>(PRODUCTS_CACHE_KEY, []));
        setChecklistItems(readCache<ChecklistItem[]>(CHECKLIST_CACHE_KEY, []));
        setFormFields(readCache<FormFieldConfig[]>(FORM_FIELDS_CACHE_KEY, []));
        setFormTitles(readCache<FormTypeConfig[]>(FORM_TITLES_CACHE_KEY, []));
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
    const previewUrl = URL.createObjectURL(rawFile);
    setUploadingPreview({ itemId: checklistItemId, url: previewUrl });
    setUploading(true);
    const file = await compressImage(rawFile);
    try {
      const formData = new FormData();
      formData.append('photo', file, file.name);
      formData.append('checklistItemId', checklistItemId);
      formData.append('latitude', String(location.latitude ?? 0));
      formData.append('longitude', String(location.longitude ?? 0));
      formData.append('locationAvailable', String(locationAvailable));

      if (isLocalVisit(visit.id)) throw new Error('OFFLINE_VISIT');
      const { data } = await api.post(`/visits/${visit.id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVisit(prev => prev ? { ...prev, photos: [...(prev.photos || []), data.data] } : prev);
      setNotice(locationAvailable ? 'Foto enviada!' : 'Foto enviada (Modo de Contingência - Sem GPS).');
    } catch (err: any) {
      if (err.message === 'OFFLINE_VISIT' || isNetworkError(err)) {
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
      setUploadingPreview(null);
      URL.revokeObjectURL(previewUrl);
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

  async function handleChecklistResponseSubmit(checklistItemId: string, value: string) {
    if (!visit) return;
    setError('');
    try {
      if (isLocalVisit(visit.id)) throw new Error('OFFLINE_VISIT');
      const { data } = await api.post(`/visits/${visit.id}/checklist-responses`, { checklistItemId, value });
      setVisit(prev => {
        if (!prev) return prev;
        const rest = (prev.checklistResponses || []).filter(r => r.checklistItemId !== checklistItemId);
        return { ...prev, checklistResponses: [...rest, data.data] };
      });
    } catch (err: any) {
      if (err.message === 'OFFLINE_VISIT' || isNetworkError(err)) {
        const queued = await queueOfflineAction({
          kind: 'checklistResponse',
          ...getVisitReference(visit.id),
          payload: { checklistItemId, value },
        });
        const response = { id: queued.id, visitId: visit.id, checklistItemId, value, createdAt: queued.createdAt };
        setVisit(prev => {
          if (!prev) return prev;
          const rest = (prev.checklistResponses || []).filter(r => r.checklistItemId !== checklistItemId);
          return { ...prev, checklistResponses: [...rest, response] };
        });
        if (isLocalVisit(visit.id)) {
          updateOfflineActiveVisit(current => ({
            ...current,
            checklistResponses: [...(current.checklistResponses || []).filter((r: any) => r.checklistItemId !== checklistItemId), response],
          }));
        }
        setNotice('Resposta salva offline.');
      } else {
        setError(getErrorMessage(err, 'Erro ao salvar resposta.'));
      }
    }
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
    const responseByItem = new Map<string, string>();
    for (const response of visit?.checklistResponses || []) {
      responseByItem.set(response.checklistItemId, response.value);
    }
    const isCovered = (item: ChecklistItem) =>
      item.type === 'FOTO' ? (photosByItem.get(item.id)?.length || 0) >= 1 : responseByItem.has(item.id);
    // Item opcional (required=false) nunca trava o próximo nem entra na conta do que falta.
    const missing = checklistItems.filter(item => item.required && !isCovered(item));
    const firstPendingIndex = checklistItems.findIndex(item => item.required && !isCovered(item));
    // Foto da fachada = primeiro item do checklist. Sem ela, o resto da visita (produtos,
    // ruptura, preço) fica bloqueado — é o antifraude de presença no lugar do GPS.
    const facadeCovered = checklistItems.length === 0 || isCovered(checklistItems[0]);
    const requiredTotal = checklistItems.filter(item => item.required).length;
    return { photosByItem, responseByItem, missing, firstPendingIndex, isCovered, facadeCovered, requiredTotal };
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
          Localização Monitorada
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Records Timeline */}
        <div className="space-y-4">
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
              Detalhes da Visita
            </h3>

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
            ) : !visit ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 animate-fade-in">
                <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400 font-medium">Nenhuma visita ativa.<br/>Inicie uma visita na tela Início.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-6 relative pl-14">
                  <div className="absolute left-[18px] w-4 h-4 rounded-full bg-white border-4 border-pluma-600 shadow-sm" />
                  <div className="flex-1 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider bg-green-100 text-green-800">
                        Início da Visita
                      </span>
                      <span className="font-black text-gray-900 text-lg">
                        {format(new Date(visit.startedAt), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                      <Store size={12} className="text-pluma-300" />
                      {visit.pdv?.name}
                    </div>
                  </div>
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
                      Trabalhando no PDV
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
                          {checklistItems.length === 0 ? 'Sem checklist' : `${checklistStatus.requiredTotal - checklistStatus.missing.length}/${checklistStatus.requiredTotal} Itens`}
                        </div>
                      </div>

                      {/* Checklist de Fotos — o último item (ex: foto de saída/fachada) fica
                          depois de Produtos/Ruptura/Preço, os demais ficam aqui antes. */}
                      <div className="space-y-2 mb-6">
                        {checklistItems.length === 0 && (
                          <p className="text-[11px] text-gray-400 italic text-center py-4">Nenhum item de checklist configurado pelo administrador.</p>
                        )}
                        {checklistItems.slice(0, -1).map((item, index) => {
                          const photos = checklistStatus.photosByItem.get(item.id) || [];
                          const covered = checklistStatus.isCovered(item);
                          const locked = !covered && checklistStatus.firstPendingIndex !== -1 && index > checklistStatus.firstPendingIndex;
                          return (
                            <ChecklistItemRow
                              key={item.id}
                              item={item}
                              photos={photos}
                              value={checklistStatus.responseByItem.get(item.id)}
                              covered={covered}
                              locked={locked}
                              uploading={uploading}
                              uploadingPreview={uploadingPreview}
                              onPhotoChange={e => handlePhotoUpload(e, item.id)}
                              onDeletePhoto={photoId => setPhotoToDelete(photoId)}
                              onExpandPhoto={path => setExpandedPhoto(path)}
                              onSubmitResponse={value => handleChecklistResponseSubmit(item.id, value)}
                            />
                          );
                        })}
                      </div>

                      {!checklistStatus.facadeCovered && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold rounded-xl p-3 mb-4">
                          <Lock size={14} className="shrink-0" />
                          Tire a foto de "{checklistItems[0]?.label}" pra liberar Produtos, Ruptura e Pesquisa de Preço.
                        </div>
                      )}

                      {/* Validity Checklist */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Produtos & Validades</h5>
                          <button onClick={() => setShowValidityModal(true)} disabled={!checklistStatus.facadeCovered} className="text-[10px] font-black text-pluma-600 hover:text-pluma-800 transition-colors disabled:opacity-30 disabled:pointer-events-none">ADICIONAR</button>
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
                          <button onClick={() => setShowRupturaModal(true)} disabled={!checklistStatus.facadeCovered} className="text-[10px] font-black text-pluma-600 hover:text-pluma-800 transition-colors disabled:opacity-30 disabled:pointer-events-none">ADICIONAR</button>
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
                          <button onClick={() => setShowPriceCheckModal(true)} disabled={!checklistStatus.facadeCovered} className="text-[10px] font-black text-pluma-600 hover:text-pluma-800 transition-colors disabled:opacity-30 disabled:pointer-events-none">ADICIONAR</button>
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

                      {/* Último item do checklist (ex: foto de saída/fachada) — fica depois
                          de Produtos/Ruptura/Preço, já que só faz sentido ao fim da visita. */}
                      {checklistItems.length > 0 && (() => {
                        const index = checklistItems.length - 1;
                        const item = checklistItems[index];
                        const photos = checklistStatus.photosByItem.get(item.id) || [];
                        const covered = checklistStatus.isCovered(item);
                        const locked = !covered && checklistStatus.firstPendingIndex !== -1 && index > checklistStatus.firstPendingIndex;
                        return (
                          <div className="space-y-2 mb-6">
                            <ChecklistItemRow
                              item={item}
                              photos={photos}
                              value={checklistStatus.responseByItem.get(item.id)}
                              covered={covered}
                              locked={locked}
                              uploading={uploading}
                              uploadingPreview={uploadingPreview}
                              onPhotoChange={e => handlePhotoUpload(e, item.id)}
                              onDeletePhoto={photoId => setPhotoToDelete(photoId)}
                              onExpandPhoto={path => setExpandedPhoto(path)}
                              onSubmitResponse={value => handleChecklistResponseSubmit(item.id, value)}
                            />
                          </div>
                        );
                      })()}

                      <div className="pt-4 border-t border-gray-100 text-center">
                        <p className="text-[11px] text-gray-400 font-semibold">
                          Pra encerrar essa visita, volte à tela Início e use o botão "Finalizar Visita" no card Visita em Andamento.
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
              Tire a foto de "{checklistItems[0]?.label || 'fachada'}" logo ao chegar no PDV — ela libera o resto da visita. Sua localização continua sendo monitorada durante o trabalho.
            </p>
          </div>
        </div>
      </div>

      {/* Modals & Overlays */}
      {showValidityModal && visit && (
        <ValidityModal visitId={visit.id} products={visitProducts} fields={formFields} title={formTypeTitle(formTitles, 'VALIDADE')} onClose={() => setShowValidityModal(false)} onAdded={() => load()} />
      )}

      {showRupturaModal && visit && (
        <RupturaModal visitId={visit.id} products={visitProducts} fields={formFields} title={formTypeTitle(formTitles, 'RUPTURA')} onClose={() => setShowRupturaModal(false)} onAdded={() => load()} />
      )}

      {showPriceCheckModal && visit && (
        <PriceCheckModal visitId={visit.id} products={visitProducts} fields={formFields} title={formTypeTitle(formTitles, 'PRECO')} onClose={() => setShowPriceCheckModal(false)} onAdded={() => load()} />
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
