import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Clock, MapPin, ClipboardList, LogOut, CheckCircle } from 'lucide-react';
import { OfflineSyncProvider } from '../../contexts/OfflineSyncContext';

const navItems = [
  { to: '/promotor', label: 'Início', icon: Home, end: true },
  { to: '/promotor/ponto', label: 'Jornada', icon: Clock },
  { to: '/promotor/historico', label: 'Histórico', icon: ClipboardList },
];

function GrupoPlumaLogo() {
  return (
    <div className="leading-none select-none">
      <p className="text-gold-500 text-[9px] lg:text-[10px] font-semibold tracking-[0.22em] lg:tracking-[0.25em] uppercase">Grupo</p>
      <p className="text-white text-lg lg:text-2xl font-black leading-none">PLUMA</p>
    </div>
  );
}
export default function PromotorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  React.useEffect(() => {
    if (syncMessage) {
      const timer = setTimeout(() => setSyncMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [syncMessage]);

  return (
    <OfflineSyncProvider onSyncSuccess={(synced) => setSyncMessage(`${synced} ação(ões) offline sincronizada(s) com sucesso!`)}>
      <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
        
        {/* Global Sync Notification */}
        {syncMessage && (
          <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
            <div className="bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-green-500">
              <CheckCircle size={24} />
              <div>
                <p className="font-black text-sm uppercase tracking-wider">Sincronização Concluída</p>
                <p className="text-xs opacity-90">{syncMessage}</p>
              </div>
            </div>
          </div>
        )}
      
      {/* Sidebar — Desktop Only */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-gradient-to-br from-pluma-950 via-pluma-800 to-pluma-900 text-white sticky top-0 h-screen overflow-y-auto shadow-sidebar">
        <div className="flex items-center px-5 py-5 border-b border-white/10 bg-white/[0.03]">
          <GrupoPlumaLogo />
        </div>

        <div className="px-5 py-2.5 border-b border-white/10">
          <p className="text-pluma-200 text-[11px] font-medium tracking-wide uppercase font-source">Portal do Promotor</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gold-500/[0.15] text-gold-300 border-l-2 border-gold-400 pl-[10px] shadow-glow-gold'
                    : 'text-pluma-200 hover:bg-white/[0.08] hover:text-white border-l-2 border-transparent pl-[10px]'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 bg-pluma-950/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold-500/25 ring-2 ring-gold-400/[0.55] flex items-center justify-center">
              <span className="text-gold-400 text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-pluma-300 text-[10px] truncate">Promotor</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-pluma-300 hover:text-white text-xs w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <LogOut size={14} />
            Sair do sistema
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-gradient-to-br from-pluma-950 via-pluma-800 to-pluma-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-glow-pluma border-b border-white/10">
          <div className="flex items-center gap-3">
            <GrupoPlumaLogo />
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

        {/* Content Container */}
        <main className="flex-1 overflow-auto bg-gray-50 lg:p-8">
          <div className="max-w-5xl mx-auto w-full">
            <Outlet />
          </div>
          <div className="text-center py-6 mt-auto">
            <p className="text-gray-400 text-[10px]">© 2026 Grupo Pluma • Desenvolvido por Lukas Widmer</p>
          </div>
        </main>

        {/* Bottom Nav — Mobile Only */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/[0.86] backdrop-blur-xl border-t border-white/70 flex z-30 shadow-glass">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-bold transition-colors relative ${
                  isActive ? 'text-pluma-800' : 'text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300 rounded-b-full shadow-glow-gold" />}
                  <Icon size={20} className={isActive ? 'drop-shadow-sm text-pluma-700' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
    </OfflineSyncProvider>
  );
}
