import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { Visit, Photo } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Camera, Calendar } from 'lucide-react';
import PhotoCaption from '../../components/photos/PhotoCaption';

export default function VisitDetailPromotorPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/visits/${visitId}`);
        setVisit(data.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [visitId]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" />
    </div>
  );
  if (!visit) return <div className="p-4 text-center text-gray-400">Visita não encontrada.</div>;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/promotor/historico" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-xl font-bold text-gray-800">Detalhes da Visita</h2>
      </div>

      <div className="card mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">PDV</span>
            <span className="font-medium">{visit.pdv?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Data</span>
            <span>{format(new Date(visit.startedAt), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Início</span>
            <span>{format(new Date(visit.startedAt), 'HH:mm')}</span>
          </div>
          {visit.completedAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Fim</span>
              <span>{format(new Date(visit.completedAt), 'HH:mm')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className={visit.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}>
              {visit.status === 'COMPLETED' ? 'Concluída' : 'Em andamento'}
            </span>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Camera size={16} /> Fotos ({visit.photos?.length || 0})
        </h3>
        {visit.photos && visit.photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5">
            {visit.photos.map(photo => (
              <div key={photo.id}>
                <button
                  onClick={() => setLightbox(photo)}
                  className="aspect-square w-full rounded-lg overflow-hidden border border-gray-200"
                >
                  <img src={photo.filePath} alt={photo.checklistItem?.label || 'Foto'} className="w-full h-full object-cover" />
                </button>
                <PhotoCaption
                  photo={{
                    itemLabel: photo.checklistItem?.label,
                    pdvName: visit.pdv?.name,
                    pdvCity: visit.pdv?.city,
                    pdvState: visit.pdv?.state,
                    uploadedAt: photo.uploadedAt,
                    latitude: photo.latitude,
                    longitude: photo.longitude,
                  }}
                />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">Nenhuma foto.</p>}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar size={16} /> Datas de Validade
        </h3>
        {visit.noProductsFound ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
            Nenhum produto encontrado no PDV.
          </div>
        ) : visit.validities && visit.validities.length > 0 ? (
          <div className="space-y-2">
            {visit.validities.map(v => (
              <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 text-sm">
                <span className="font-medium text-gray-800">{v.product?.name}</span>
                <span className="text-gray-500">{v.expiryDate} • {v.quantity} un.</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">Nenhuma validade registrada.</p>}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <div className="flex flex-col gap-2 w-fit max-w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.filePath} alt={lightbox.checklistItem?.label || 'Foto'} className="max-w-full max-h-[75vh] rounded-lg object-contain" />
            <PhotoCaption
              variant="lightbox"
              photo={{
                itemLabel: lightbox.checklistItem?.label,
                pdvName: visit.pdv?.name,
                pdvCity: visit.pdv?.city,
                pdvState: visit.pdv?.state,
                uploadedAt: lightbox.uploadedAt,
                latitude: lightbox.latitude,
                longitude: lightbox.longitude,
              }}
            />
          </div>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2">✕</button>
        </div>
      )}
    </div>
  );
}
