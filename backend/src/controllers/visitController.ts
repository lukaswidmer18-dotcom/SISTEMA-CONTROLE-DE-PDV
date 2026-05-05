import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { LOCATION_REQUIRED_MESSAGE, parseRequiredCoordinates } from '../utils/location';

const prisma = new PrismaClient();

export async function startVisit(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { pdvId, latitude, longitude } = req.body;

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

  const inProgress = await prisma.visit.findFirst({
    where: { promotorId: authReq.user.userId, status: 'IN_PROGRESS' },
  });
  if (inProgress) {
    res.status(409).json({ success: false, error: 'Já existe uma visita em andamento. Finalize-a antes de iniciar outra.' });
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
      photos: true,
      validities: { include: { product: true } },
    },
  });

  res.json({ success: true, data: visit });
}

export async function addPhoto(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId } = req.params;
  const { latitude, longitude } = req.body;

  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.promotorId !== authReq.user.userId) {
    res.status(404).json({ success: false, error: 'Visita não encontrada.' });
    return;
  }
  if (visit.status !== 'IN_PROGRESS') {
    res.status(422).json({ success: false, error: 'Visita já finalizada.' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, error: 'Foto não enviada.' });
    return;
  }

  const coordinates = parseRequiredCoordinates({ latitude, longitude });

  const photo = await prisma.photo.create({
    data: {
      visitId,
      filePath: req.file.path,
      fileName: req.file.filename,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    },
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

  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.promotorId !== authReq.user.userId) {
    res.status(404).json({ success: false, error: 'Visita não encontrada.' });
    return;
  }
  if (visit.status !== 'IN_PROGRESS') {
    res.status(422).json({ success: false, error: 'Visita já finalizada.' });
    return;
  }

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

  // Deletar o arquivo físico
  if (photo.filePath && fs.existsSync(photo.filePath)) {
    try {
      fs.unlinkSync(photo.filePath);
    } catch (err) {
      console.error('Erro ao deletar arquivo:', err);
    }
  }

  await prisma.photo.delete({ where: { id: photoId } });
  res.json({ success: true, data: null });
}

export async function finishVisit(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId } = req.params;
  const { latitude, longitude, noProductsFound } = req.body;

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { photos: true, validities: true },
  });

  if (!visit || visit.promotorId !== authReq.user.userId) {
    res.status(404).json({ success: false, error: 'Visita não encontrada.' });
    return;
  }
  if (visit.status !== 'IN_PROGRESS') {
    res.status(422).json({ success: false, error: 'Visita já finalizada.' });
    return;
  }

  const coordinates = parseRequiredCoordinates({ latitude, longitude });

  if (visit.photos.length < 10) {
    res.status(422).json({
      success: false,
      error: `São necessárias 10 fotos. Você enviou ${visit.photos.length}.`,
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
      _count: { select: { photos: true, validities: true } },
    },
    orderBy: { startedAt: 'desc' },
  });

  res.json({ success: true, data: visits });
}
