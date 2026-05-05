import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Product } from '../../types';
import { Plus, Pencil, ToggleLeft, ToggleRight, X } from 'lucide-react';

function ProductModal({ product, onClose, onSaved }: { product?: Product | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({ name: product?.name || '', brand: product?.brand || '', sku: product?.sku || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit && product) {
        await api.put(`/products/${product.id}`, form);
      } else {
        await api.post('/products', form);
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
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
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; product?: Product | null }>({ open: false });

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/products');
      setProducts(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(product: Product) {
    await api.patch(`/products/${product.id}/toggle`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Produtos</h2>
        <button onClick={() => setModal({ open: true })} className="btn-primary">
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Marca</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.brand || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.sku || '-'}</td>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <div className="text-center py-8 text-gray-400">Nenhum produto cadastrado.</div>}
        </div>
      )}

      {modal.open && (
        <ProductModal product={modal.product} onClose={() => setModal({ open: false })} onSaved={load} />
      )}
    </div>
  );
}
