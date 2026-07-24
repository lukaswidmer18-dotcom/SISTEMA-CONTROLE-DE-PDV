import { X, CheckCircle2 } from 'lucide-react';

export interface ImportMessage {
  row: number;
  type: 'error' | 'warning';
  text: string;
}

export interface ImportResult {
  totalRows: number;
  created: number;
  updated: number;
  messages: ImportMessage[];
  note?: string;
}

export default function ImportResultModal({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  const errors = result.messages.filter(m => m.type === 'error');
  const warnings = result.messages.filter(m => m.type === 'warning');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" /> Importação concluída
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-lg font-bold text-gray-800">{result.totalRows}</p>
              <p className="text-xs text-gray-500">Linhas lidas</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-lg font-bold text-green-700">{result.created}</p>
              <p className="text-xs text-green-600">Criados</p>
            </div>
            <div className="bg-pluma-50 rounded-lg p-3">
              <p className="text-lg font-bold text-pluma-700">{result.updated}</p>
              <p className="text-xs text-pluma-600">Atualizados</p>
            </div>
          </div>

          {result.note && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">{result.note}</p>
          )}

          {errors.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">Linhas não importadas ({errors.length})</p>
              <ul className="text-xs text-red-600 bg-red-50 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                {errors.map((m, i) => <li key={i}>Linha {m.row}: {m.text}</li>)}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-amber-700 mb-1">Avisos ({warnings.length})</p>
              <ul className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                {warnings.map((m, i) => <li key={i}>Linha {m.row}: {m.text}</li>)}
              </ul>
            </div>
          )}

          <button onClick={onClose} className="btn-primary w-full">Fechar</button>
        </div>
      </div>
    </div>
  );
}
