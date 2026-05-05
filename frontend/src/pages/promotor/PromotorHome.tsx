import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ponto, Visit } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, ClipboardList, CheckCircle, AlertCircle } from 'lucide-react';

const PONTO_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA_ALMOCO: 'Saída Almoço',
  RETORNO_ALMOCO: 'Retorno Almoço',
  SAIDA: 'Saída',
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
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="relative overflow-hidden bg-gradient-to-br from-pluma-950 via-pluma-800 to-pluma-700 text-white rounded-lg p-4 shadow-glow-pluma animate-slide-up">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/80 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-gold-400/[0.14] to-transparent" />
        <div className="pointer-events-none absolute left-4 bottom-0 h-0.5 w-24 bg-gradient-to-r from-gold-400 to-transparent" />
        <div className="relative">
          <p className="text-pluma-200 text-sm">Bom dia,</p>
          <h2 className="text-xl font-bold">{user?.name}</h2>
          <p className="text-pluma-200 text-xs mt-1">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Ponto status */}
      <div className="card hover:shadow-card-hover transition-all duration-300 animate-slide-up" style={{ animationDelay: '90ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Clock size={16} /> Ponto de Hoje</h3>
          <Link to="/promotor/ponto" className="text-sm text-pluma-800 hover:text-pluma-600 font-medium">Ver mais</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-2 border-pluma-800 border-t-transparent" /></div>
        ) : pontos.length === 0 ? (
          <div className="flex items-center gap-2 text-orange-600 bg-orange-50 rounded-lg p-3 text-sm">
            <AlertCircle size={16} />
            Você ainda não registrou o ponto hoje.
          </div>
        ) : (
          <div className="space-y-2">
            {pontos.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{PONTO_LABELS[p.type]}</span>
                <span className="font-medium text-gray-800">
                  {format(new Date(p.timestamp), 'HH:mm')}
                </span>
              </div>
            ))}
            {hasSaida && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-2 text-xs mt-2">
                <CheckCircle size={14} /> Jornada de hoje concluída!
              </div>
            )}
          </div>
        )}

        {!hasSaida && (
          <Link to="/promotor/ponto" className="btn-primary w-full mt-3 text-sm">
            {hasEntrada ? 'Registrar Ponto' : 'Registrar Entrada'}
          </Link>
        )}
      </div>

      {/* Active visit */}
      <div className="card hover:shadow-card-hover transition-all duration-300 animate-slide-up" style={{ animationDelay: '160ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><MapPin size={16} /> Visita Atual</h3>
          <Link to="/promotor/visita" className="text-sm text-pluma-800 hover:text-pluma-600 font-medium">Ver mais</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-2 border-pluma-800 border-t-transparent" /></div>
        ) : activeVisit ? (
          <div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
              <p className="font-medium text-gray-800">{activeVisit.pdv?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Iniciada às {format(new Date(activeVisit.startedAt), 'HH:mm')}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                <span className={`font-medium ${activeVisit.photos && activeVisit.photos.length >= 10 ? 'text-green-600' : 'text-red-500'}`}>
                  {activeVisit.photos?.length || 0}/10 fotos
                </span>
              </div>
            </div>
            <Link to="/promotor/visita" className="btn-primary w-full text-sm">Continuar Visita</Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">Nenhuma visita em andamento.</p>
            <Link to="/promotor/visita" className="btn-primary w-full text-sm">Iniciar Nova Visita</Link>
          </div>
        )}
      </div>

      {/* History shortcut */}
      <div className="card hover:shadow-card-hover transition-all duration-300 animate-slide-up" style={{ animationDelay: '230ms' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-gray-600" />
            <span className="font-semibold text-gray-800">Histórico de Visitas</span>
          </div>
          <Link to="/promotor/historico" className="text-sm text-pluma-800 hover:text-pluma-600 font-medium">Ver tudo</Link>
        </div>
      </div>
    </div>
  );
}
