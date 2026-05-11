import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ponto, Visit } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, ClipboardList, CheckCircle, AlertCircle } from 'lucide-react';

const PONTO_LABELS: Record<string, string> = {
  ENTRADA: 'Início',
  SAIDA_ALMOCO: 'Saída Almoço',
  RETORNO_ALMOCO: 'Retorno Almoço',
  SAIDA: 'Encerramento',
};

export default function PromotorHome() {
  const { user } = useAuth();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pontosRes, visitRes] = await Promise.all([
          api.get('/ponto/today'),
          api.get('/visits/active'),
        ]);
        setPontos(pontosRes.data.data || []);
        setActiveVisit(visitRes.data.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hasEntrada = pontos.some(p => p.type === 'ENTRADA');
  const hasSaida = pontos.some(p => p.type === 'SAIDA');

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
            <Link to="/promotor/visita" className="text-sm text-pluma-800 hover:text-pluma-600 font-bold">Ver Visita</Link>
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
                    <CheckCircle size={16} className={activeVisit.photos && activeVisit.photos.length >= 10 ? 'text-green-500' : 'text-gray-400'} />
                    <span className="text-xs font-semibold text-gray-600">{activeVisit.photos?.length || 0}/10 fotos</span>
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

          <Link to="/promotor/visita" className="btn-primary w-full py-3 text-base shadow-glow-pluma mt-auto">
            {activeVisit ? 'Continuar Visita' : 'Iniciar Nova Visita'}
          </Link>
        </div>
      </div>

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
