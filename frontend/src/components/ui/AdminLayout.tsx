import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, MapPin, Package, Clock, ClipboardList, Menu, X, LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users },
  { to: '/admin/pdvs', label: 'PDVs', icon: MapPin },
  { to: '/admin/produtos', label: 'Produtos', icon: Package },
  { to: '/admin/pontos', label: 'Pontos', icon: Clock },
  { to: '/admin/visitas', label: 'Visitas', icon: ClipboardList },
];

function GrupoPlumaSidebarLogo() {
  return (
    <div className="leading-none select-none">
      <p className="text-gold-500 text-[10px] font-semibold tracking-[0.25em] uppercase">Grupo</p>
      <p className="text-white text-2xl font-black tracking-tight leading-none">PLUMA</p>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-pluma-800 text-white flex flex-col transform transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Logo header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-pluma-700">
          <GrupoPlumaSidebarLogo />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-pluma-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* System label */}
        <div className="px-5 py-2.5 border-b border-pluma-700/50">
          <p className="text-pluma-200 text-[11px] font-medium tracking-wide uppercase">Sistema de Controle de PDV</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gold-500/20 text-gold-400 border-l-2 border-gold-500 pl-[10px]'
                    : 'text-pluma-200 hover:bg-pluma-700 hover:text-white border-l-2 border-transparent pl-[10px]'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User / logout */}
        <div className="p-4 border-t border-pluma-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gold-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-gold-400 text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-pluma-300 text-[10px] truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-pluma-300 hover:text-white text-xs w-full px-2 py-1.5 rounded-lg hover:bg-pluma-700 transition-colors">
            <LogOut size={14} />
            Sair do sistema
          </button>
        </div>

        {/* Brand signature */}
        <div className="px-5 pb-4 text-center border-t border-pluma-700/50 pt-3">
          <p className="text-gold-600 text-[10px] leading-relaxed">© 2026 Grupo Pluma</p>
          <p className="text-pluma-500 text-[10px]">Desenvolvido por Lukas Widmer</p>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="bg-pluma-800 text-white px-4 py-3 flex items-center gap-3 lg:hidden sticky top-0 z-30 shadow-md">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-pluma-700 transition-colors">
            <Menu size={20} />
          </button>
          <div className="leading-none">
            <p className="text-gold-400 text-[9px] font-semibold tracking-widest uppercase">Grupo</p>
            <p className="text-white text-base font-black tracking-tight leading-none">PLUMA</p>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
