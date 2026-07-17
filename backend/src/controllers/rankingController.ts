import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function getPromotorRanking(_req: Request, res: Response): Promise<void> {
  const promotores = await prisma.user.findMany({ where: { role: 'PROMOTOR', active: true } });
  const promotorIds = promotores.map((p) => p.id);

  // Uma query pra cada relação, em vez de 3 queries por promotor — evita N+1 quando o time cresce.
  const [visits, routes] = await Promise.all([
    prisma.visit.findMany({
      where: { promotorId: { in: promotorIds } },
      select: {
        promotorId: true,
        pdvId: true,
        status: true,
        startedAt: true,
        rating: { select: { score: true } },
      },
    }),
    prisma.rotaVisita.findMany({
      where: { promotorId: { in: promotorIds } },
      select: { promotorId: true, pdvId: true, date: true, justification: true },
    }),
  ]);

  const visitsByPromotor = new Map<string, typeof visits>();
  for (const v of visits) {
    if (!v.promotorId) continue;
    const list = visitsByPromotor.get(v.promotorId) ?? [];
    list.push(v);
    visitsByPromotor.set(v.promotorId, list);
  }

  const routesByPromotor = new Map<string, typeof routes>();
  for (const r of routes) {
    if (!r.promotorId) continue;
    const list = routesByPromotor.get(r.promotorId) ?? [];
    list.push(r);
    routesByPromotor.set(r.promotorId, list);
  }

  const result = promotores.map((promotor) => {
    const promotorVisits = visitsByPromotor.get(promotor.id) ?? [];
    const promotorRoutes = routesByPromotor.get(promotor.id) ?? [];
    const completedVisits = promotorVisits.filter((v) => v.status === 'COMPLETED');
    const ratedScores = promotorVisits.map((v) => v.rating?.score).filter((s): s is number => s != null);

    const totalRotas = promotorRoutes.length;
    const justificadas = promotorRoutes.filter((r) => r.justification != null).length;
    const visitadas = promotorRoutes.filter((r) => {
      const start = r.date.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      return completedVisits.some((v) => v.pdvId === r.pdvId && v.startedAt.getTime() >= start && v.startedAt.getTime() < end);
    }).length;

    const avgRating = ratedScores.length > 0 ? ratedScores.reduce((sum, s) => sum + s, 0) / ratedScores.length : null;
    const ratedVisitsCount = ratedScores.length;
    const coverageRate = totalRotas > 0 ? visitadas / totalRotas : null;
    const justificationRate = totalRotas > 0 ? justificadas / totalRotas : 0;

    const components: { value: number; weight: number }[] = [];
    if (avgRating != null) components.push({ value: (avgRating / 5) * 100, weight: 0.5 });
    if (coverageRate != null) components.push({ value: coverageRate * 100, weight: 0.3 });
    components.push({ value: (1 - justificationRate) * 100, weight: 0.2 });

    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    const finalScore = totalWeight > 0
      ? components.reduce((sum, c) => sum + c.value * c.weight, 0) / totalWeight
      : null;

    return {
      promotorId: promotor.id,
      promotorName: promotor.name,
      avgRating,
      ratedVisitsCount,
      totalRotas,
      justificadas,
      justificationRate,
      visitadas,
      coverageRate,
      finalScore,
    };
  });

  result.sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1));

  res.json({ success: true, data: result });
}
