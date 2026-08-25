import { AlertTriangle } from 'lucide-react';

interface ConfirmBulkDeleteModalProps {
  title: string;
  description: string;
  confirmLabel?: string;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmBulkDeleteModal({
  title,
  description,
  confirmLabel = 'Excluir todos',
  loading,
  error,
  onConfirm,
  onClose,
}: ConfirmBulkDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{error}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary flex-1">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="btn-primary flex-1 bg-red-600 border-red-600 hover:bg-red-700">
            {loading ? 'Excluindo...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
