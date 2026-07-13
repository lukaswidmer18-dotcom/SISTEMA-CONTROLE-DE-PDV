import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import path from 'path';
import { LOCATION_REQUIRED_MESSAGE, parseRequiredCoordinates, checkGeofence } from '../utils/location';
import { applyWatermark } from '../utils/watermark';
import { uploadToBlob, deleteFromBlob } from '../utils/blobStorage';

const prisma = new PrismaClient();

type VisitWithDetails = Prisma.VisitGetPayload<{
  include: {
    photos: { include: { checklistItem: true } };
    validities: true;
    pdv: true;
    promotor: { select: { name: true } };
  };
}>;
type VisitValidationResult =
  | { error: string; status: number; visit?: undefined }
  | { error?: undefined; status?: undefined; visit: VisitWithDetails };

async function validateVisitInProgress(visitId: string, userId: string): Promise<VisitValidationResult> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      photos: { include: { checklistItem: true } },
      validities: true,
      pdv: true,
      promotor: { select: { name: true } },
    },
  });
  if (!visit || visit.promotorId !== userId) return { error: 'Visita não encontrada.', status: 404 };
  if (visit.status !== 'IN_PROGRESS') return { error: 'Visita já finalizada.', status: 422 };
  return { visit };
}

export async function startVisit(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { pdvId, latitude, longitude, locationAvailable } = req.body;

  if (!pdvId) {
    res.status(400).json({ success: false, error: 'PDV é obrigatório.' });
    return;
  }

  const coordinates = parseRequiredCoordinates({ latitude, longitude });

  const pdv = await prisma.pDV.findUnique({ where: { id: pdvId } });
  if (!pdv || !pdv.active) {
    res.status(404).json({ success: false, error: 'PDV não encontrado ou inativo.' });
    return;
  }

  const gpsAvailable = locationAvailable !== false && locationAvailable !== 'false';
  const geofence = checkGeofence(pdv, { latitude: coordinates.latitude ?? 0, longitude: coordinates.longitude ?? 0 });
  if (geofence.allowed === false) {
    if (geofence.reason === 'NOT_CONFIGURED') {
      res.status(422).json({
        success: false,
        error: 'PDV sem área de geolocalização configurada. Contate o administrador.',
      });
      return;
    }
    if (gpsAvailable) {
      res.status(422).json({
        success: false,
        error: `Você está a ${Math.round(geofence.distanceMeters)}m do PDV. Distância máxima permitida: ${geofence.radiusMeters}m.`,
      });
      return;
    }
  }

  const inProgress = await prisma.visit.findFirst({
    where: { promotorId: authReq.user.userId, status: 'IN_PROGRESS' },
  });
  if (inProgress) {
    res.status(409).json({ success: false, error: 'Já existe uma visita em andamento. Finalize-a antes de iniciar outra.' });
    return;
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const completedToday = await prisma.visit.findFirst({
    where: {
      promotorId: authReq.user.userId,
      pdvId,
      status: 'COMPLETED',
      startedAt: { gte: startOfDay, lte: endOfDay },
    },
  });
  if (completedToday) {
    res.status(409).json({ success: false, error: 'Você já concluiu a visita a este PDV hoje. A visita não pode ser refeita no mesmo dia.' });
    return;
  }

  const visit = await prisma.visit.create({
    data: {
      promotorId: authReq.user.userId,
      pdvId,
      latitudeStart: coordinates.latitude,
      longitudeStart: coordinates.longitude,
    },
    include: {
      pdv: true,
      promotor: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json({ success: true, data: visit });
}

export async function getActiveVisit(req: Request, res: Response): Promise<void> {
  const authReq = req as any;

  const visit = await prisma.visit.findFirst({
    where: { promotorId: authReq.user.userId, status: 'IN_PROGRESS' },
    include: {
      pdv: true,
      photos: { include: { checklistItem: true } },
      validities: { include: { product: true } },
      rupturas: { include: { product: true } },
      priceChecks: { include: { product: true } },
    },
  });

  res.json({ success: true, data: visit });
}

export async function addPhoto(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId } = req.params;
  const { latitude, longitude, checklistItemId } = req.body;

  const validation = await validateVisitInProgress(visitId, authReq.user.userId);
  if (!validation.visit) {
    res.status(validation.status).json({ success: false, error: validation.error });
    return;
  }
  const { visit } = validation;

  if (!req.file) {
    res.status(400).json({ success: false, error: 'Foto não enviada.' });
    return;
  }

  if (!checklistItemId) {
    res.status(400).json({ success: false, error: 'Item do checklist é obrigatório.' });
    return;
  }

  const checklistItem = await prisma.checklistItem.findUnique({ where: { id: checklistItemId } });
  if (!checklistItem || !checklistItem.active) {
    res.status(400).json({ success: false, error: 'Item do checklist inválido ou inativo.' });
    return;
  }

  const photoCountByItem = new Map<string, number>();
  for (const p of visit.photos) {
    if (p.checklistItemId) photoCountByItem.set(p.checklistItemId, (photoCountByItem.get(p.checklistItemId) || 0) + 1);
  }

  const currentCount = photoCountByItem.get(checklistItemId) || 0;
  if (currentCount >= checklistItem.requiredCount) {
    res.status(422).json({
      success: false,
      error: `Já foram enviadas as ${checklistItem.requiredCount} foto(s) necessárias para "${checklistItem.label}".`,
    });
    return;
  }

  const precedingItems = await prisma.checklistItem.findMany({
    where: { active: true, order: { lt: checklistItem.order } },
    orderBy: { order: 'asc' },
  });
  const pendingPreceding = precedingItems.find((item) => (photoCountByItem.get(item.id) || 0) < item.requiredCount);
  if (pendingPreceding) {
    res.status(422).json({
      success: false,
      error: `Siga a ordem do checklist. Tire antes a foto de "${pendingPreceding.label}".`,
    });
    return;
  }

  const coordinates = parseRequiredCoordinates({ latitude, longitude });

  const ext = path.extname(req.file.originalname);
  const watermarkLines = [
    new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    `Promotor: ${visit.promotor.name}`,
    `Cliente: ${visit.pdv.name} · ${visit.pdv.city}`,
    coordinates.latitude != null && coordinates.longitude != null
      ? `GPS: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
      : 'GPS: indisponível',
  ];
  let photoBuffer = req.file.buffer;
  try {
    photoBuffer = await applyWatermark(req.file.buffer, ext, watermarkLines);
  } catch (err) {
    console.error('Erro ao aplicar marca d\'água na foto:', err);
  }

  const { url, pathname } = await uploadToBlob(photoBuffer, req.file.originalname, 'photos');

  const photo = await prisma.photo.create({
    data: {
      visitId,
      checklistItemId,
      filePath: url,
      fileName: pathname,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    },
    include: { checklistItem: true },
  });

  res.status(201).json({ success: true, data: photo });
}

export async function addValidity(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId } = req.params;
  const { productId, expiryDate, quantity } = req.body;

  if (!productId || !expiryDate) {
    res.status(400).json({ success: false, error: 'Produto e data de validade são obrigatórios.' });
    return;
  }

  const validation = await validateVisitInProgress(visitId, authReq.user.userId);
  if (!validation.visit) {
    res.status(validation.status).json({ success: false, error: validation.error });
    return;
  }
  const { visit } = validation;

  const validity = await prisma.validity.create({
    data: {
      visitId,
      productId,
      expiryDate,
      quantity: quantity ? parseInt(quantity) : 1,
    },
    include: { product: true },
  });

  res.status(201).json({ success: true, data: validity });
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export async function addRuptura(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId } = req.params;
  const { productId, qtyGondola, qtyDeposito, qtySeparadoTroca } = req.body;

  if (!productId) {
    res.status(400).json({ success: false, error: 'Produto é obrigatório.' });
    return;
  }
  if (!isNonNegativeInt(qtyGondola) || !isNonNegativeInt(qtyDeposito) || !isNonNegativeInt(qtySeparadoTroca)) {
    res.status(400).json({ success: false, error: 'Quantidades de gôndola, depósito e troca devem ser números inteiros não-negativos.' });
    return;
  }

  const validation = await validateVisitInProgress(visitId, authReq.user.userId);
  if (!validation.visit) {
    res.status(validation.status).json({ success: false, error: validation.error });
    return;
  }

  const ruptura = await prisma.rupturaRegistro.upsert({
    where: { visitId_productId: { visitId, productId } },
    create: { visitId, productId, qtyGondola, qtyDeposito, qtySeparadoTroca },
    update: { qtyGondola, qtyDeposito, qtySeparadoTroca },
    include: { product: true },
  });

  res.status(201).json({ success: true, data: ruptura });
}

export async function deleteRuptura(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId, rupturaId } = req.params;

  const ruptura = await prisma.rupturaRegistro.findUnique({
    where: { id: rupturaId },
    include: { visit: true },
  });

  if (!ruptura || ruptura.visitId !== visitId || ruptura.visit.promotorId !== authReq.user.userId) {
    res.status(404).json({ success: false, error: 'Registro não encontrado.' });
    return;
  }
  if (ruptura.visit.status !== 'IN_PROGRESS') {
    res.status(422).json({ success: false, error: 'Visita já finalizada.' });
    return;
  }

  await prisma.rupturaRegistro.delete({ where: { id: rupturaId } });
  res.json({ success: true, data: null });
}

const INVALID_PRICE = Symbol('INVALID_PRICE');

function parseRequiredPositivePrice(value: unknown): number | typeof INVALID_PRICE {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : INVALID_PRICE;
}

function parseOptionalPositivePrice(value: unknown): number | null | typeof INVALID_PRICE {
  if (value === undefined || value === null || value === '') return null;
  return parseRequiredPositivePrice(value);
}

export async function addPriceCheck(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId } = req.params;
  const { productId, ownPrice, competitorName, competitorPrice } = req.body;

  if (!productId) {
    res.status(400).json({ success: false, error: 'Produto é obrigatório.' });
    return;
  }

  const parsedOwnPrice = parseRequiredPositivePrice(ownPrice);
  if (parsedOwnPrice === INVALID_PRICE) {
    res.status(400).json({ success: false, error: 'Preço próprio é obrigatório e deve ser maior que zero.' });
    return;
  }

  const parsedCompetitorPrice = parseOptionalPositivePrice(competitorPrice);
  if (parsedCompetitorPrice === INVALID_PRICE) {
    res.status(400).json({ success: false, error: 'Preço da concorrência deve ser maior que zero.' });
    return;
  }
  const trimmedCompetitorName = typeof competitorName === 'string' ? competitorName.trim() : '';
  if (parsedCompetitorPrice !== null && !trimmedCompetitorName) {
    res.status(400).json({ success: false, error: 'Informe o nome do concorrente junto com o preço dele.' });
    return;
  }

  const validation = await validateVisitInProgress(visitId, authReq.user.userId);
  if (!validation.visit) {
    res.status(validation.status).json({ success: false, error: validation.error });
    return;
  }

  const photoData = req.file
    ? await uploadToBlob(req.file.buffer, req.file.originalname, 'price-checks')
    : null;

  const priceCheck = await prisma.priceCheck.upsert({
    where: { visitId_productId: { visitId, productId } },
    create: {
      visitId,
      productId,
      ownPrice: parsedOwnPrice,
      competitorName: trimmedCompetitorName || null,
      competitorPrice: parsedCompetitorPrice,
      photoPath: photoData?.url,
      photoFileName: photoData?.pathname,
    },
    update: {
      ownPrice: parsedOwnPrice,
      competitorName: trimmedCompetitorName || null,
      competitorPrice: parsedCompetitorPrice,
      ...(photoData ? { photoPath: photoData.url, photoFileName: photoData.pathname } : {}),
    },
    include: { product: true },
  });

  res.status(201).json({ success: true, data: priceCheck });
}

export async function deletePriceCheck(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId, priceCheckId } = req.params;

  const priceCheck = await prisma.priceCheck.findUnique({
    where: { id: priceCheckId },
    include: { visit: true },
  });

  if (!priceCheck || priceCheck.visitId !== visitId || priceCheck.visit.promotorId !== authReq.user.userId) {
    res.status(404).json({ success: false, error: 'Registro não encontrado.' });
    return;
  }
  if (priceCheck.visit.status !== 'IN_PROGRESS') {
    res.status(422).json({ success: false, error: 'Visita já finalizada.' });
    return;
  }

  await prisma.priceCheck.delete({ where: { id: priceCheckId } });
  if (priceCheck.photoPath) {
    await deleteFromBlob(priceCheck.photoPath);
  }
  res.json({ success: true, data: null });
}

export async function deleteValidity(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId, validityId } = req.params;

  const validity = await prisma.validity.findUnique({
    where: { id: validityId },
    include: { visit: true },
  });

  if (!validity || validity.visitId !== visitId || validity.visit.promotorId !== authReq.user.userId) {
    res.status(404).json({ success: false, error: 'Registro não encontrado.' });
    return;
  }
  if (validity.visit.status !== 'IN_PROGRESS') {
    res.status(422).json({ success: false, error: 'Visita já finalizada.' });
    return;
  }

  await prisma.validity.delete({ where: { id: validityId } });
  res.json({ success: true, data: null });
}

export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId, photoId } = req.params;

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { visit: true },
  });

  if (!photo || photo.visitId !== visitId || photo.visit.promotorId !== authReq.user.userId) {
    res.status(404).json({ success: false, error: 'Foto não encontrada.' });
    return;
  }
  if (photo.visit.status !== 'IN_PROGRESS') {
    res.status(422).json({ success: false, error: 'Visita já finalizada.' });
    return;
  }

  if (photo.filePath) {
    await deleteFromBlob(photo.filePath);
  }

  await prisma.photo.delete({ where: { id: photoId } });
  res.json({ success: true, data: null });
}

export async function finishVisit(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId } = req.params;
  const { latitude, longitude, noProductsFound, boxesGenerated } = req.body;

  const validation = await validateVisitInProgress(visitId, authReq.user.userId);
  if (!validation.visit) {
    res.status(validation.status).json({ success: false, error: validation.error });
    return;
  }
  const { visit } = validation;

  const coordinates = parseRequiredCoordinates({ latitude, longitude });

  let parsedBoxes: number | null = null;
  if (boxesGenerated !== undefined && boxesGenerated !== null && boxesGenerated !== '') {
    const value = Number(boxesGenerated);
    if (!Number.isInteger(value) || value < 0) {
      res.status(400).json({ success: false, error: 'Número de caixas deve ser um número inteiro maior ou igual a zero.' });
      return;
    }
    parsedBoxes = value;
  }

  const activeItems = await prisma.checklistItem.findMany({ where: { active: true } });
  const photoCountByItem = new Map<string, number>();
  for (const p of visit.photos) {
    if (p.checklistItemId) photoCountByItem.set(p.checklistItemId, (photoCountByItem.get(p.checklistItemId) || 0) + 1);
  }
  const missingItems = activeItems.filter((item) => (photoCountByItem.get(item.id) || 0) < item.requiredCount);
  if (missingItems.length > 0) {
    res.status(422).json({
      success: false,
      error: `Faltam fotos do checklist: ${missingItems.map((i) => `${i.label} (${photoCountByItem.get(i.id) || 0}/${i.requiredCount})`).join(', ')}.`,
    });
    return;
  }

  const skipValidity = noProductsFound === true || noProductsFound === 'true';
  if (!skipValidity && visit.validities.length === 0) {
    res.status(422).json({
      success: false,
      error: 'Registre ao menos uma data de validade ou marque "Não encontrei produtos no PDV".',
    });
    return;
  }

  const updated = await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      noProductsFound: skipValidity,
      latitudeEnd: coordinates.latitude,
      longitudeEnd: coordinates.longitude,
      boxesGenerated: parsedBoxes,
    },
    include: {
      pdv: true,
      photos: true,
      validities: { include: { product: true } },
      promotor: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, data: updated });
}

export async function getMyVisits(req: Request, res: Response): Promise<void> {
  const authReq = req as any;

  const visits = await prisma.visit.findMany({
    where: { promotorId: authReq.user.userId },
    include: {
      pdv: true,
      _count: { select: { photos: true, validities: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: 30,
  });

  res.json({ success: true, data: visits });
}

export async function getVisitDetail(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId } = req.params;

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      pdv: true,
      promotor: { select: { id: true, name: true, email: true } },
      photos: true,
      validities: { include: { product: true } },
      rupturas: { include: { product: true } },
      priceChecks: { include: { product: true } },
      rating: true,
    },
  });

  if (!visit) {
    res.status(404).json({ success: false, error: 'Visita não encontrada.' });
    return;
  }

  const isAdmin = authReq.user?.role === 'ADMIN';
  if (!isAdmin && visit.promotorId !== authReq.user.userId) {
    res.status(403).json({ success: false, error: 'Acesso negado.' });
    return;
  }

  res.json({ success: true, data: visit });
}

export async function listAllVisits(req: Request, res: Response): Promise<void> {
  const { date, promotorId, pdvId, status } = req.query;

  const where: any = {};
  if (promotorId) where.promotorId = promotorId as string;
  if (pdvId) where.pdvId = pdvId as string;
  if (status) where.status = status as string;
  if (date) {
    const d = new Date(date as string);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    where.startedAt = { gte: start, lte: end };
  }

  const visits = await prisma.visit.findMany({
    where,
    include: {
      pdv: true,
      promotor: { select: { id: true, name: true, email: true } },
      rating: true,
      _count: { select: { photos: true, validities: true } },
    },
    orderBy: { startedAt: 'desc' },
  });

  const promotorIds = Array.from(new Set(visits.map((v) => v.promotorId)));
  const dateKeys = Array.from(new Set(visits.map((v) => v.startedAt.toISOString().slice(0, 10))));
  const routes = promotorIds.length
    ? await prisma.rotaVisita.findMany({
        where: {
          promotorId: { in: promotorIds },
          date: { in: dateKeys.map((d) => new Date(`${d}T00:00:00.000Z`)) },
        },
        select: { promotorId: true, pdvId: true, date: true },
      })
    : [];
  const scheduledSet = new Set(routes.map((r) => `${r.promotorId}|${r.pdvId}|${r.date.toISOString().slice(0, 10)}`));

  const data = visits.map((v) => ({
    ...v,
    outsideRoute: !scheduledSet.has(`${v.promotorId}|${v.pdvId}|${v.startedAt.toISOString().slice(0, 10)}`),
  }));

  res.json({ success: true, data });
}

export async function getMapData(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Buscar todos os promotores ativos para garantir que apareçam no mapa se tiverem rastro
  const users = await prisma.user.findMany({
    where: { role: 'PROMOTOR', active: true },
    select: { id: true, name: true, email: true },
  });

  // Buscar visitas de hoje
  const visits = await prisma.visit.findMany({
    where: {
      startedAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      pdv: true,
      promotor: { select: { id: true, name: true } },
    },
    orderBy: { startedAt: 'asc' },
  });

  // Buscar pontos de hoje
  const pontos = await prisma.ponto.findMany({
    where: {
      timestamp: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Coordenada (0,0) é o valor de contingência enviado quando o GPS falha — não é localização real
  const hasRealLocation = (lat: number | null | undefined, lng: number | null | undefined) =>
    lat !== null && lat !== undefined && lng !== null && lng !== undefined && (lat !== 0 || lng !== 0);

  // Consolidar por promotor para facilitar o desenho do rastro no frontend
  const mapData = users.map((user) => {
    const userVisits = visits.filter((v) => v.promotorId === user.id);
    const userPontos = pontos.filter((p) => p.userId === user.id && hasRealLocation(p.latitude, p.longitude));

    // Determinar o status atual e última localização
    let lastLocation = null;
    let currentPDV = null;
    let status = 'INATIVO'; // INATIVO, LOGADO, EM_VISITA

    // Verificar se há visita em andamento
    const activeVisit = userVisits.find((v) => v.status === 'IN_PROGRESS');
    if (activeVisit) {
      status = 'EM_VISITA';
      currentPDV = activeVisit.pdv.name;
      if (hasRealLocation(activeVisit.latitudeStart, activeVisit.longitudeStart)) {
        lastLocation = { lat: activeVisit.latitudeStart, lng: activeVisit.longitudeStart, time: activeVisit.startedAt };
      } else if (userPontos.length > 0) {
        const lastPonto = userPontos[userPontos.length - 1];
        lastLocation = { lat: lastPonto.latitude, lng: lastPonto.longitude, time: lastPonto.timestamp };
      } else if (hasRealLocation(activeVisit.pdv.latitude, activeVisit.pdv.longitude)) {
        // GPS do promotor falhou na visita — usa a coordenada cadastrada do PDV como aproximação
        lastLocation = { lat: activeVisit.pdv.latitude, lng: activeVisit.pdv.longitude, time: activeVisit.startedAt };
      }
    } else if (userPontos.length > 0) {
      status = 'LOGADO';
      const lastPonto = userPontos[userPontos.length - 1];
      lastLocation = { lat: lastPonto.latitude, lng: lastPonto.longitude, time: lastPonto.timestamp };
    }

    // Gerar o rastro (sequência de pontos temporais) — ignora pontos sem localização real
    const trail = [
      ...userPontos.map((p) => ({ lat: p.latitude, lng: p.longitude, time: p.timestamp, type: 'PONTO', label: p.type, state: null })),
      ...userVisits.filter(v => hasRealLocation(v.latitudeStart, v.longitudeStart)).map((v) => ({ lat: v.latitudeStart, lng: v.longitudeStart, time: v.startedAt, type: 'VISITA_START', label: `Início: ${v.pdv.name}`, state: v.pdv.state })),
      ...userVisits.filter(v => hasRealLocation(v.latitudeEnd, v.longitudeEnd)).map((v) => ({ lat: v.latitudeEnd, lng: v.longitudeEnd, time: v.completedAt, type: 'VISITA_END', label: `Fim: ${v.pdv.name}`, state: v.pdv.state })),
    ].sort((a, b) => new Date(a.time!).getTime() - new Date(b.time!).getTime());

    return {
      promotorId: user.id,
      promotorName: user.name,
      status,
      currentPDV,
      lastState: activeVisit?.pdv?.state || (userVisits.length > 0 ? userVisits[userVisits.length - 1].pdv.state : null),
      lastLocation,
      trail,
    };
  });

  res.json({ success: true, data: mapData });
}
