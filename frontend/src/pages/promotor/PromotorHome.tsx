import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ponto, Visit, RotaVisita, ChecklistItem } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, ClipboardList, CheckCircle, AlertCircle, Store, MessageSquareWarning, X, BatteryMedium } from 'lucide-react';

const PONTO_LABELS: Record<string, string> = {
  ENTRADA: 'Início',
  SAIDA_ALMOCO: 'Saída Almoço',
  RETORNO_ALMOCO: 'Retorno Almoço',
  SAIDA: 'Encerramento',
};

type PdvStatus = 'EM_ANDAMENTO' | 'VISITADA' | 'PENDENTE';

const STATUS_LABELS: Record<PdvStatus, string> = {
  EM_ANDAMENTO: 'Em andamento',
  VISITADA: 'Visitada',
  PENDENTE: 'Pendente',
};

const STATUS_COLORS: Record<PdvStatus, string> = {
  EM_ANDAMENTO: 'bg-blue-50 text-blue-700 border-blue-100',
  VISITADA: 'bg-green-50 text-green-700 border-green-100',
  PENDENTE: 'bg-amber-50 text-amber-700 border-amber-100',
};

function JustifyModal({ route, onClose, onSaved }: { route: RotaVisita; onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState(route.justification || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 10) {
      setError('Justificativa precisa ter pelo menos 10 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.patch(`/routes/${route.id}/justify`, { justification: text.trim() });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar justificativa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Justificar visita não realizada</h3>
            <p className="text-xs text-gray-500 mt-0.5">{route.pdv?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              className="input-field text-sm"
              rows={4}
              placeholder="Explique por que não foi possível visitar esse PDV hoje (mínimo 10 caracteres)..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <p className="text-[11px] text-gray-400 mt-1">{text.trim().length}/10 caracteres mínimos</p>
          </div>
          {error && <div className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">Cancelar</button>
            <button type="submit" disabled={loading || text.trim().length < 10} className="btn-primary flex-1 py-3">
              {loading ? 'Salvando...' : 'Salvar Justificativa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PromotorHome() {
  const { user } = useAuth();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [todayRoutes, setTodayRoutes] = useState<RotaVisita[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [justifyRoute, setJustifyRoute] = useState<RotaVisita | null>(null);

  async function load() {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const [pontosRes, visitRes, routesRes, myVisitsRes, checklistRes] = await Promise.all([
        api.get('/ponto/today'),
        api.get('/visits/active'),
        api.get('/routes', { params: { from: todayStr, to: todayStr } }),
        api.get('/visits/my'),
        api.get('/checklist'),
      ]);
      setPontos(pontosRes.data.data || []);
      setActiveVisit(visitRes.data.data);
      setTodayRoutes(routesRes.data.data || []);
      setRecentVisits(myVisitsRes.data.data || []);
      setChecklistItems(checklistRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const hasEntrada = pontos.some(p => p.type === 'ENTRADA');
  const hasSaida = pontos.some(p => p.type === 'SAIDA');

  function getPdvStatus(pdvId: string): PdvStatus {
    if (activeVisit?.pdvId === pdvId) return 'EM_ANDAMENTO';
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const visitedToday = recentVisits.some(
      v => v.pdvId === pdvId && v.status === 'COMPLETED' && v.startedAt.slice(0, 10) === todayStr
    );
    return visitedToday ? 'VISITADA' : 'PENDENTE';
  }

  const completedChecklistItems = checklistItems.filter(item => {
    const count = (activeVisit?.photos || []).filter(p => p.checklistItemId === item.id).length;
    return count >= item.requiredCount;
  }).length;

  return (
    <div className="p-4 lg:p-0 space-y-6 animate-fade-in">
      
      {/* Welcome Section — Full Width */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pluma-950 via-pluma-800 to-pluma-700 text-white rounded-2xl p-6 lg:p-10 shadow-glow-pluma animate-slide-up">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/80 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-gold-400/[0.14] to-transparent" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-pluma-200 text-sm lg:text-base font-medium">Bom dia,</p>
            <h2 className="text-2xl lg:text-4xl font-black tracking-tight">{user?.name}</h2>
            <p className="text-gold-400 text-xs lg:text-sm mt-1 font-semibold flex items-center gap-2">
              <Clock size={14} />
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-8 border-l border-white/10 pl-8">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-pluma-300 font-bold mb-1">Status do Dia</p>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${hasSaida ? 'bg-red-500/20 text-red-300' : hasEntrada ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white'}`}>
                {hasSaida ? 'FINALIZADO' : hasEntrada ? 'ATIVO' : 'AGUARDANDO'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Ponto Section */}
        <div className="card hover:shadow-card-hover transition-all duration-300 animate-slide-up flex flex-col" style={{ animationDelay: '90ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 lg:text-lg">
              <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
                <Clock size={20} />
              </div>
              Jornada de Hoje
            </h3>
            <Link to="/promotor/ponto" className="text-sm text-pluma-800 hover:text-pluma-600 font-bold">Gerenciar</Link>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
            ) : pontos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <AlertCircle size={32} className="text-orange-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Nenhuma atividade registrada hoje.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {['ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA'].map(type => {
                  const p = pontos.find(p => p.type === type);
                  return (
                    <div key={type} className={`p-3 rounded-xl border ${p ? 'bg-white border-pluma-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{PONTO_LABELS[type]}</p>
                      <p className={`text-lg font-black ${p ? 'text-pluma-900' : 'text-gray-300'}`}>
                        {p ? format(new Date(p.timestamp), 'HH:mm') : '--:--'}
                      </p>
                      {p?.batteryLevel != null && (
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 flex items-center gap-1">
                          <BatteryMedium size={11} /> {p.batteryLevel}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!hasSaida && (
            <Link to="/promotor/ponto" className="btn-primary w-full py-3 text-base shadow-glow-pluma mt-auto">
              {hasEntrada ? 'Atualizar Atividade' : 'Iniciar Jornada'}
            </Link>
          )}
        </div>

        {/* Active Visit Section */}
        <div className="card hover:shadow-card-hover transition-all duration-300 animate-slide-up flex flex-col" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 lg:text-lg">
              <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
                <MapPin size={20} />
              </div>
              Visita em Andamento
            </h3>
            <Link to="/promotor/ponto" className="text-sm text-pluma-800 hover:text-pluma-600 font-bold">Ver Visita</Link>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
            ) : activeVisit ? (
              <div className="bg-gradient-to-br from-pluma-50 to-white border border-pluma-100 rounded-2xl p-5 mb-4 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-pluma-600 uppercase mb-1 tracking-wider">PDV Atual</p>
                    <p className="text-xl font-black text-gray-900 leading-tight">{activeVisit.pdv?.name}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-pluma-50">
                    <MapPin size={20} className="text-pluma-800" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600">Início: {format(new Date(activeVisit.startedAt), 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className={checklistItems.length > 0 && completedChecklistItems >= checklistItems.length ? 'text-green-500' : 'text-gray-400'} />
                    <span className="text-xs font-semibold text-gray-600">
                      {completedChecklistItems}/{checklistItems.length} itens
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 mb-4">
                <MapPin size={32} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">Nenhuma visita iniciada no momento.</p>
              </div>
            )}
          </div>

          <Link to="/promotor/ponto" className="btn-primary w-full py-3 text-base shadow-glow-pluma mt-auto">
            {activeVisit ? 'Continuar Visita' : 'Iniciar Nova Visita'}
          </Link>
        </div>
      </div>

      {/* PDVs da Rota de Hoje */}
      <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 lg:text-lg">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <Store size={20} />
            </div>
            PDVs de Hoje
          </h3>
          <Link to="/promotor/ponto" className="text-sm text-pluma-800 hover:text-pluma-600 font-bold">Gerenciar</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
        ) : todayRoutes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <AlertCircle size={32} className="text-orange-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Nenhum PDV atribuído pra hoje.</p>
            <p className="text-xs text-gray-400 mt-1">Fale com o administrador pra montar sua rota.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayRoutes.map(route => {
              if (!route.pdv) return null;
              const status = getPdvStatus(route.pdv.id);
              const canJustify = status === 'PENDENTE';
              return (
                <div key={route.id} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 shrink-0">
                        <Store size={16} className="text-pluma-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{route.pdv.name}</p>
                        {route.pdv.city && <p className="text-xs text-gray-400 truncate">{route.pdv.city}</p>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border shrink-0 ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  {route.justification ? (
                    <div className="mt-2 ml-11 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                      <MessageSquareWarning size={13} className="shrink-0 mt-0.5" />
                      <p className="leading-tight">{route.justification}</p>
                    </div>
                  ) : canJustify ? (
                    <button
                      onClick={() => setJustifyRoute(route)}
                      className="mt-2 ml-11 flex items-center gap-1.5 text-[11px] font-bold text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      <MessageSquareWarning size={13} /> Justificar não comparecimento
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {justifyRoute && (
        <JustifyModal route={justifyRoute} onClose={() => setJustifyRoute(null)} onSaved={load} />
      )}

      {/* History Shortcut — Full Width on PC */}
      <Link to="/promotor/historico" className="card hover:shadow-card-hover transition-all duration-300 animate-slide-up flex items-center justify-between p-6 group" style={{ animationDelay: '230ms' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-50 text-gray-400 group-hover:bg-pluma-50 group-hover:text-pluma-700 rounded-xl transition-colors">
            <ClipboardList size={24} />
          </div>
          <div>
            <span className="font-black text-gray-900 lg:text-xl">Histórico de Visitas</span>
            <p className="text-sm text-gray-500">Consulte seus registros anteriores e fotos enviadas.</p>
          </div>
        </div>
        <div className="bg-gray-50 p-2 rounded-full group-hover:bg-pluma-100 transition-colors">
          <CheckCircle size={20} className="text-gray-300 group-hover:text-pluma-800" />
        </div>
      </Link>
    </div>
  );
}
