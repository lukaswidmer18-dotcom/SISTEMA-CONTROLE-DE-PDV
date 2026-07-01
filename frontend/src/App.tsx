import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import AdminLayout from './components/ui/AdminLayout';
import PromotorLayout from './components/ui/PromotorLayout';

import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import PDVsPage from './pages/admin/PDVsPage';
import RoutesPage from './pages/admin/RoutesPage';
import ProductsPage from './pages/admin/ProductsPage';
import ChecklistPage from './pages/admin/ChecklistPage';
import PontosPage from './pages/admin/PontosPage';
import VisitsAdminPage from './pages/admin/VisitsAdminPage';
import VisitDetailPage from './pages/admin/VisitDetailPage';
import MapPage from './pages/admin/MapPage';
import CoveragePage from './pages/admin/CoveragePage';
import RankingPage from './pages/admin/RankingPage';
import RupturaPage from './pages/admin/RupturaPage';
import PriceCheckPage from './pages/admin/PriceCheckPage';
import DegustacoesAdminPage from './pages/admin/DegustacoesAdminPage';
import CustoPage from './pages/admin/CustoPage';

import PromotorHome from './pages/promotor/PromotorHome';
import PontoPage from './pages/promotor/PontoPage';
import VisitHistoryPage from './pages/promotor/VisitHistoryPage';
import VisitDetailPromotorPage from './pages/promotor/VisitDetailPromotorPage';

import PublicDegustacaoRequestPage from './pages/public/PublicDegustacaoRequestPage';
import PublicMyDegustacoesPage from './pages/public/PublicMyDegustacoesPage';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.role === 'ADMIN') {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="pdvs" element={<PDVsPage />} />
          <Route path="rotas" element={<RoutesPage />} />
          <Route path="produtos" element={<ProductsPage />} />
          <Route path="checklist" element={<ChecklistPage />} />
          <Route path="pontos" element={<PontosPage />} />
          <Route path="visitas" element={<VisitsAdminPage />} />
          <Route path="visitas/:visitId" element={<VisitDetailPage />} />
          <Route path="mapa" element={<MapPage />} />
          <Route path="cobertura" element={<CoveragePage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="ruptura" element={<RupturaPage />} />
          <Route path="precos" element={<PriceCheckPage />} />
          <Route path="degustacoes" element={<DegustacoesAdminPage />} />
          <Route path="custos" element={<CustoPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/promotor" element={<PromotorLayout />}>
        <Route index element={<PromotorHome />} />
        <Route path="ponto" element={<PontoPage />} />
        <Route path="historico" element={<VisitHistoryPage />} />
        <Route path="historico/:visitId" element={<VisitDetailPromotorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/promotor" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/solicitar-degustacao" element={<PublicDegustacaoRequestPage />} />
          <Route path="/solicitar-degustacao/minhas" element={<PublicMyDegustacoesPage />} />
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
