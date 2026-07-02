import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LOCATION_REQUIRED_MESSAGE, parseRequiredCoordinates, checkGeofence } from '../utils/location';
import { parseDateOnly, todayDateOnly } from '../utils/date';

const prisma = new PrismaClient();

const PONTO_SEQUENCE = ['ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA'];

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

  // Get Active Visit
  const activeVisit = await prisma.visit.findFirst({
    where: { promotorId: authReq.user.userId, status: 'IN_PROGRESS' },
    include: { pdv: true },
  });

  if (activeVisit) {
    const geofence = checkGeofence(activeVisit.pdv, {
      latitude: coordinates.latitude ?? 0,
      longitude: coordinates.longitude ?? 0,
    });
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
  const lastIndex = lastPonto ? PONTO_SEQUENCE.indexOf(lastPonto.type) : -1;
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

  const ponto = await prisma.ponto.create({
    data: {
      userId: authReq.user.userId,
      visitId: activeVisit?.id,
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
