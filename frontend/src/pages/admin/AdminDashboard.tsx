import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Users, MapPin, Package, ClipboardList, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, pdvs: 0, products: 0, visits: 0, todayVisits: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, pdvsRes, productsRes, visitsRes] = await Promise.all([
          api.get('/users'),
          api.get('/pdvs'),
          api.get('/products'),
          api.get('/visits/all'),
        ]);
        const today = new Date().toISOString().split('T')[0];
        const todayVisits = (visitsRes.data.data || []).filter((v: any) =>
          v.startedAt?.startsWith(today)
        ).length;
        setStats({
          users: usersRes.data.data?.length || 0,
          pdvs: pdvsRes.data.data?.length || 0,
          products: productsRes.data.data?.length || 0,
          visits: visitsRes.data.data?.length || 0,
          todayVisits,
        });
      } catch {}
    }
    load();
  }, []);

  const cards = [
    { label: 'Usuários', value: stats.users, icon: Users, color: 'bg-blue-500', to: '/admin/usuarios' },
    { label: 'PDVs', value: stats.pdvs, icon: MapPin, color: 'bg-green-500', to: '/admin/pdvs' },
    { label: 'Produtos', value: stats.products, icon: Package, color: 'bg-purple-500', to: '/admin/produtos' },
    { label: 'Visitas Hoje', value: stats.todayVisits, icon: TrendingUp, color: 'bg-orange-500', to: '/admin/visitas' },
    { label: 'Total Visitas', value: stats.visits, icon: ClipboardList, color: 'bg-gray-500', to: '/admin/visitas' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="card hover:shadow-md transition-shadow group">
            <div className={`inline-flex p-2.5 rounded-lg ${color} text-white mb-3`}>
              <Icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Acesso Rápido</h3>
          <div className="space-y-2">
            <Link to="/admin/usuarios" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 py-1">
              <Users size={16} /> Gerenciar Usuários
            </Link>
            <Link to="/admin/pdvs" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 py-1">
              <MapPin size={16} /> Gerenciar PDVs
            </Link>
            <Link to="/admin/produtos" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 py-1">
              <Package size={16} /> Gerenciar Produtos
            </Link>
            <Link to="/admin/visitas" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 py-1">
              <ClipboardList size={16} /> Ver Visitas
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-1">Sistema PDV v1.0</h3>
          <p className="text-sm text-gray-500">Controle de promotores em pontos de venda.</p>
          <div className="mt-3 space-y-1 text-xs text-gray-400">
            <div>• Controle de ponto com sequência obrigatória</div>
            <div>• Registro de visitas com 10 fotos</div>
            <div>• Controle de datas de validade</div>
            <div>• Painel administrativo completo</div>
          </div>
        </div>
      </div>
    </div>
  );
}
