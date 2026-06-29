import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listRoutes(req: Request, res: Response): Promise<void> {
  const { promotorId } = req.query;

  const routes = await prisma.rotaVisita.findMany({
    where: promotorId ? { promotorId: promotorId as string } : {},
    include: {
      pdv: true,
      promotor: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ promotorId: 'asc' }, { dayOfWeek: 'asc' }, { order: 'asc' }],
  });

  res.json({ success: true, data: routes });
}

export async function createRouteEntry(req: Request, res: Response): Promise<void> {
  const { promotorId, pdvId, dayOfWeek } = req.body;

  if (!promotorId || !pdvId || dayOfWeek === undefined || dayOfWeek === null) {
    res.status(400).json({ success: false, error: 'Promotor, PDV e dia da semana são obrigatórios.' });
    return;
  }

  const dayOfWeekNum = Number(dayOfWeek);
  if (!Number.isInteger(dayOfWeekNum) || dayOfWeekNum < 0 || dayOfWeekNum > 6) {
    res.status(400).json({ success: false, error: 'Dia da semana inválido.' });
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
    where: { promotorId_pdvId_dayOfWeek: { promotorId, pdvId, dayOfWeek: dayOfWeekNum } },
  });
  if (existing) {
    res.status(409).json({ success: false, error: 'Esse PDV já está na rota desse dia para esse promotor.' });
    return;
  }

  const countForDay = await prisma.rotaVisita.count({ where: { promotorId, dayOfWeek: dayOfWeekNum } });

  const route = await prisma.rotaVisita.create({
    data: { promotorId, pdvId, dayOfWeek: dayOfWeekNum, order: countForDay },
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
