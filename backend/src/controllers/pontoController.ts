import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PONTO_SEQUENCE = ['ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA'];

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start, end };
}

export async function getTodayPonto(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { start, end } = getTodayRange();

  const pontos = await prisma.ponto.findMany({
    where: {
      userId: authReq.user.userId,
      timestamp: { gte: start, lte: end },
    },
    orderBy: { timestamp: 'asc' },
  });

  res.json({ success: true, data: pontos });
}

export async function registerPonto(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { type, latitude, longitude } = req.body;

  if (!type || !PONTO_SEQUENCE.includes(type)) {
    res.status(400).json({ success: false, error: 'Tipo de ponto inválido.' });
    return;
  }

  const { start, end } = getTodayRange();
  const todayPontos = await prisma.ponto.findMany({
    where: {
      userId: authReq.user.userId,
      timestamp: { gte: start, lte: end },
    },
    orderBy: { timestamp: 'asc' },
  });

  const alreadyRegistered = todayPontos.some((p) => p.type === type);
  if (alreadyRegistered) {
    res.status(409).json({ success: false, error: `Ponto "${type}" já registrado hoje.` });
    return;
  }

  const lastPonto = todayPontos[todayPontos.length - 1];
  const lastIndex = lastPonto ? PONTO_SEQUENCE.indexOf(lastPonto.type) : -1;
  const typeIndex = PONTO_SEQUENCE.indexOf(type);

  if (type === 'ENTRADA' && todayPontos.length === 0) {
    // ok
  } else if (type === 'SAIDA' && (lastPonto?.type === 'ENTRADA' || lastPonto?.type === 'RETORNO_ALMOCO')) {
    // ok — can exit after entrada or retorno
  } else if (type === 'SAIDA_ALMOCO' && lastPonto?.type === 'ENTRADA') {
    // ok
  } else if (type === 'RETORNO_ALMOCO' && lastPonto?.type === 'SAIDA_ALMOCO') {
    // ok
  } else {
    const nextExpected = lastPonto
      ? PONTO_SEQUENCE[lastIndex + 1] || 'nenhum'
      : 'ENTRADA';
    res.status(422).json({
      success: false,
      error: `Sequência de ponto inválida. Próximo esperado: ${nextExpected}.`,
    });
    return;
  }

  const locationAvailable = latitude != null && longitude != null;
  const ponto = await prisma.ponto.create({
    data: {
      userId: authReq.user.userId,
      type,
      latitude: locationAvailable ? parseFloat(latitude) : null,
      longitude: locationAvailable ? parseFloat(longitude) : null,
      locationAvailable,
    },
  });

  res.status(201).json({ success: true, data: ponto });
}

export async function listAllPontos(req: Request, res: Response): Promise<void> {
  const { date, userId } = req.query;

  const where: any = {};
  if (userId) where.userId = userId as string;
  if (date) {
    const d = new Date(date as string);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    where.timestamp = { gte: start, lte: end };
  }

  const pontos = await prisma.ponto.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { timestamp: 'desc' },
  });

  res.json({ success: true, data: pontos });
}
