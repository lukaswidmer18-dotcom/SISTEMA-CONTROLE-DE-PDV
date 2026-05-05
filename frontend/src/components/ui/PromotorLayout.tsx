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
      <header className="bg-gradient-to-br from-pluma-950 via-pluma-800 to-pluma-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-glow-pluma border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="leading-none select-none">
            <p className="text-gold-400 text-[9px] font-semibold tracking-[0.22em] uppercase">Grupo</p>
            <p className="text-white text-lg font-black leading-none">PLUMA</p>
          </div>
          <div className="h-7 w-px bg-pluma-600" />
          <div>
            <p className="text-pluma-200 text-[10px] leading-none">Olá,</p>
            <p className="text-white text-xs font-semibold leading-none mt-0.5 truncate max-w-[120px]">{user?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-pluma-300 hover:text-white text-xs py-1.5 px-2.5 rounded-lg hover:bg-white/10 transition-colors">
          <LogOut size={14} />
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
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white/[0.86] backdrop-blur-xl border-t border-white/70 flex z-30 shadow-glass">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-semibold transition-colors relative ${
                isActive ? 'text-pluma-800' : 'text-gray-400 hover:text-pluma-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300 rounded-b-full shadow-glow-gold" />}
                <Icon size={20} className={isActive ? 'drop-shadow-sm' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
