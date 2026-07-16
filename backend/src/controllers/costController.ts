import { Request, Response } from 'express';
import { parseDateOnly } from '../utils/date';
import { prisma } from '../lib/prisma';

// Divisor padrão CLT (44h/semana) para converter salário mensal em custo/hora.
const MONTHLY_HOURS = 220;

function hourlyRate(monthlySalary: number | null): number | null {
  return monthlySalary != null ? monthlySalary / MONTHLY_HOURS : null;
}

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
      promotor: { select: { id: true, name: true, monthlySalary: true } },
    },
    orderBy: { completedAt: 'desc' },
  });

  const data = visits.map((v) => {
    const hourlyCost = hourlyRate(v.promotor.monthlySalary);
    const { durationHours, cost } = computeCost(v.startedAt, v.completedAt!, hourlyCost);
    const boxes = v.boxesGenerated;

    return {
      visitId: v.id,
      pdvId: v.pdv.id,
      pdvName: v.pdv.name,
      pdvCity: v.pdv.city,
      promotorId: v.promotor.id,
      promotorName: v.promotor.name,
      completedAt: v.completedAt,
      durationHours,
      hourlyCost,
      cost,
      boxes,
    };
  });

  res.json({ success: true, data });
}

export async function getPdvCostSummary(req: Request, res: Response): Promise<void> {
  const visits = await prisma.visit.findMany({
    where: buildWhere(req.query),
    include: {
      pdv: { select: { id: true, name: true, city: true } },
      promotor: { select: { id: true, monthlySalary: true } },
    },
  });

  const byPdv = new Map<string, {
    pdvId: string; pdvName: string; pdvCity: string;
    visitCount: number; totalCost: number; costKnownCount: number;
    totalBoxes: number; boxesKnownCount: number;
  }>();

  for (const v of visits) {
    const { cost } = computeCost(v.startedAt, v.completedAt!, hourlyRate(v.promotor.monthlySalary));
    const entry = byPdv.get(v.pdvId) || {
      pdvId: v.pdv.id, pdvName: v.pdv.name, pdvCity: v.pdv.city,
      visitCount: 0, totalCost: 0, costKnownCount: 0, totalBoxes: 0, boxesKnownCount: 0,
    };
    entry.visitCount += 1;
    if (cost != null) { entry.totalCost += cost; entry.costKnownCount += 1; }
    if (v.boxesGenerated != null) { entry.totalBoxes += v.boxesGenerated; entry.boxesKnownCount += 1; }
    byPdv.set(v.pdvId, entry);
  }

  const data = Array.from(byPdv.values()).map((e) => {
    const cost = e.costKnownCount > 0 ? e.totalCost : null;
    const boxes = e.boxesKnownCount > 0 ? e.totalBoxes : null;
    const costPerBox = cost != null && boxes != null && boxes > 0 ? cost / boxes : null;
    return {
      pdvId: e.pdvId,
      pdvName: e.pdvName,
      pdvCity: e.pdvCity,
      visitCount: e.visitCount,
      cost,
      boxes,
      costPerBox,
      costPartial: e.costKnownCount > 0 && e.costKnownCount < e.visitCount,
      boxesPartial: e.boxesKnownCount > 0 && e.boxesKnownCount < e.visitCount,
    };
  });

  data.sort((a, b) => {
    if (a.costPerBox == null && b.costPerBox == null) return b.visitCount - a.visitCount;
    if (a.costPerBox == null) return 1;
    if (b.costPerBox == null) return -1;
    return b.costPerBox - a.costPerBox;
  });

  res.json({ success: true, data });
}
