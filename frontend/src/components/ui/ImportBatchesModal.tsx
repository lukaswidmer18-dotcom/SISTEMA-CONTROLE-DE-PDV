import { useEffect, useState } from 'react';
import { X, Trash2, PackageOpen } from 'lucide-react';
import api from '../../services/api';
import ConfirmBulkDeleteModal from './ConfirmBulkDeleteModal';

export interface ImportBatch {
  batchId: string;
  count: number;
  importedAt: string | null;
}

interface ImportBatchesModalProps {
  title: string;
  listUrl: string;
  deleteUrl: (batchId: string) => string;
  formatCount: (count: number) => string;
  formatResult: (data: any) => string;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export default function ImportBatchesModal({
  title,
  listUrl,
  deleteUrl,
  formatCount,
  formatResult,
  onClose,
  onDeleted,
}: ImportBatchesModalProps) {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmBatch, setConfirmBatch] = useState<ImportBatch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(listUrl);
      setBatches(data.data || []);
    } catch {
      setError('Erro ao carregar as importações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleConfirmDelete() {
    if (!confirmBatch) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const { data } = await api.delete(deleteUrl(confirmBatch.batchId));
      setConfirmBatch(null);
      onDeleted(formatResult(data.data));
      load();
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Erro ao excluir essa importação.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">
            Só aparecem aqui importações feitas em massa via planilha. Cadastros manuais não entram nessa lista.
          </p>

          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-4 border-pluma-800 border-t-transparent" /></div>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <PackageOpen size={28} className="mx-auto mb-2" />
              <p className="text-sm">Nenhuma importação registrada ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {batches.map((b) => (
                <li key={b.batchId} className="flex items-center justify-between py-3 gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {b.importedAt ? new Date(b.importedAt).toLocaleString('pt-BR') : 'Data desconhecida'}
                    </p>
                    <p className="text-xs text-gray-500">{formatCount(b.count)}</p>
                  </div>
                  <button
                    onClick={() => setConfirmBatch(b)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 shrink-0"
                    title="Excluir essa importação"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {confirmBatch && (
        <ConfirmBulkDeleteModal
          title="Excluir essa importação?"
          description={`Isso vai excluir permanentemente ${formatCount(confirmBatch.count)} dessa importação (${confirmBatch.importedAt ? new Date(confirmBatch.importedAt).toLocaleString('pt-BR') : 'data desconhecida'}). Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir essa importação"
          loading={deleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmBatch(null)}
        />
      )}
    </div>
  );
}
