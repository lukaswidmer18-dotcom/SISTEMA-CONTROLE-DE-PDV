import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseDateOnly } from '../utils/date';
import { deleteFromBlob } from '../utils/blobStorage';

const prisma = new PrismaClient();

export async function listRoutes(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { promotorId, from, to } = req.query;
  const isAdmin = authReq.user?.role === 'ADMIN';

  const where: any = {};
  if (isAdmin) {
    if (promotorId) where.promotorId = promotorId as string;
  } else {
    // Promotor só pode ver a própria rota, nunca a de outro promotor
    where.promotorId = authReq.user.userId;
  }

  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date.gte = fromDate;
    if (toDate) where.date.lte = toDate;
  }

  const routes = await prisma.rotaVisita.findMany({
    where,
    include: {
      pdv: true,
      promotor: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ promotorId: 'asc' }, { date: 'asc' }, { order: 'asc' }],
  });

  res.json({ success: true, data: routes });
}

export async function createRouteEntry(req: Request, res: Response): Promise<void> {
  const { promotorId, pdvId, date } = req.body;

  if (!promotorId || !pdvId || !date) {
    res.status(400).json({ success: false, error: 'Promotor, PDV e data são obrigatórios.' });
    return;
  }

  const parsedDate = parseDateOnly(date);
  if (!parsedDate) {
    res.status(400).json({ success: false, error: 'Data inválida. Use o formato AAAA-MM-DD.' });
    return;
  }

  const promotor = await prisma.user.findUnique({ where: { id: promotorId } });
  if (!promotor || promotor.role !== 'PROMOTOR') {
    res.status(404).json({ success: false, error: 'Promotor não encontrado.' });
    return;
  }

  const pdv = await prisma.pDV.findUnique({ where: { id: pdvId } });
  if (!pdv || !pdv.active) {
    res.status(404).json({ success: false, error: 'PDV não encontrado ou inativo.' });
    return;
  }

  const existing = await prisma.rotaVisita.findUnique({
    where: { promotorId_pdvId_date: { promotorId, pdvId, date: parsedDate } },
  });
  if (existing) {
    res.status(409).json({ success: false, error: 'Esse PDV já está na rota dessa data para esse promotor.' });
    return;
  }

  const countForDate = await prisma.rotaVisita.count({ where: { promotorId, date: parsedDate } });

  const route = await prisma.rotaVisita.create({
    data: { promotorId, pdvId, date: parsedDate, order: countForDate },
    include: { pdv: true, promotor: { select: { id: true, name: true, email: true } } },
  });

  res.status(201).json({ success: true, data: route });
}

export async function justifyRouteEntry(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { id } = req.params;
  const { justification } = req.body;

  const text = typeof justification === 'string' ? justification.trim() : '';
  if (text.length < 10) {
    res.status(400).json({ success: false, error: 'Justificativa precisa ter pelo menos 10 caracteres.' });
    return;
  }

  const route = await prisma.rotaVisita.findUnique({ where: { id } });
  if (!route) {
    res.status(404).json({ success: false, error: 'Registro de rota não encontrado.' });
    return;
  }
  if (route.promotorId !== authReq.user.userId) {
    res.status(403).json({ success: false, error: 'Acesso negado.' });
    return;
  }

  const updated = await prisma.rotaVisita.update({
    where: { id },
    data: { justification: text, justifiedAt: new Date() },
    include: { pdv: true, promotor: { select: { id: true, name: true, email: true } } },
  });

  res.json({ success: true, data: updated });
}

export async function reorderRouteEntries(req: Request, res: Response): Promise<void> {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string')) {
    res.status(400).json({ success: false, error: 'Lista de IDs é obrigatória.' });
    return;
  }

  const routes = await prisma.rotaVisita.findMany({ where: { id: { in: ids } } });
  if (routes.length !== ids.length) {
    res.status(404).json({ success: false, error: 'Um ou mais registros de rota não foram encontrados.' });
    return;
  }

  const promotorIds = new Set(routes.map((r) => r.promotorId));
  const dateKeys = new Set(routes.map((r) => r.date.toISOString()));
  if (promotorIds.size > 1 || dateKeys.size > 1) {
    res.status(400).json({ success: false, error: 'Todos os PDVs reordenados precisam ser do mesmo promotor e data.' });
    return;
  }

  await prisma.$transaction(
    ids.map((id: string, index: number) => prisma.rotaVisita.update({ where: { id }, data: { order: index } })),
  );

  res.json({ success: true, data: null });
}

export async function deleteRouteEntry(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const route = await prisma.rotaVisita.findUnique({ where: { id } });
  if (!route) {
    res.status(404).json({ success: false, error: 'Registro de rota não encontrado.' });
    return;
  }

  const dayStart = route.date;
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const visits = await prisma.visit.findMany({
    where: {
      promotorId: route.promotorId,
      pdvId: route.pdvId,
      startedAt: { gte: dayStart, lt: dayEnd },
    },
    include: { photos: true, priceChecks: true },
  });
  const visitIds = visits.map((v) => v.id);

  for (const visit of visits) {
    for (const photo of visit.photos) {
      if (photo.filePath) await deleteFromBlob(photo.filePath);
    }
    for (const priceCheck of visit.priceChecks) {
      if (priceCheck.photoPath) await deleteFromBlob(priceCheck.photoPath);
    }
  }

  await prisma.$transaction([
    prisma.ponto.deleteMany({ where: { visitId: { in: visitIds } } }),
    prisma.photo.deleteMany({ where: { visitId: { in: visitIds } } }),
    prisma.validity.deleteMany({ where: { visitId: { in: visitIds } } }),
    prisma.visitRating.deleteMany({ where: { visitId: { in: visitIds } } }),
    prisma.rupturaRegistro.deleteMany({ where: { visitId: { in: visitIds } } }),
    prisma.priceCheck.deleteMany({ where: { visitId: { in: visitIds } } }),
    prisma.visit.deleteMany({ where: { id: { in: visitIds } } }),
    prisma.rotaVisita.delete({ where: { id } }),
  ]);

  res.json({ success: true, data: null });
}
