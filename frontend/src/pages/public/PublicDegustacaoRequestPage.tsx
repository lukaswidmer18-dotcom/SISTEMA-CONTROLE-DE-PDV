import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { PlusCircle, CheckCircle, ClipboardList } from 'lucide-react';

const EMPTY_FORM = { requesterName: '', date: '', city: '', address: '', store: '', productEvent: '', eventTime: '', supervisor: '' };

export default function PublicDegustacaoRequestPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/degustacoes/public', form);
      setSuccess(true);
      setForm(f => ({ ...EMPTY_FORM, requesterName: f.requesterName }));
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
              <input type="date" required className="input-field py-3 text-sm font-bold" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Horário do Evento *</label>
              <input type="text" required placeholder="Ex: 09h às 12h" className="input-field py-3 text-sm font-bold" value={form.eventTime} onChange={e => setForm(f => ({ ...f, eventTime: e.target.value }))} />
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
          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 font-bold">{loading ? 'Enviando...' : 'Enviar Solicitação'}</button>
        </form>

        <Link to="/solicitar-degustacao/minhas" className="flex items-center justify-center gap-2 text-sm font-bold text-pluma-600 hover:text-pluma-800 transition-colors">
          <ClipboardList size={16} />
          Ver minhas solicitações
        </Link>
      </div>
    </div>
  );
}
