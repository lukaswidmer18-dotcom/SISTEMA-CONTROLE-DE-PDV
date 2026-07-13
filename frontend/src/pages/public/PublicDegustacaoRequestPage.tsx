import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import api from '../../services/api';
import { PlusCircle, CheckCircle, ClipboardList, FileText, X } from 'lucide-react';

const MIN_LEAD_DAYS = 10;

const EMPTY_FORM = { requesterName: '', date: '', city: '', address: '', store: '', productEvent: '', supervisor: '', justification: '' };

export default function PublicDegustacaoRequestPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [eventTimeStart, setEventTimeStart] = useState('');
  const [eventTimeEnd, setEventTimeEnd] = useState('');
  const [document, setDocument] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const minDate = useMemo(() => format(addDays(new Date(), MIN_LEAD_DAYS), 'yyyy-MM-dd'), []);
  const minDateLabel = useMemo(() => format(addDays(new Date(), MIN_LEAD_DAYS), 'dd/MM/yyyy'), []);
  const dateInvalid = form.date !== '' && form.date < minDate;
  const dateErrorMessage = `A degustação precisa ser solicitada com pelo menos ${MIN_LEAD_DAYS} dias de antecedência. Data mínima: ${minDateLabel}.`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (dateInvalid) {
      setError(dateErrorMessage);
      return;
    }
    if (!eventTimeStart || !eventTimeEnd) {
      setError('Informe o horário de início e fim do evento.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append('eventTime', `${eventTimeStart} às ${eventTimeEnd}`);
      if (document) formData.append('document', document, document.name);

      await api.post('/degustacoes/public', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(true);
      setForm(f => ({ ...EMPTY_FORM, requesterName: f.requesterName }));
      setEventTimeStart('');
      setEventTimeEnd('');
      setDocument(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao enviar solicitação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-gold-500 text-[10px] font-semibold tracking-[0.25em] uppercase">Grupo Pluma</p>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-2 mt-1">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <PlusCircle size={24} />
            </div>
            Solicitar Degustação
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Preencha os dados do evento de degustação no PDV.
          </p>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-4 flex items-center gap-2 font-semibold">
            <CheckCircle size={18} />
            Solicitação enviada com sucesso.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Seu nome *</label>
            <input type="text" required placeholder="Nome do solicitante" className="input-field py-3 text-sm font-bold" value={form.requesterName} onChange={e => setForm(f => ({ ...f, requesterName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Data *</label>
              <input
                type="date"
                required
                min={minDate}
                className={`input-field py-3 text-sm font-bold ${dateInvalid ? 'border-red-400 focus:border-red-500' : ''}`}
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
              {dateInvalid ? (
                <p className="text-[10px] text-red-600 font-bold mt-1 ml-1">{dateErrorMessage}</p>
              ) : (
                <p className="text-[10px] text-gray-400 mt-1 ml-1">Mínimo {MIN_LEAD_DAYS} dias de antecedência.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Início do Evento *</label>
              <input type="time" required className="input-field py-3 text-sm font-bold" value={eventTimeStart} onChange={e => setEventTimeStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Fim do Evento *</label>
              <input type="time" required className="input-field py-3 text-sm font-bold" value={eventTimeEnd} onChange={e => setEventTimeEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Cidade *</label>
              <input type="text" required className="input-field py-3 text-sm font-bold" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Endereço *</label>
              <input type="text" required className="input-field py-3 text-sm font-bold" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Loja *</label>
            <input type="text" required placeholder="Ex: Muffatão West Side" className="input-field py-3 text-sm font-bold" value={form.store} onChange={e => setForm(f => ({ ...f, store: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Produto / Evento *</label>
            <input type="text" required placeholder="Ex: Coxinha Temperada" className="input-field py-3 text-sm font-bold" value={form.productEvent} onChange={e => setForm(f => ({ ...f, productEvent: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Supervisor</label>
            <input type="text" placeholder="Nome do supervisor" className="input-field py-3 text-sm font-bold" value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Justificativa *</label>
            <textarea
              required
              rows={3}
              placeholder="Explique o motivo da solicitação de degustação neste PDV..."
              className="input-field text-sm font-bold"
              value={form.justification}
              onChange={e => setForm(f => ({ ...f, justification: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Pedidos feitos ao PDV (PDF, opcional)</label>
            {document ? (
              <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={18} className="text-pluma-600 shrink-0" />
                  <span className="text-sm font-bold text-gray-700 truncate">{document.name}</span>
                </div>
                <button type="button" onClick={() => setDocument(null)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-pluma-300 hover:bg-pluma-50 transition-colors">
                <FileText size={22} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500">Clique pra anexar o PDF dos pedidos</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => setDocument(e.target.files?.[0] || null)}
                />
              </label>
            )}
            <p className="text-[10px] text-gray-400 mt-1 ml-1">Ajuda o administrador a decidir sobre a degustação.</p>
          </div>
          <button type="submit" disabled={loading || dateInvalid} className="btn-primary w-full py-3.5 font-bold">{loading ? 'Enviando...' : 'Enviar Solicitação'}</button>
        </form>

        <Link to="/solicitar-degustacao/minhas" className="flex items-center justify-center gap-2 text-sm font-bold text-pluma-600 hover:text-pluma-800 transition-colors">
          <ClipboardList size={16} />
          Ver minhas solicitações
        </Link>
      </div>
    </div>
  );
}
