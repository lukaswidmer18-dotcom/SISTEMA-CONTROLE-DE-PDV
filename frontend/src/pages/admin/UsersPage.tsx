import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { User, UserRole } from '../../types';
import { Plus, Pencil, ToggleLeft, ToggleRight, X } from 'lucide-react';

const ROLE_LABEL: Record<UserRole, string> = { ADMIN: 'Admin', PROMOTOR: 'Promotor' };
const ROLE_BADGE: Record<UserRole, string> = { ADMIN: 'badge-blue', PROMOTOR: 'badge-green' };

function UserModal({ user, onClose, onSaved }: { user?: User | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'PROMOTOR',
    hourlyCost: user?.hourlyCost != null ? String(user.hourlyCost) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit && user) {
        const payload: any = { name: form.name, email: form.email, role: form.role, hourlyCost: form.hourlyCost };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${user.id}`, payload);
      } else {
        await api.post('/users', form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input className="input-field" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
            <input type="email" className="input-field" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isEdit ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</label>
            <input type="password" className="input-field" required={!isEdit} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
            <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}>
              <option value="PROMOTOR">Promotor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custo/hora (R$)</label>
            <input type="number" min="0" step="0.01" placeholder="Ex: 25.00" className="input-field" value={form.hourlyCost} onChange={e => setForm(f => ({ ...f, hourlyCost: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Usado pra calcular o custo de mão de obra por visita. Deixe vazio se não souber ainda.</p>
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; user?: User | null }>({ open: false });

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(user: User) {
    await api.patch(`/users/${user.id}/toggle`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Usuários</h2>
        <button onClick={() => setModal({ open: true })} className="btn-primary">
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pluma-800 border-t-transparent" /></div>
      ) : users.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">Nenhum usuário cadastrado.</div>
      ) : (
        <>
          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {users.map(u => (
              <div key={u.id} className="card">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={ROLE_BADGE[u.role]}>
                      {ROLE_LABEL[u.role]}
                    </span>
                    <span className={u.active ? 'badge-green' : 'badge-red'}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => setModal({ open: true, user: u })} className="p-2 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => toggleActive(u)} className={`p-2 rounded ${u.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    {u.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">E-mail</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Perfil</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={ROLE_BADGE[u.role]}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.active ? 'badge-green' : 'badge-red'}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setModal({ open: true, user: u })} className="p-1.5 text-gray-500 hover:text-pluma-600 rounded hover:bg-pluma-50">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => toggleActive(u)} className={`p-1.5 rounded ${u.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                          {u.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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
        <UserModal user={modal.user} onClose={() => setModal({ open: false })} onSaved={load} />
      )}
    </div>
  );
}
