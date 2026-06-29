import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseDateOnly } from '../utils/date';

const prisma = new PrismaClient();

export async function listRoutes(req: Request, res: Response): Promise<void> {
  const { promotorId, from, to } = req.query;

  const where: any = {};
  if (promotorId) where.promotorId = promotorId as string;

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

export async function deleteRouteEntry(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const route = await prisma.rotaVisita.findUnique({ where: { id } });
  if (!route) {
    res.status(404).json({ success: false, error: 'Registro de rota não encontrado.' });
    return;
  }

  await prisma.rotaVisita.delete({ where: { id } });
  res.json({ success: true, data: null });
}
