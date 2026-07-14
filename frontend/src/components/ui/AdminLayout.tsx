import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, MapPin, Package, Clock, ClipboardList, LogOut, Map, Route as RouteIcon, ListChecks, CheckCircle2, Trophy, PackageX, Tags, UtensilsCrossed, DollarSign,
  Activity, Compass, BarChart3, Database, ChevronDown, type LucideIcon,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const dashboardItem: NavItem = { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true };

type NavEntry =
  | { type: 'group'; group: NavGroup }
  | { type: 'link'; item: NavItem };

const navEntries: NavEntry[] = [
  {
    type: 'group',
    group: {
      key: 'operacao',
      label: 'Operação de Campo',
      icon: Compass,
      items: [
        { to: '/admin/rotas', label: 'Criar Rota', icon: RouteIcon },
        { to: '/admin/visitas', label: 'Visitas', icon: ClipboardList },
        { to: '/admin/pontos', label: 'Registro de ponto', icon: Clock },
        { to: '/admin/checklist', label: 'Checklist', icon: ListChecks },
      ],
    },
  },
  {
    type: 'group',
    group: {
      key: 'indicadores',
      label: 'Indicadores Comerciais',
      icon: BarChart3,
      items: [
        { to: '/admin/ruptura', label: 'Ruptura', icon: PackageX },
        { to: '/admin/precos', label: 'Preços', icon: Tags },
        { to: '/admin/degustacoes', label: 'Degustações', icon: UtensilsCrossed },
        { to: '/admin/custos', label: 'Custo/Atendimento', icon: DollarSign },
      ],
    },
  },
  {
    type: 'group',
    group: {
      key: 'monitoramento',
      label: 'Monitoramento',
      icon: Activity,
      items: [
        { to: '/admin/mapa', label: 'Rastreamento', icon: Map },
        { to: '/admin/cobertura', label: 'Cobertura', icon: CheckCircle2 },
        { to: '/admin/ranking', label: 'Ranking', icon: Trophy },
      ],
    },
  },
  { type: 'link', item: dashboardItem },
  {
    type: 'group',
    group: {
      key: 'cadastros',
      label: 'Cadastros',
      icon: Database,
      items: [
        { to: '/admin/usuarios', label: 'Usuários', icon: Users },
        { to: '/admin/pdvs', label: 'PDVs', icon: MapPin },
        { to: '/admin/produtos', label: 'Produtos', icon: Package },
      ],
    },
  },
];

const navGroups: NavGroup[] = navEntries.filter((e): e is Extract<NavEntry, { type: 'group' }> => e.type === 'group').map(e => e.group);

const allNavItems: NavItem[] = navEntries.flatMap(e => (e.type === 'link' ? [e.item] : e.group.items));

function findActiveGroupKey(pathname: string): string | null {
  return navGroups.find(g => g.items.some(item => pathname.startsWith(item.to)))?.key ?? null;
}

function GrupoPlumaSidebarLogo() {
  return (
    <div className="leading-none select-none">
      <p className="text-gold-500 text-[10px] font-semibold tracking-[0.25em] uppercase">Grupo</p>
      <p className="text-white text-2xl font-black leading-none">PLUMA</p>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(() => findActiveGroupKey(location.pathname));

  useEffect(() => {
    const activeGroup = findActiveGroupKey(location.pathname);
    if (activeGroup) setOpenGroup(activeGroup);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-gradient-to-br from-pluma-950 via-pluma-800 to-pluma-900 text-white sticky top-0 h-screen overflow-y-auto shadow-sidebar">

        {/* Logo header */}
        <div className="flex items-center px-5 py-5 border-b border-white/10 bg-white/[0.03]">
          <GrupoPlumaSidebarLogo />
        </div>

        {/* System label */}
        <div className="px-5 py-2.5 border-b border-white/10">
          <p className="text-pluma-200 text-[11px] font-medium tracking-wide uppercase">Sistema de Controle de PDV</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navEntries.map(entry => {
            if (entry.type === 'link') {
              const { to, label, icon: Icon, end } = entry.item;
              return (
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
                  <Icon size={17} />
                  {label}
                </NavLink>
              );
            }

            const group = entry.group;
            const isOpen = openGroup === group.key;
            const GroupIcon = group.icon;
            return (
              <div key={group.key} className="pt-1">
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : group.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors ${
                    isOpen ? 'text-gold-300' : 'text-pluma-300 hover:text-white'
                  }`}
                >
                  <GroupIcon size={15} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {group.items.map(({ to, label, icon: Icon, end }) => (
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
                        <Icon size={17} />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User / logout */}
        <div className="p-4 border-t border-white/10 bg-pluma-950/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold-500/25 ring-2 ring-gold-400/[0.55] shadow-glow-gold flex items-center justify-center flex-shrink-0">
              <span className="text-gold-400 text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-pluma-300 text-[10px] truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-pluma-300 hover:text-white text-xs w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <LogOut size={14} />
            Sair do sistema
          </button>
        </div>

        {/* Brand signature */}
        <div className="px-5 pb-4 text-center border-t border-white/10 pt-3">
          <p className="text-gold-600 text-[10px] leading-relaxed">© 2026 Grupo Pluma</p>
          <p className="text-pluma-500 text-[10px]">Desenvolvido por Lukas Widmer</p>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top header — mesmo padrão do promotor */}
        <header className="lg:hidden bg-gradient-to-br from-pluma-950 via-pluma-800 to-pluma-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-glow-pluma border-b border-white/10">
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

        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-24 lg:pb-6">
          <Outlet />
          <div className="text-center py-3 lg:hidden">
            <p className="text-gray-400 text-[10px]">© 2026 Grupo Pluma • Desenvolvido por Lukas Widmer</p>
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only, mesmo padrão do promotor */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/[0.86] backdrop-blur-xl border-t border-white/70 flex z-30 shadow-glass">
        {allNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 font-semibold transition-colors relative ${
                isActive ? 'text-pluma-800' : 'text-gray-400 hover:text-pluma-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300 rounded-b-full shadow-glow-gold" />}
                <Icon size={17} className={isActive ? 'drop-shadow-sm' : ''} />
                <span className="text-[9px] leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
