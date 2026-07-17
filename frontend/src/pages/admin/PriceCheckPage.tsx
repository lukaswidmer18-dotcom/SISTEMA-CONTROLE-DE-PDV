import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { PriceCheck, Product, PDV } from '../../types';
import { Tags, RefreshCw, TrendingDown, TrendingUp, Camera, Trash2, AlertTriangle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../../utils/format';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ConfirmDeletePriceCheckModal({ priceCheck, loading, onConfirm, onCancel }: {
  priceCheck: PriceCheck; loading: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Excluir registro de preço</h3>
            <p className="text-sm text-gray-500 mt-1">
              Excluir o registro de <span className="font-semibold text-gray-700">"{priceCheck.product?.name}"</span>? Essa ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary flex-1">Cancelar</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 text-white rounded-lg font-semibold text-sm py-2 hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PriceCheckPage() {
  const [priceChecks, setPriceChecks] = useState<PriceCheck[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pdvs, setPdvs] = useState<PDV[]>([]);
  const [filterProduct, setFilterProduct] = useState('');
  const [filterPdv, setFilterPdv] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PriceCheck | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filterProduct) params.productId = filterProduct;
      if (filterPdv) params.pdvId = filterPdv;
      const [pcRes, productsRes, pdvsRes] = await Promise.all([
        api.get('/admin/price-checks', { params }),
        api.get('/products'),
        api.get('/pdvs'),
      ]);
      setPriceChecks(pcRes.data.data || []);
      setProducts(productsRes.data.data || []);
      setPdvs(pdvsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar pesquisa de preço.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterProduct, filterPdv]);

  async function confirmDelete() {
    if (!deleting) return;
    setError('');
    setDeletingId(deleting.id);
    try {
      await api.delete(`/admin/price-checks/${deleting.id}`);
      setPriceChecks(prev => prev.filter(pc => pc.id !== deleting.id));
      setDeleting(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao excluir registro de preço.');
    } finally {
      setDeletingId(null);
    }
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Pesquisa de Preço', 14, 12);
    doc.setFontSize(9);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · ${priceChecks.length} registro(s)`, 14, 18);

    autoTable(doc, {
      startY: 22,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [23, 65, 59] },
      head: [['Data', 'PDV', 'Produto', 'Nosso preço', 'Concorrente', 'Preço concorrente', 'Diferença', 'Promotor']],
      body: priceChecks.map(pc => {
        const diff = pc.competitorPrice != null ? pc.ownPrice - pc.competitorPrice : null;
        const diffLabel = diff == null ? '-' : diff === 0 ? formatCurrency(0) : `${formatCurrency(Math.abs(diff))} ${diff > 0 ? 'mais caro' : 'mais barato'}`;
        return [
          pc.createdAt ? format(new Date(pc.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-',
          pc.visit?.pdv?.name || '-',
          pc.product?.name || '-',
          formatCurrency(pc.ownPrice),
          pc.competitorName || '-',
          pc.competitorPrice != null ? formatCurrency(pc.competitorPrice) : '-',
          diffLabel,
          pc.visit?.promotor?.name || '-',
        ];
      }),
    });

    doc.save(`pesquisa_preco_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-pluma-50 text-pluma-700 rounded-lg">
              <Tags size={24} />
            </div>
            Pesquisa de Preço
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Histórico de preço próprio vs. concorrência registrado pelos promotores em campo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input-field text-sm py-2.5" value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
            <option value="">Todos os produtos</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="input-field text-sm py-2.5" value={filterPdv} onChange={e => setFilterPdv(e.target.value)}>
            <option value="">Todos os PDVs</option>
            {pdvs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            onClick={exportPdf}
            disabled={loading || priceChecks.length === 0}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <Download size={16} />
            PDF
          </button>
          <button onClick={load} disabled={loading} className="p-2.5 bg-pluma-800 text-white rounded-xl hover:bg-pluma-700 disabled:opacity-40 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold">{error}</div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" /></div>
        ) : priceChecks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Nenhum registro de preço ainda. Assim que promotores começarem a informar preço nas visitas, o histórico aparece aqui.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="py-2 pr-4">Foto</th>
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">PDV</th>
                <th className="py-2 pr-4">Produto</th>
                <th className="py-2 pr-4">Nosso preço</th>
                <th className="py-2 pr-4">Concorrente</th>
                <th className="py-2 pr-4">Preço concorrente</th>
                <th className="py-2 pr-4">Diferença</th>
                <th className="py-2 pr-4">Promotor</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {priceChecks.map(pc => {
                const diff = pc.competitorPrice != null ? pc.ownPrice - pc.competitorPrice : null;
                return (
                  <tr key={pc.id} className="border-b border-gray-50 last:border-b-0">
                    <td className="py-2.5 pr-4">
                      {pc.photoPath ? (
                        <img
                          src={pc.photoPath}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 cursor-pointer"
                          onClick={() => setExpandedPhoto(pc.photoPath!)}
                          alt={pc.product?.name}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                          <Camera size={14} className="text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">{pc.createdAt ? format(new Date(pc.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</td>
                    <td className="py-2.5 pr-4 font-bold text-gray-800">{pc.visit?.pdv?.name}</td>
                    <td className="py-2.5 pr-4 text-gray-700">{pc.product?.name}</td>
                    <td className="py-2.5 pr-4 font-bold text-gray-800">{formatCurrency(pc.ownPrice)}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{pc.competitorName || '-'}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{pc.competitorPrice != null ? formatCurrency(pc.competitorPrice) : '-'}</td>
                    <td className="py-2.5 pr-4">
                      {diff != null ? (
                        <span className={`inline-flex items-center gap-1 font-bold ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {diff > 0 ? <TrendingUp size={13} /> : diff < 0 ? <TrendingDown size={13} /> : null}
                          {formatCurrency(Math.abs(diff))} {diff > 0 ? 'mais caro' : diff < 0 ? 'mais barato' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">{pc.visit?.promotor?.name}</td>
                    <td className="py-2.5 pr-4">
                      <button
                        onClick={() => setDeleting(pc)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {expandedPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md" onClick={() => setExpandedPhoto(null)}>
          <img src={expandedPhoto} alt="Expandida" className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
        </div>
      )}

      {deleting && (
        <ConfirmDeletePriceCheckModal
          priceCheck={deleting}
          loading={deletingId === deleting.id}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
