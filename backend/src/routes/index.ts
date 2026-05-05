import { Router } from 'express';
import { login, me } from '../controllers/authController';
import { listUsers, createUser, updateUser, toggleUserActive } from '../controllers/userController';
import { listPDVs, createPDV, updatePDV, togglePDVActive } from '../controllers/pdvController';
import { listProducts, createProduct, updateProduct, toggleProductActive } from '../controllers/productController';
import { getTodayPonto, registerPonto, listAllPontos } from '../controllers/pontoController';
import {
  startVisit, getActiveVisit, addPhoto, deletePhoto, addValidity, deleteValidity,
  finishVisit, getMyVisits, getVisitDetail, listAllVisits,
} from '../controllers/visitController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Auth
router.post('/auth/login', login);
router.get('/auth/me', authenticate, me);

// Users (admin)
router.get('/users', authenticate, requireAdmin, listUsers);
router.post('/users', authenticate, requireAdmin, createUser);
router.put('/users/:id', authenticate, requireAdmin, updateUser);
router.patch('/users/:id/toggle', authenticate, requireAdmin, toggleUserActive);

// PDVs
router.get('/pdvs', authenticate, listPDVs);
router.post('/pdvs', authenticate, requireAdmin, createPDV);
router.put('/pdvs/:id', authenticate, requireAdmin, updatePDV);
router.patch('/pdvs/:id/toggle', authenticate, requireAdmin, togglePDVActive);

// Products
router.get('/products', authenticate, listProducts);
router.post('/products', authenticate, requireAdmin, createProduct);
router.put('/products/:id', authenticate, requireAdmin, updateProduct);
router.patch('/products/:id/toggle', authenticate, requireAdmin, toggleProductActive);

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
router.patch('/visits/:visitId/finish', authenticate, finishVisit);

export default router;
