import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ponto, PontoType, Visit, RotaVisita, ChecklistItem, PDV } from '../../types';
import { useManualLocationFallback } from '../../hooks/useManualLocationFallback';
import { useBatteryLevel } from '../../hooks/useBatteryLevel';
import { useRegisterPonto } from '../../hooks/useRegisterPonto';
import { useStartVisit } from '../../hooks/useStartVisit';
import { useOfflineSyncContext } from '../../contexts/OfflineSyncContext';
import { isNetworkError, queueOfflineAction } from '../../services/offlineQueue';
import { isLocalVisit, getVisitReference, clearOfflineActiveVisit } from '../../services/visitService';
import { getNextPonto } from '../../utils/ponto';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, CheckCircle, AlertCircle, Store, MessageSquareWarning, X, BatteryMedium } from 'lucide-react';

const PONTO_LABELS: Record<string, string> = {
  ENTRADA: 'Início',
  SAIDA_ALMOCO: 'Saída Almoço',
  RETORNO_ALMOCO: 'Retorno Almoço',
  SAIDA: 'Encerramento',
};

const NEXT_ACTION_LABELS: Record<string, string> = {
  ENTRADA: 'Iniciar Jornada',
  SAIDA_ALMOCO: 'Registrar Saída Almoço',
  RETORNO_ALMOCO: 'Registrar Retorno Almoço',
  SAIDA: 'Encerrar Jornada',
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

const DAYS_SHORT = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

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
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-24 lg:pb-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
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

function EncerramentoModal({
  visit,
  missingItems,
  onClose,
  onConfirm,
  confirming,
  error,
}: {
  visit: Visit;
  missingItems: ChecklistItem[];
  onClose: () => void;
  onConfirm: (noProductsFound: boolean, boxesGenerated: string) => void;
  confirming: boolean;
  error: string;
}) {
  const [noProductsFound, setNoProductsFound] = useState(visit.noProductsFound || false);
  const [boxesGenerated, setBoxesGenerated] = useState('');
  const validityCount = visit.validities?.length || 0;
  const boxesValid = boxesGenerated !== '' && Number.isInteger(Number(boxesGenerated)) && Number(boxesGenerated) >= 0;
  const canConfirm = missingItems.length === 0 && (noProductsFound || validityCount > 0) && boxesValid;

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-24 lg:pb-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Encerrar visita</h3>
            <p className="text-xs text-gray-500 mt-0.5">{visit.pdv?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"><X size={20} /></button>
        </div>

        {missingItems.length > 0 && (
          <div className="mb-4 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
            Faltam fotos do checklist: {missingItems.map(i => i.label).join(', ')}. Complete em "Continuar Visita" antes de encerrar.
          </div>
        )}

        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-pluma-800 rounded border-gray-300" checked={noProductsFound} onChange={e => setNoProductsFound(e.target.checked)} />
            <span className="text-[11px] font-bold text-gray-600">Não encontrei produtos</span>
          </label>

          {!noProductsFound && validityCount === 0 && (
            <p className="text-[11px] text-amber-600 font-bold">
              Registre ao menos uma validade na visita ou marque "Não encontrei produtos".
            </p>
          )}

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Número de caixas aberta *</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              required
              className="input-field py-3 text-sm font-bold"
              value={boxesGenerated}
              onChange={e => setBoxesGenerated(e.target.value)}
            />
          </div>

          {error && <div className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">Cancelar</button>
            <button
              type="button"
              disabled={!canConfirm || confirming}
              onClick={() => onConfirm(noProductsFound, boxesGenerated)}
              className="btn-primary flex-1 py-3"
            >
              {confirming ? 'Encerrando...' : 'Confirmar Encerramento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PromotorHome() {
  const { user } = useAuth();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [weekRoutes, setWeekRoutes] = useState<RotaVisita[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [justifyRoute, setJustifyRoute] = useState<RotaVisita | null>(null);
  const [pontoError, setPontoError] = useState('');
  const [batteryLevel, setBatteryLevel] = useBatteryLevel();
  const [visitError, setVisitError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedPdv, setSelectedPdv] = useState<PDV | null>(null);
  const [showEncerramentoModal, setShowEncerramentoModal] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [encerramentoError, setEncerramentoError] = useState('');

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const { resolveLocation, modal: locationFallbackModal } = useManualLocationFallback();
  const { registerPonto, registering } = useRegisterPonto(resolveLocation);
  const { startVisit, starting } = useStartVisit(resolveLocation);
  const { refreshCount } = useOfflineSyncContext();

  async function load() {
    try {
      const weekFrom = format(weekDates[0], 'yyyy-MM-dd');
      const weekTo = format(weekDates[6], 'yyyy-MM-dd');
      const [pontosRes, visitRes, routesRes, myVisitsRes, checklistRes] = await Promise.all([
        api.get('/ponto/today'),
        api.get('/visits/active'),
        api.get('/routes', { params: { from: weekFrom, to: weekTo } }),
        api.get('/visits/my'),
        api.get('/checklist'),
      ]);
      setPontos(pontosRes.data.data || []);
      setActiveVisit(visitRes.data.data);
      setWeekRoutes(routesRes.data.data || []);
      setRecentVisits(myVisitsRes.data.data || []);
      setChecklistItems(checklistRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const todayRoutes = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return weekRoutes.filter(r => r.date.slice(0, 10) === todayStr);
  }, [weekRoutes]);

  const selectedDayRoutes = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return weekRoutes.filter(r => r.date.slice(0, 10) === dateStr);
  }, [weekRoutes, selectedDate]);

  const hasEntrada = pontos.some(p => p.type === 'ENTRADA');
  const hasSaida = pontos.some(p => p.type === 'SAIDA');
  // Ponto é por visita: cada PDV visitado tem seu próprio ciclo Entrada/.../Encerramento,
  // o que permite calcular quanto tempo durou a visita naquele PDV.
  const nextPonto = activeVisit ? getNextPonto(pontos) : null;

  const checklistMissing = useMemo(() => {
    const photosByItem = new Map<string, number>();
    for (const photo of activeVisit?.photos || []) {
      if (!photo.checklistItemId) continue;
      photosByItem.set(photo.checklistItemId, (photosByItem.get(photo.checklistItemId) || 0) + 1);
    }
    return checklistItems.filter(item => (photosByItem.get(item.id) || 0) < item.requiredCount);
  }, [activeVisit, checklistItems]);

  async function handleQuickRegister(type: PontoType) {
    setPontoError('');
    try {
      const battery = batteryLevel !== '' ? Number(batteryLevel) : null;
      const { ponto, offline } = await registerPonto(type, battery);
      if (offline) {
        setPontos(prev => [...prev, ponto]);
      } else {
        load();
      }
    } catch (err: any) {
      setPontoError(err.response?.data?.error || err.message || 'Erro ao registrar atividade.');
    }
  }

  function getPdvStatusForDate(pdvId: string, dateStr: string): PdvStatus {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (dateStr === todayStr && activeVisit?.pdvId === pdvId) return 'EM_ANDAMENTO';
    const visited = recentVisits.some(
      v => v.pdvId === pdvId && v.status === 'COMPLETED' && v.startedAt.slice(0, 10) === dateStr
    );
    return visited ? 'VISITADA' : 'PENDENTE';
  }

  function handleSelectPdv(pdv: PDV) {
    setSelectedPdv(prev => (prev?.id === pdv.id ? null : pdv));
  }

  async function handleStartVisit(pdv: PDV) {
    setVisitError('');
    try {
      const { visit, offline } = await startVisit(pdv);
      setSelectedPdv(null);
      if (offline) {
        setActiveVisit(visit);
      } else {
        load();
      }
    } catch (err: any) {
      setVisitError(err.response?.data?.error || err.message || 'Erro ao iniciar visita.');
    }
  }

  async function handleConfirmEncerramento(noProductsFound: boolean, boxesGenerated: string) {
    if (!activeVisit) return;
    setEncerramentoError('');
    setEncerrando(true);
    try {
      const location = await resolveLocation();
      const battery = batteryLevel !== '' ? Number(batteryLevel) : null;

      // 1) Registra o ponto de Encerramento — marca o fim da visita nesse PDV
      try {
        await api.post('/ponto', { type: 'SAIDA', ...location, batteryLevel: battery });
      } catch (err: unknown) {
        if (isNetworkError(err)) {
          await queueOfflineAction({
            kind: 'ponto',
            payload: { type: 'SAIDA', latitude: location.latitude, longitude: location.longitude, locationAvailable: location.locationAvailable, batteryLevel: battery },
          });
        } else {
          throw err;
        }
      }

      // 2) Finaliza a visita
      if (isLocalVisit(activeVisit.id)) {
        await queueOfflineAction({
          kind: 'finishVisit',
          ...getVisitReference(activeVisit.id),
          payload: { ...location, noProductsFound, locationAvailable: location.locationAvailable, boxesGenerated },
        });
        clearOfflineActiveVisit();
      } else {
        try {
          await api.patch(`/visits/${activeVisit.id}/finish`, { ...location, noProductsFound, locationAvailable: location.locationAvailable, boxesGenerated });
        } catch (err: unknown) {
          if (isNetworkError(err)) {
            await queueOfflineAction({
              kind: 'finishVisit',
              ...getVisitReference(activeVisit.id),
              payload: { ...location, noProductsFound, locationAvailable: location.locationAvailable, boxesGenerated },
            });
          } else {
            throw err;
          }
        }
      }

      await refreshCount();
      setShowEncerramentoModal(false);
      load();
    } catch (err: any) {
      setEncerramentoError(err.response?.data?.error || err.message || 'Erro ao encerrar a visita.');
    } finally {
      setEncerrando(false);
    }
  }

  const selectedPdvTodayStatus = selectedPdv ? getPdvStatusForDate(selectedPdv.id, format(new Date(), 'yyyy-MM-dd')) : null;
  const canStartSelectedVisit = !!selectedPdv && !activeVisit && selectedPdvTodayStatus === 'PENDENTE';
  const selectedPdvScheduledToday = !!selectedPdv && todayRoutes.some(r => r.pdv?.id === selectedPdv.id);

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

      {/* Selected PDV — Big Title */}
      {selectedPdv && (
        <div className="animate-slide-up bg-white border border-pluma-100 rounded-2xl px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-pluma-50 text-pluma-700 rounded-xl shrink-0">
                <Store size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-pluma-600 uppercase tracking-wider mb-0.5">PDV Selecionado</p>
                <h2 className="text-2xl lg:text-4xl font-black text-gray-900 tracking-tight truncate">{selectedPdv.name}</h2>
                {selectedPdv.city && <p className="text-sm text-gray-400 font-semibold">{selectedPdv.city}</p>}
              </div>
            </div>
            <button
              onClick={() => setSelectedPdv(null)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {canStartSelectedVisit && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-xs text-gray-500 font-medium flex-1">
                {selectedPdvScheduledToday
                  ? 'Este PDV está programado pra hoje.'
                  : 'Imprevisto na rota? Você pode iniciar a visita a este PDV agora mesmo fora do dia programado.'}
              </p>
              <button
                onClick={() => handleStartVisit(selectedPdv)}
                disabled={starting}
                className="btn-primary py-2.5 px-5 text-sm shadow-glow-pluma shrink-0"
              >
                {starting ? 'Iniciando...' : 'Iniciar Visita'}
              </button>
            </div>
          )}

          {selectedPdv && activeVisit && activeVisit.pdvId !== selectedPdv.id && (
            <p className="mt-3 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Finalize a visita em andamento antes de iniciar uma nova.
            </p>
          )}

          {selectedPdvTodayStatus === 'VISITADA' && (
            <p className="mt-3 text-xs font-bold text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
              Visita a este PDV já concluída hoje.
            </p>
          )}

          {visitError && (
            <div className="mt-3 text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl">{visitError}</div>
          )}
        </div>
      )}

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

          {pontoError && (
            <div className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl mb-3">{pontoError}</div>
          )}

          {!hasSaida && nextPonto && (
            <div className="mt-auto">
              <div className="mb-3">
                <label className="flex items-center gap-1.5 text-[10px] font-black text-pluma-600 uppercase mb-1.5">
                  <BatteryMedium size={13} /> Bateria do celular (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  inputMode="numeric"
                  placeholder="Ex: 80"
                  className="input-field text-sm py-2.5"
                  value={batteryLevel}
                  onChange={e => setBatteryLevel(e.target.value)}
                />
              </div>
              <button
                onClick={() => {
                  if (nextPonto === 'SAIDA') {
                    setEncerramentoError('');
                    setShowEncerramentoModal(true);
                  } else {
                    handleQuickRegister(nextPonto);
                  }
                }}
                disabled={registering}
                className="btn-primary w-full py-3 text-base shadow-glow-pluma"
              >
                {registering ? 'Processando...' : NEXT_ACTION_LABELS[nextPonto]}
              </button>

              {hasEntrada && !pontos.some(p => p.type === 'SAIDA_ALMOCO') && !hasSaida && (
                <button
                  onClick={() => { setEncerramentoError(''); setShowEncerramentoModal(true); }}
                  disabled={registering}
                  className="w-full mt-2 py-2.5 bg-white border-2 border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600 rounded-xl font-bold transition-all text-sm"
                >
                  Pular almoço e Encerrar PDV
                </button>
              )}
            </div>
          )}

          {!hasSaida && !activeVisit && (
            <p className="text-xs text-gray-400 font-medium mt-auto text-center py-1">
              Inicie uma visita ao lado pra começar a registrar sua jornada.
            </p>
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
                <p className="text-sm text-gray-500 font-medium">Nenhuma visita em andamento.</p>
                <p className="text-xs text-gray-400 mt-1">Selecione um PDV em "PDVs da Semana" abaixo pra iniciar.</p>
              </div>
            )}
          </div>

          {activeVisit && (
            <Link to="/promotor/ponto" className="btn-primary w-full py-3 text-base shadow-glow-pluma mt-auto">
              Continuar Visita
            </Link>
          )}
        </div>
      </div>

      {/* PDVs da Rota da Semana */}
      <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 lg:text-lg">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <Store size={20} />
            </div>
            PDVs da Semana
          </h3>
          <Link to="/promotor/ponto" className="text-sm text-pluma-800 hover:text-pluma-600 font-bold">Gerenciar</Link>
        </div>

        {/* Day of Week Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {weekDates.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`shrink-0 flex flex-col items-center justify-center w-12 h-14 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-pluma-800 border-pluma-800 text-white'
                    : isToday
                    ? 'bg-pluma-50 border-pluma-200 text-pluma-700'
                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-pluma-200'
                }`}
              >
                <span className="text-[9px] font-black uppercase">{DAYS_SHORT[i]}</span>
                <span className="text-sm font-black">{format(date, 'd')}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
        ) : selectedDayRoutes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <AlertCircle size={32} className="text-orange-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Nenhum PDV atribuído pra esse dia.</p>
            <p className="text-xs text-gray-400 mt-1">Fale com o administrador pra montar sua rota.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayRoutes.map(route => {
              if (!route.pdv) return null;
              const dateStr = format(selectedDate, 'yyyy-MM-dd');
              const status = getPdvStatusForDate(route.pdv.id, dateStr);
              const canJustify = status === 'PENDENTE';
              const isSelectedPdv = selectedPdv?.id === route.pdv.id;
              return (
                <div
                  key={route.id}
                  onClick={() => handleSelectPdv(route.pdv as PDV)}
                  className={`border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                    isSelectedPdv ? 'bg-pluma-50 border-pluma-300' : 'bg-gray-50 border-gray-100 hover:border-pluma-200'
                  }`}
                >
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
                      onClick={e => {
                        e.stopPropagation();
                        setJustifyRoute(route);
                      }}
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

      {showEncerramentoModal && activeVisit && (
        <EncerramentoModal
          visit={activeVisit}
          missingItems={checklistMissing}
          onClose={() => setShowEncerramentoModal(false)}
          onConfirm={handleConfirmEncerramento}
          confirming={encerrando}
          error={encerramentoError}
        />
      )}

      {locationFallbackModal}
    </div>
  );
}
