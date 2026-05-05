import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Clock, MapPin, ClipboardList, LogOut } from 'lucide-react';

const navItems = [
  { to: '/promotor', label: 'Início', icon: Home, end: true },
  { to: '/promotor/ponto', label: 'Ponto', icon: Clock },
  { to: '/promotor/visita', label: 'Visita', icon: MapPin },
  { to: '/promotor/historico', label: 'Histórico', icon: ClipboardList },
];

export default function PromotorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 max-w-lg mx-auto relative">
      {/* Top header */}
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow">
        <div>
          <h1 className="font-bold text-base">Sistema PDV</h1>
          <p className="text-blue-200 text-xs">{user?.name}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm py-1.5 px-2 rounded-lg hover:bg-blue-700 transition-colors">
          <LogOut size={16} />
          Sair
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 pb-24">
        <Outlet />
        <div className="text-center py-3">
          <p className="text-gray-400 text-[10px]">© 2026 Grupo Pluma • Desenvolvido por Lukas Widmer</p>
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 flex z-30 shadow-lg">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
