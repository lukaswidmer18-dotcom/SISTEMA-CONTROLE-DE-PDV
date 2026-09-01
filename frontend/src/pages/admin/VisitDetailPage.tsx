import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { Visit, ChecklistItem, FormFieldConfig } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Camera, Calendar, User, Package, Star, ListChecks } from 'lucide-react';
import StarRating from '../../components/ui/StarRating';
import PhotoCaption from '../../components/photos/PhotoCaption';
import { getRequiredPhotoTotal } from '../../utils/checklist';
import { extraFieldsLabelMap, formatExtraFields } from '../../utils/formFields';

export default function VisitDetailPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [savingRating, setSavingRating] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [requiredPhotoTotal, setRequiredPhotoTotal] = useState(0);
  const [validadeLabels, setValidadeLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const [visitRes, checklistRes, formFieldsRes] = await Promise.all([
          api.get(`/visits/${visitId}`),
          api.get('/checklist'),
          api.get('/form-fields', { params: { formType: 'VALIDADE' } }),
        ]);
        setVisit(visitRes.data.data);
        setRequiredPhotoTotal(getRequiredPhotoTotal((checklistRes.data.data || []) as ChecklistItem[]));
        setValidadeLabels(extraFieldsLabelMap((formFieldsRes.data.data || []) as FormFieldConfig[]));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [visitId]);

  useEffect(() => {
    if (lightboxIndex === null || !visit?.photos) return;
    const total = visit.photos.length;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowLeft') setLightboxIndex(i => (i === null ? null : (i - 1 + total) % total));
      else if (e.key === 'ArrowRight') setLightboxIndex(i => (i === null ? null : (i + 1) % total));
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, visit?.photos]);

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
          <Camera size={16} /> Fotos ({visit.photos?.length || 0}/{requiredPhotoTotal})
        </h3>
        {visit.photos && visit.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {visit.photos.map((photo, index) => (
              <div key={photo.id}>
                <button
                  onClick={() => setLightboxIndex(index)}
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

      {/* Checklist responses (Texto/Sim-Não/Múltipla escolha) */}
      {visit.checklistResponses && visit.checklistResponses.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ListChecks size={16} /> Respostas do Checklist
          </h3>
          <dl className="space-y-2 text-sm">
            {visit.checklistResponses.map(r => (
              <div key={r.id} className="flex justify-between gap-4">
                <dt className="text-gray-500">{r.checklistItem?.label || 'Item removido'}</dt>
                <dd className="font-medium text-right">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

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
              {visit.validities.map(v => {
                const extras = formatExtraFields(v.extraFields, validadeLabels);
                return (
                  <tr key={v.id}>
                    <td className="py-2">{v.product?.name || '-'}</td>
                    <td className="py-2">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-gray-400" />
                        {v.expiryDate}
                      </span>
                    </td>
                    <td className="py-2">
                      {v.quantity}
                      {extras.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {extras.map(e => (
                            <span key={e.key} className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-1.5 py-0.5">
                              {e.label}: {e.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma validade registrada.</p>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && visit.photos && visit.photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4" onClick={() => setLightboxIndex(null)}>
          <div className="flex flex-col gap-2 w-fit max-w-full" onClick={e => e.stopPropagation()}>
            <img
              src={visit.photos[lightboxIndex].filePath}
              alt={visit.photos[lightboxIndex].checklistItem?.label || 'Foto'}
              className="max-w-full max-h-[75vh] rounded-lg object-contain"
            />
            <PhotoCaption
              variant="lightbox"
              photo={{
                itemLabel: visit.photos[lightboxIndex].checklistItem?.label,
                pdvName: visit.pdv?.name,
                pdvCity: visit.pdv?.city,
                pdvState: visit.pdv?.state,
                promotorName: visit.promotor?.name,
                uploadedAt: visit.photos[lightboxIndex].uploadedAt,
                latitude: visit.photos[lightboxIndex].latitude,
                longitude: visit.photos[lightboxIndex].longitude,
              }}
            />
          </div>
          {visit.photos.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + visit.photos!.length) % visit.photos!.length); }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/80"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % visit.photos!.length); }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/80"
                aria-label="Próxima foto"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
