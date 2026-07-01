import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseDateOnly } from '../utils/date';

const prisma = new PrismaClient();

function buildWhere(query: Request['query']) {
  const { promotorId, pdvId, from, to } = query;
  const where: any = { status: 'COMPLETED' };
  if (promotorId) where.promotorId = promotorId as string;
  if (pdvId) where.pdvId = pdvId as string;

  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  if (fromDate || toDate) {
    where.completedAt = {};
    if (fromDate) where.completedAt.gte = fromDate;
    if (toDate) where.completedAt.lte = new Date(toDate!.getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  return where;
}

function computeCost(startedAt: Date, completedAt: Date, hourlyCost: number | null) {
  const durationHours = (completedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
  const cost = hourlyCost != null ? durationHours * hourlyCost : null;
  return { durationHours, cost };
}

export async function getVisitCosts(req: Request, res: Response): Promise<void> {
  const visits = await prisma.visit.findMany({
    where: buildWhere(req.query),
    include: {
      pdv: { select: { id: true, name: true, city: true } },
      promotor: { select: { id: true, name: true, hourlyCost: true } },
    },
    orderBy: { completedAt: 'desc' },
  });

  const data = visits.map((v) => {
    const { durationHours, cost } = computeCost(v.startedAt, v.completedAt!, v.promotor.hourlyCost);
    const revenue = v.revenueGenerated;
    const net = cost != null && revenue != null ? revenue - cost : null;
    const ratio = cost != null && cost > 0 && revenue != null ? revenue / cost : null;

    return {
      visitId: v.id,
      pdvId: v.pdv.id,
      pdvName: v.pdv.name,
      pdvCity: v.pdv.city,
      promotorId: v.promotor.id,
      promotorName: v.promotor.name,
      completedAt: v.completedAt,
      durationHours,
      hourlyCost: v.promotor.hourlyCost,
      cost,
      revenue,
      net,
      ratio,
    };
  });

  res.json({ success: true, data });
}

export async function getPdvCostSummary(req: Request, res: Response): Promise<void> {
  const visits = await prisma.visit.findMany({
    where: buildWhere(req.query),
    include: {
      pdv: { select: { id: true, name: true, city: true } },
      promotor: { select: { id: true, hourlyCost: true } },
    },
  });

  const byPdv = new Map<string, {
    pdvId: string; pdvName: string; pdvCity: string;
    visitCount: number; totalCost: number; costKnownCount: number;
    totalRevenue: number; revenueKnownCount: number;
  }>();

  for (const v of visits) {
    const { cost } = computeCost(v.startedAt, v.completedAt!, v.promotor.hourlyCost);
    const entry = byPdv.get(v.pdvId) || {
      pdvId: v.pdv.id, pdvName: v.pdv.name, pdvCity: v.pdv.city,
      visitCount: 0, totalCost: 0, costKnownCount: 0, totalRevenue: 0, revenueKnownCount: 0,
    };
    entry.visitCount += 1;
    if (cost != null) { entry.totalCost += cost; entry.costKnownCount += 1; }
    if (v.revenueGenerated != null) { entry.totalRevenue += v.revenueGenerated; entry.revenueKnownCount += 1; }
    byPdv.set(v.pdvId, entry);
  }

  const data = Array.from(byPdv.values()).map((e) => {
    const cost = e.costKnownCount > 0 ? e.totalCost : null;
    const revenue = e.revenueKnownCount > 0 ? e.totalRevenue : null;
    const net = cost != null && revenue != null ? revenue - cost : null;
    const ratio = cost != null && cost > 0 && revenue != null ? revenue / cost : null;
    return {
      pdvId: e.pdvId,
      pdvName: e.pdvName,
      pdvCity: e.pdvCity,
      visitCount: e.visitCount,
      cost,
      revenue,
      net,
      ratio,
      costPartial: e.costKnownCount > 0 && e.costKnownCount < e.visitCount,
      revenuePartial: e.revenueKnownCount > 0 && e.revenueKnownCount < e.visitCount,
    };
  });

  data.sort((a, b) => {
    if (a.ratio == null && b.ratio == null) return b.visitCount - a.visitCount;
    if (a.ratio == null) return 1;
    if (b.ratio == null) return -1;
    return a.ratio - b.ratio;
  });

  res.json({ success: true, data });
}
