import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { Visit } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, MapPin, Camera, Calendar, User, Package, Star } from 'lucide-react';
import StarRating from '../../components/ui/StarRating';
import PhotoCaption from '../../components/photos/PhotoCaption';
import { Photo } from '../../types';

export default function VisitDetailPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [savingRating, setSavingRating] = useState(false);
  const [ratingError, setRatingError] = useState('');

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

  async function handleRate(score: number) {
    if (!visit) return;
    setSavingRating(true);
    setRatingError('');
    try {
      const { data } = await api.put(`/visits/${visit.id}/rating`, { score });
      setVisit({ ...visit, rating: data.data });
    } catch (err: any) {
      setRatingError(err.response?.data?.error || 'Erro ao salvar avaliação.');
    } finally {
      setSavingRating(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>;
  if (!visit) return <div className="text-center py-12 text-gray-400">Visita não encontrada.</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/visitas" className="p-2 rounded-lg hover:bg-gray-200 text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Detalhes da Visita</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><User size={16} /> Informações Gerais</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Promotor</dt>
              <dd className="font-medium">{visit.promotor?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">PDV</dt>
              <dd className="font-medium">{visit.pdv?.name}</dd>
            </div>
            {visit.pdv?.city && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Cidade</dt>
                <dd>{visit.pdv.city}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd>
                <span className={visit.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}>
                  {visit.status === 'COMPLETED' ? 'Concluída' : 'Em andamento'}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Início</dt>
              <dd>{format(new Date(visit.startedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</dd>
            </div>
            {visit.completedAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Fim</dt>
                <dd>{format(new Date(visit.completedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><MapPin size={16} /> Localização</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500 mb-0.5">Início</dt>
              <dd className="font-mono text-xs">
                {visit.latitudeStart && visit.longitudeStart
                  ? `${visit.latitudeStart.toFixed(5)}, ${visit.longitudeStart.toFixed(5)}`
                  : 'Não disponível'}
              </dd>
            </div>
            {visit.completedAt && (
              <div>
                <dt className="text-gray-500 mb-0.5">Fim</dt>
                <dd className="font-mono text-xs">
                  {visit.latitudeEnd && visit.longitudeEnd
                    ? `${visit.latitudeEnd.toFixed(5)}, ${visit.longitudeEnd.toFixed(5)}`
                    : 'Não disponível'}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Photos */}
      <div className="card mb-4">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Camera size={16} /> Fotos ({visit.photos?.length || 0}/10)
        </h3>
        {visit.photos && visit.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {visit.photos.map((photo) => (
              <div key={photo.id}>
                <button
                  onClick={() => setLightbox(photo)}
                  className="aspect-square w-full rounded-lg overflow-hidden border border-gray-200 hover:border-pluma-400 transition-colors"
                >
                  <img src={photo.filePath} alt={photo.checklistItem?.label || 'Foto'} className="w-full h-full object-cover" />
                </button>
                <PhotoCaption
                  photo={{
                    itemLabel: photo.checklistItem?.label,
                    pdvName: visit.pdv?.name,
                    pdvCity: visit.pdv?.city,
                    pdvState: visit.pdv?.state,
                    promotorName: visit.promotor?.name,
                    uploadedAt: photo.uploadedAt,
                    latitude: photo.latitude,
                    longitude: photo.longitude,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma foto registrada.</p>
        )}
      </div>

      {/* Avaliação de qualidade */}
      <div className="card mb-4">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Star size={16} /> Avaliação da qualidade das fotos
        </h3>
        {visit.status !== 'COMPLETED' ? (
          <p className="text-sm text-gray-400">Só é possível avaliar depois que a visita for concluída.</p>
        ) : (
          <div className="flex items-center gap-3">
            <StarRating value={visit.rating?.score ?? null} onChange={handleRate} size={26} />
            {visit.rating && (
              <span className="text-sm font-bold text-gray-600">{visit.rating.score.toFixed(1)} / 5</span>
            )}
            {savingRating && <span className="text-xs text-gray-400">Salvando...</span>}
          </div>
        )}
        {ratingError && <p className="text-xs text-red-600 mt-2">{ratingError}</p>}
      </div>

      {/* Validities */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Package size={16} /> Datas de Validade
        </h3>
        {visit.noProductsFound ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
            Promotor informou que não encontrou produtos no PDV.
          </div>
        ) : visit.validities && visit.validities.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left py-2 font-medium text-gray-600">Produto</th>
                <th className="text-left py-2 font-medium text-gray-600">Validade</th>
                <th className="text-left py-2 font-medium text-gray-600">Qtd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visit.validities.map(v => (
                <tr key={v.id}>
                  <td className="py-2">{v.product?.name || '-'}</td>
                  <td className="py-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-gray-400" />
                      {v.expiryDate}
                    </span>
                  </td>
                  <td className="py-2">{v.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma validade registrada.</p>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox.filePath} alt={lightbox.checklistItem?.label || 'Foto'} className="max-w-full max-h-[75vh] rounded-lg object-contain" onClick={e => e.stopPropagation()} />
          <div onClick={e => e.stopPropagation()}>
            <PhotoCaption
              variant="lightbox"
              photo={{
                itemLabel: lightbox.checklistItem?.label,
                pdvName: visit.pdv?.name,
                pdvCity: visit.pdv?.city,
                pdvState: visit.pdv?.state,
                promotorName: visit.promotor?.name,
                uploadedAt: lightbox.uploadedAt,
                latitude: lightbox.latitude,
                longitude: lightbox.longitude,
              }}
            />
          </div>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
