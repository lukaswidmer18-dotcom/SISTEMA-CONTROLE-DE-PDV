import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Visit } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, Camera, Calendar, MapPin } from 'lucide-react';

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
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Histórico de Visitas</h2>

      {visits.length === 0 ? (
        <div className="card text-center py-8">
          <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-gray-400">Nenhuma visita registrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map(v => (
            <Link key={v.id} to={`/promotor/historico/${v.id}`} className="card hover:shadow-md transition-shadow block">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={v.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}>
                      {v.status === 'COMPLETED' ? 'Concluída' : 'Em andamento'}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800 truncate flex items-center gap-1">
                    <MapPin size={13} className="text-gray-400 shrink-0" />
                    {v.pdv?.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{format(new Date(v.startedAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                    <span>{format(new Date(v.startedAt), 'HH:mm')} – {v.completedAt ? format(new Date(v.completedAt), 'HH:mm') : 'em andamento'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className={`flex items-center gap-1 ${v._count?.photos && v._count.photos >= 10 ? 'text-green-600' : 'text-orange-500'}`}>
                      <Camera size={11} /> {v._count?.photos || 0}/10 fotos
                    </span>
                    {v.noProductsFound && <span className="text-orange-500">Sem produtos</span>}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
