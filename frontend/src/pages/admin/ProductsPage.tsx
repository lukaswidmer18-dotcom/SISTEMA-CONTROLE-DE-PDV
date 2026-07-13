import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { PDV, Product } from '../../types';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Store, Trash2, AlertTriangle } from 'lucide-react';

function ConfirmDeleteModal({ product, loading, onConfirm, onCancel }: {
  product: Product; loading: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Excluir produto</h3>
            <p className="text-sm text-gray-500 mt-1">
              Excluir o produto <span className="font-semibold text-gray-700">"{product.name}"</span>? Essa ação não pode ser desfeita.
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

function ProductModal({ product, pdvs, onClose, onSaved }: {
  product?: Product | null; pdvs: PDV[]; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({ name: product?.name || '', brand: product?.brand || '', sku: product?.sku || '' });
  const [pdvIds, setPdvIds] = useState<string[]>(product?.pdvs?.map(p => p.id) || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function togglePdv(id: string) {
    setPdvIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, pdvIds };
      if (isEdit && product) {
        await api.put(`/products/${product.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar produto.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">{isEdit ? 'Editar Produto' : 'Novo Produto'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input className="input-field" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <input className="input-field" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Código</label>
            <input className="input-field" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PDVs onde esse produto é validado</label>
            <p className="text-xs text-gray-400 mb-2">O promotor só vê esse produto na lista de validades dos PDVs marcados aqui.</p>
            {pdvs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum PDV cadastrado.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                {pdvs.map(pdv => (
                  <label key={pdv.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-pluma-800 rounded border-gray-300"
                      checked={pdvIds.includes(pdv.id)}
                      onChange={() => togglePdv(pdv.id)}
                    />
                    <span className="text-gray-700">{pdv.name}{pdv.city ? ` — ${pdv.city}` : ''}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pdvs, setPdvs] = useState<PDV[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; product?: Product | null }>({ open: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [productsRes, pdvsRes] = await Promise.all([api.get('/products'), api.get('/pdvs')]);
      setProducts(productsRes.data.data || []);
      setPdvs((pdvsRes.data.data || []).filter((p: PDV) => p.active));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(product: Product) {
    await api.patch(`/products/${product.id}/toggle`);
    load();
  }

  async function confirmDelete() {
    if (!productToDelete) return;
    setError('');
    setDeletingId(productToDelete.id);
    try {
      await api.delete(`/products/${productToDelete.id}`);
      setProductToDelete(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao excluir produto.');
      setProductToDelete(null);
    } finally {
      setDeletingId(null);
    }
  }

  function pdvBadges(p: Product) {
    if (!p.pdvs || p.pdvs.length === 0) {
      return <span className="text-xs text-gray-400 italic">Nenhum PDV</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {p.pdvs.map(pdv => (
          <span key={pdv.id} className="flex items-center gap-1 text-[11px] font-medium text-pluma-700 bg-pluma-50 border border-pluma-100 rounded-full px-2 py-0.5">
            <Store size={10} /> {pdv.name}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Produtos</h2>
        <button onClick={() => setModal({ open: true })} className="btn-primary">
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 font-semibold mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : products.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">Nenhum produto cadastrado.</div>
      ) : (
        <>
          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {products.map(p => (
              <div key={p.id} className="card">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[p.brand, p.sku].filter(Boolean).join(' · ') || '-'}
                    </p>
                  </div>
                  <span className={p.active ? 'badge-green' : 'badge-red'}>{p.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="mt-2">{pdvBadges(p)}</div>
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => setModal({ open: true, product: p })} className="p-2 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => toggleActive(p)} className={`p-2 rounded ${p.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    {p.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button onClick={() => setProductToDelete(p)} disabled={deletingId === p.id} className="p-2 text-gray-500 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-40">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tabela — desktop */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Marca</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">PDVs</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.brand || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.sku || '-'}</td>
                    <td className="px-4 py-3 max-w-xs">{pdvBadges(p)}</td>
                    <td className="px-4 py-3">
                      <span className={p.active ? 'badge-green' : 'badge-red'}>{p.active ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setModal({ open: true, product: p })} className="p-1.5 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => toggleActive(p)} className={`p-1.5 rounded ${p.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                          {p.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button onClick={() => setProductToDelete(p)} disabled={deletingId === p.id} className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-40">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal.open && (
        <ProductModal product={modal.product} pdvs={pdvs} onClose={() => setModal({ open: false })} onSaved={load} />
      )}

      {productToDelete && (
        <ConfirmDeleteModal
          product={productToDelete}
          loading={deletingId === productToDelete.id}
          onConfirm={confirmDelete}
          onCancel={() => setProductToDelete(null)}
        />
      )}
    </div>
  );
}
