import { Router } from 'express';
import { login, me } from '../controllers/authController';
import { listUsers, createUser, updateUser, toggleUserActive, deleteUser } from '../controllers/userController';
import { listPDVs, createPDV, updatePDV, togglePDVActive, deletePDV, getPdvGpsSuggestion } from '../controllers/pdvController';
import { listProducts, createProduct, updateProduct, toggleProductActive, deleteProduct } from '../controllers/productController';
import { listRoutes, createRouteEntry, deleteRouteEntry, justifyRouteEntry, reorderRouteEntries } from '../controllers/routeController';
import {
  listChecklistItems, createChecklistItem, updateChecklistItem, toggleChecklistItemActive, deleteChecklistItem, reorderChecklistItems,
} from '../controllers/checklistController';
import { getTodayPonto, registerPonto, listAllPontos } from '../controllers/pontoController';
import { getCoverageToday, getPdvsNaoVisitados } from '../controllers/coverageController';
import { rateVisit } from '../controllers/ratingController';
import { getPromotorRanking } from '../controllers/rankingController';
import { getRupturaAlertas } from '../controllers/rupturaController';
import { listPriceChecks } from '../controllers/priceCheckController';
import { createDegustacaoSolicitacao, listMyDegustacaoSolicitacoes, listAllDegustacaoSolicitacoes, updateDegustacaoSolicitacaoStatus, updateDegustacaoSolicitacao, deleteDegustacaoSolicitacao } from '../controllers/degustacaoController';
import { getVisitCosts, getPdvCostSummary } from '../controllers/costController';
import {
  startVisit, getActiveVisit, addPhoto, deletePhoto, addValidity, deleteValidity,
  addRuptura, deleteRuptura, addPriceCheck, deletePriceCheck, finishVisit, getMyVisits, getVisitDetail, listAllVisits, getMapData,
} from '../controllers/visitController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { upload, uploadPdf } from '../middleware/upload';
import { publicDegustacaoRateLimit } from '../middleware/publicRateLimit';

const router = Router();

// Auth
router.post('/auth/login', login);
router.get('/auth/me', authenticate, me);

// Users (admin)
router.get('/users', authenticate, requireAdmin, listUsers);
router.post('/users', authenticate, requireAdmin, createUser);
router.put('/users/:id', authenticate, requireAdmin, updateUser);
router.patch('/users/:id/toggle', authenticate, requireAdmin, toggleUserActive);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);

// PDVs
router.get('/pdvs', authenticate, listPDVs);
router.post('/pdvs', authenticate, requireAdmin, createPDV);
router.put('/pdvs/:id', authenticate, requireAdmin, updatePDV);
router.patch('/pdvs/:id/toggle', authenticate, requireAdmin, togglePDVActive);
router.delete('/pdvs/:id', authenticate, requireAdmin, deletePDV);
router.get('/pdvs/:id/gps-sugestao', authenticate, requireAdmin, getPdvGpsSuggestion);

// Products
router.get('/products', authenticate, listProducts);
router.post('/products', authenticate, requireAdmin, createProduct);
router.put('/products/:id', authenticate, requireAdmin, updateProduct);
router.patch('/products/:id/toggle', authenticate, requireAdmin, toggleProductActive);
router.delete('/products/:id', authenticate, requireAdmin, deleteProduct);

// Rotas de visita — leitura liberada pro promotor (só vê a própria); mutação restrita ao admin
router.get('/routes', authenticate, listRoutes);
router.post('/routes', authenticate, requireAdmin, createRouteEntry);
router.patch('/routes/reorder', authenticate, requireAdmin, reorderRouteEntries);
router.delete('/routes/:id', authenticate, requireAdmin, deleteRouteEntry);
router.patch('/routes/:id/justify', authenticate, justifyRouteEntry);

// Checklist de fotos obrigatórias
router.get('/checklist', authenticate, listChecklistItems);
router.post('/checklist', authenticate, requireAdmin, createChecklistItem);
router.put('/checklist/:id', authenticate, requireAdmin, updateChecklistItem);
router.patch('/checklist/:id/toggle', authenticate, requireAdmin, toggleChecklistItemActive);
router.patch('/checklist/reorder', authenticate, requireAdmin, reorderChecklistItems);
router.delete('/checklist/:id', authenticate, requireAdmin, deleteChecklistItem);

// Ponto
router.get('/ponto/today', authenticate, getTodayPonto);
router.post('/ponto', authenticate, registerPonto);
router.get('/ponto/all', authenticate, requireAdmin, listAllPontos);

// Visits
router.post('/visits', authenticate, startVisit);
router.get('/visits/active', authenticate, getActiveVisit);
router.get('/visits/my', authenticate, getMyVisits);
router.get('/visits/all', authenticate, requireAdmin, listAllVisits);
router.get('/visits/:visitId', authenticate, getVisitDetail);
router.post('/visits/:visitId/photos', authenticate, upload.single('photo'), addPhoto);
router.delete('/visits/:visitId/photos/:photoId', authenticate, deletePhoto);
router.post('/visits/:visitId/validities', authenticate, addValidity);
router.delete('/visits/:visitId/validities/:validityId', authenticate, deleteValidity);
router.post('/visits/:visitId/ruptura', authenticate, addRuptura);
router.delete('/visits/:visitId/ruptura/:rupturaId', authenticate, deleteRuptura);
router.post('/visits/:visitId/price-checks', authenticate, upload.single('photo'), addPriceCheck);
router.delete('/visits/:visitId/price-checks/:priceCheckId', authenticate, deletePriceCheck);
router.patch('/visits/:visitId/finish', authenticate, finishVisit);

// Admin Map
router.get('/admin/map/today', authenticate, requireAdmin, getMapData);

// Admin Cobertura
router.get('/admin/coverage/today', authenticate, requireAdmin, getCoverageToday);
router.get('/admin/pdvs/nao-visitados', authenticate, requireAdmin, getPdvsNaoVisitados);

// Avaliação de visita e ranking de promotores
router.put('/visits/:visitId/rating', authenticate, requireAdmin, rateVisit);
router.get('/admin/ranking', authenticate, requireAdmin, getPromotorRanking);

// Admin Ruptura
router.get('/admin/ruptura/alertas', authenticate, requireAdmin, getRupturaAlertas);

// Admin Pesquisa de Preço
router.get('/admin/price-checks', authenticate, requireAdmin, listPriceChecks);

// Degustação — portal público (sem login, identificação por nome), admin acompanha tudo
router.post('/degustacoes/public', publicDegustacaoRateLimit, uploadPdf.single('document'), createDegustacaoSolicitacao);
router.get('/degustacoes/public/minhas', publicDegustacaoRateLimit, listMyDegustacaoSolicitacoes);
router.get('/admin/degustacoes', authenticate, requireAdmin, listAllDegustacaoSolicitacoes);
router.patch('/admin/degustacoes/:id/status', authenticate, requireAdmin, updateDegustacaoSolicitacaoStatus);
router.put('/admin/degustacoes/:id', authenticate, requireAdmin, updateDegustacaoSolicitacao);
router.delete('/admin/degustacoes/:id', authenticate, requireAdmin, deleteDegustacaoSolicitacao);

// Admin Custo por Atendimento
router.get('/admin/custos/visitas', authenticate, requireAdmin, getVisitCosts);
router.get('/admin/custos/pdvs', authenticate, requireAdmin, getPdvCostSummary);

export default router;
