import { Request, Response } from 'express';
import { parseDateOnly, todayDateOnly } from '../utils/date';
import { prisma } from '../lib/prisma';

type CoverageStatus = 'NAO_ATENDIDO' | 'EM_ATENDIMENTO' | 'ATENDIDO';

export async function getCoverageToday(req: Request, res: Response): Promise<void> {
  const date = parseDateOnly(req.query.date) ?? todayDateOnly();
  const startOfDay = date;
  const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);

  const routes = await prisma.rotaVisita.findMany({
    where: { date },
    include: {
      pdv: true,
      promotor: { select: { id: true, name: true } },
    },
    orderBy: { order: 'asc' },
  });

  const visits = await prisma.visit.findMany({
    where: { startedAt: { gte: startOfDay, lte: endOfDay } },
  });

  const coverage = routes.map((r) => {
    const visit = visits.find((v) => v.promotorId === r.promotorId && v.pdvId === r.pdvId);
    let status: CoverageStatus = 'NAO_ATENDIDO';
    let checkin: { latitude: number | null; longitude: number | null; time: string } | null = null;
    if (visit) {
      status = visit.status === 'COMPLETED' ? 'ATENDIDO' : 'EM_ATENDIMENTO';
      checkin = { latitude: visit.latitudeStart, longitude: visit.longitudeStart, time: visit.startedAt.toISOString() };
    }
    return {
      rotaId: r.id,
      pdvId: r.pdvId,
      pdvName: r.pdv.name,
      pdvCity: r.pdv.city,
      latitude: r.pdv.latitude,
      longitude: r.pdv.longitude,
      promotorId: r.promotorId,
      promotorName: r.promotor.name,
      status,
      checkin,
    };
  });

  res.json({ success: true, data: coverage });
}

export async function getPdvsNaoVisitados(_req: Request, res: Response): Promise<void> {
  const pdvs = await prisma.pDV.findMany({
    where: { active: true },
    include: {
      visits: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
    },
  });

  const now = Date.now();
  const result = pdvs.map((pdv) => {
    const lastVisit = pdv.visits[0];
    const lastVisitDate = lastVisit?.completedAt ?? null;
    const daysSinceLastVisit = lastVisitDate
      ? Math.floor((now - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      pdvId: pdv.id,
      name: pdv.name,
      city: pdv.city,
      lastVisitDate: lastVisitDate ? lastVisitDate.toISOString() : null,
      daysSinceLastVisit,
    };
  });

  result.sort((a, b) => {
    if (a.daysSinceLastVisit === null && b.daysSinceLastVisit === null) return 0;
    if (a.daysSinceLastVisit === null) return -1;
    if (b.daysSinceLastVisit === null) return 1;
    return b.daysSinceLastVisit - a.daysSinceLastVisit;
  });

  res.json({ success: true, data: result });
}
