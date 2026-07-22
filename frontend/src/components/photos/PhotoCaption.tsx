import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface PhotoCaptionInfo {
  itemLabel?: string | null;
  pdvName?: string | null;
  pdvCity?: string | null;
  pdvState?: string | null;
  promotorName?: string | null;
  uploadedAt: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface PhotoCaptionProps {
  photo: PhotoCaptionInfo;
  variant?: 'card' | 'lightbox';
}

export default function PhotoCaption({ photo, variant = 'card' }: PhotoCaptionProps) {
  const location = [photo.pdvName, [photo.pdvCity, photo.pdvState].filter(Boolean).join('/')]
    .filter(Boolean)
    .join(' · ');
  const dateLabel = format(
    new Date(photo.uploadedAt),
    variant === 'lightbox' ? "dd/MM/yyyy HH:mm" : 'dd/MM HH:mm',
    { locale: ptBR }
  );

  if (variant === 'lightbox') {
    return (
      <div className="w-full text-white text-sm sm:text-base space-y-1 bg-black/70 rounded-lg px-4 py-3">
        {photo.itemLabel && <p className="font-bold">{photo.itemLabel}</p>}
        {location && <p>{location}</p>}
        <p>
          {dateLabel}
          {photo.promotorName ? ` · ${photo.promotorName}` : ''}
        </p>
        {photo.latitude != null && photo.longitude != null && (
          <p className="font-mono text-xs text-gray-300">
            GPS: {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="px-0.5 pt-1 text-[10px] leading-tight text-gray-600 space-y-0.5">
      {photo.itemLabel && <p className="font-bold text-gray-800 truncate">{photo.itemLabel}</p>}
      {location && <p className="truncate">{location}</p>}
      <p className="text-gray-400">{dateLabel}</p>
    </div>
  );
}
