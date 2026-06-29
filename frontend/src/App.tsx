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
import PontosPage from './pages/admin/PontosPage';
import VisitsAdminPage from './pages/admin/VisitsAdminPage';
import VisitDetailPage from './pages/admin/VisitDetailPage';
import MapPage from './pages/admin/MapPage';

import PromotorHome from './pages/promotor/PromotorHome';
import PontoPage from './pages/promotor/PontoPage';
import VisitPage from './pages/promotor/VisitPage';
import VisitHistoryPage from './pages/promotor/VisitHistoryPage';
import VisitDetailPromotorPage from './pages/promotor/VisitDetailPromotorPage';

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
          <Route path="pontos" element={<PontosPage />} />
          <Route path="visitas" element={<VisitsAdminPage />} />
          <Route path="visitas/:visitId" element={<VisitDetailPage />} />
          <Route path="mapa" element={<MapPage />} />
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
        <Route path="visita" element={<VisitPage />} />
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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
