import { Request, Response } from 'express';
import { LOCATION_REQUIRED_MESSAGE, parseRequiredCoordinates } from '../utils/location';
import { parseDateOnly, todayDateOnly } from '../utils/date';
import { prisma } from '../lib/prisma';

// Ponto registra só o almoço (Saída/Retorno). É global por usuário/dia,
// independente de qual visita (PDV) está ativa — início/fim de cada visita
// já é rastreado no próprio Visit (startedAt/completedAt).
const PONTO_SEQUENCE = ['SAIDA_ALMOCO', 'RETORNO_ALMOCO'];

export async function getTodayPonto(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const start = todayDateOnly();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

  const pontos = await prisma.ponto.findMany({
    where: {
      userId: authReq.user.userId,
      timestamp: { gte: start, lte: end },
    },
    orderBy: { timestamp: 'asc' },
  });

  res.json({ success: true, data: pontos });
}

const INVALID_BATTERY_LEVEL = Symbol('INVALID_BATTERY_LEVEL');

function parseBatteryLevel(value: unknown): number | null | typeof INVALID_BATTERY_LEVEL {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : INVALID_BATTERY_LEVEL;
}

export async function registerPonto(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { type, latitude, longitude, locationAvailable, batteryLevel } = req.body;

  if (!type || !PONTO_SEQUENCE.includes(type)) {
    res.status(400).json({ success: false, error: 'Tipo de ponto inválido.' });
    return;
  }

  const parsedBatteryLevel = parseBatteryLevel(batteryLevel);
  if (parsedBatteryLevel === INVALID_BATTERY_LEVEL) {
    res.status(400).json({ success: false, error: 'Nível de bateria deve ser um número inteiro entre 0 e 100.' });
    return;
  }

  const coordinates = parseRequiredCoordinates({ latitude, longitude });
  const gpsAvailable = locationAvailable !== false && locationAvailable !== 'false';
  if (gpsAvailable && (coordinates.latitude === null || coordinates.longitude === null)) {
    res.status(422).json({ success: false, error: LOCATION_REQUIRED_MESSAGE });
    return;
  }

  const todayStart = todayDateOnly();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  const todayPontos = await prisma.ponto.findMany({
    where: {
      userId: authReq.user.userId,
      timestamp: { gte: todayStart, lte: todayEnd },
    },
    orderBy: { timestamp: 'asc' },
  });

  const alreadyRegistered = todayPontos.some((p) => p.type === type);
  if (alreadyRegistered) {
    res.status(409).json({ success: false, error: `Ponto "${type}" já registrado hoje.` });
    return;
  }

  const lastPonto = todayPontos[todayPontos.length - 1];
  if (type === 'SAIDA_ALMOCO' && todayPontos.length === 0) {
    // ok — primeiro registro do dia
  } else if (type === 'RETORNO_ALMOCO' && lastPonto?.type === 'SAIDA_ALMOCO') {
    // ok
  } else {
    const nextExpected = lastPonto ? 'nenhum' : 'SAIDA_ALMOCO';
    res.status(422).json({
      success: false,
      error: `Sequência de ponto inválida. Próximo esperado: ${nextExpected}.`,
    });
    return;
  }

  const ponto = await prisma.ponto.create({
    data: {
      userId: authReq.user.userId,
      type,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      locationAvailable: gpsAvailable,
      batteryLevel: parsedBatteryLevel,
    },
  });

  res.status(201).json({ success: true, data: ponto });
}

export async function listAllPontos(req: Request, res: Response): Promise<void> {
  const { date, userId } = req.query;

  const where: any = {};
  if (userId) where.userId = userId as string;
  if (date) {
    const start = parseDateOnly(date) ?? todayDateOnly();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    where.timestamp = { gte: start, lte: end };
  }

  const pontos = await prisma.ponto.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { timestamp: 'desc' },
  });

  res.json({ success: true, data: pontos });
}
