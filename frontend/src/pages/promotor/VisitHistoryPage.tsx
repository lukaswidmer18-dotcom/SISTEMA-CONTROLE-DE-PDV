import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Visit } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, Camera, Calendar, MapPin, ClipboardList, Store, Clock, AlertCircle } from 'lucide-react';

export default function VisitHistoryPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/visits/my');
        setVisits(data.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" />
    </div>
  );

  return (
    <div className="p-4 lg:p-0 space-y-6 animate-fade-in">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <ClipboardList size={24} />
            </div>
            Meu Histórico
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Acompanhe o registro de todas as suas visitas realizadas.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold border border-gray-100">
          <Calendar size={14} />
          Total de {visits.length} registros
        </div>
      </div>

      {visits.length === 0 ? (
        <div className="card text-center py-20 bg-white border-2 border-dashed border-gray-100">
          <Calendar size={48} className="mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">Nada por aqui ainda</h3>
          <p className="text-gray-400 text-sm mt-1">Suas visitas finalizadas aparecerão nesta lista.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visits.map(v => (
            <Link key={v.id} to={`/promotor/historico/${v.id}`} className="group card hover:shadow-xl hover:border-pluma-200 transition-all duration-300 border-gray-100 p-5 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pluma-50/30 rounded-bl-full -mr-8 -mt-8 group-hover:bg-pluma-100/50 transition-colors" />
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                      v.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {v.status === 'COMPLETED' ? 'FINALIZADA' : 'EM ABERTO'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      ID: {v.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-black text-gray-900 group-hover:text-pluma-900 transition-colors truncate flex items-center gap-2">
                    <Store size={18} className="text-pluma-600 shrink-0" />
                    {v.pdv?.name}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                      <Calendar size={14} className="text-gray-300" />
                      {format(new Date(v.startedAt), "dd 'de' MMM", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                      <Clock size={14} className="text-gray-300" />
                      {format(new Date(v.startedAt), 'HH:mm')} – {v.completedAt ? format(new Date(v.completedAt), 'HH:mm') : '...' }
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Camera size={14} className={v._count?.photos && v._count.photos >= 10 ? 'text-green-500' : 'text-orange-400'} />
                      <span className={v._count?.photos && v._count.photos >= 10 ? 'text-green-700' : 'text-orange-600'}>
                        {v._count?.photos || 0}/10 Fotos
                      </span>
                    </div>
                    {v.noProductsFound && (
                      <div className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-tighter">
                        <AlertCircle size={14} /> Sem Produtos
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="self-center ml-4">
                  <div className="bg-gray-50 p-2 rounded-xl text-gray-300 group-hover:bg-pluma-800 group-hover:text-white transition-all shadow-sm">
                    <ChevronRight size={24} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
