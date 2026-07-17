import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import AdminLayout from './components/ui/AdminLayout';
import PromotorLayout from './components/ui/PromotorLayout';

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const PDVsPage = lazy(() => import('./pages/admin/PDVsPage'));
const RoutesPage = lazy(() => import('./pages/admin/RoutesPage'));
const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'));
const ChecklistPage = lazy(() => import('./pages/admin/ChecklistPage'));
const PontosPage = lazy(() => import('./pages/admin/PontosPage'));
const VisitsAdminPage = lazy(() => import('./pages/admin/VisitsAdminPage'));
const VisitDetailPage = lazy(() => import('./pages/admin/VisitDetailPage'));
const MapPage = lazy(() => import('./pages/admin/MapPage'));
const CoveragePage = lazy(() => import('./pages/admin/CoveragePage'));
const RankingPage = lazy(() => import('./pages/admin/RankingPage'));
const RupturaPage = lazy(() => import('./pages/admin/RupturaPage'));
const PriceCheckPage = lazy(() => import('./pages/admin/PriceCheckPage'));
const DegustacoesAdminPage = lazy(() => import('./pages/admin/DegustacoesAdminPage'));
const CustoPage = lazy(() => import('./pages/admin/CustoPage'));

const PromotorHome = lazy(() => import('./pages/promotor/PromotorHome'));
const PontoPage = lazy(() => import('./pages/promotor/PontoPage'));
const VisitHistoryPage = lazy(() => import('./pages/promotor/VisitHistoryPage'));
const VisitDetailPromotorPage = lazy(() => import('./pages/promotor/VisitDetailPromotorPage'));

const PublicDegustacaoRequestPage = lazy(() => import('./pages/public/PublicDegustacaoRequestPage'));
const PublicMyDegustacoesPage = lazy(() => import('./pages/public/PublicMyDegustacoesPage'));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-pluma-800 border-t-transparent" />
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageFallback />;
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
          <Route index element={<Navigate to="rotas" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
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
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/solicitar-degustacao" element={<PublicDegustacaoRequestPage />} />
            <Route path="/solicitar-degustacao/minhas" element={<PublicMyDegustacoesPage />} />
            <Route path="/*" element={<AppRoutes />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
