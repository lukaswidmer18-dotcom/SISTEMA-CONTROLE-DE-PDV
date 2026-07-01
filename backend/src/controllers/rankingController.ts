import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getPromotorRanking(_req: Request, res: Response): Promise<void> {
  const promotores = await prisma.user.findMany({ where: { role: 'PROMOTOR', active: true } });

  const result = await Promise.all(
    promotores.map(async (promotor) => {
      const [ratingAgg, routes, completedVisits] = await Promise.all([
        prisma.visitRating.aggregate({
          where: { visit: { promotorId: promotor.id } },
          _avg: { score: true },
          _count: { score: true },
        }),
        prisma.rotaVisita.findMany({ where: { promotorId: promotor.id } }),
        prisma.visit.findMany({ where: { promotorId: promotor.id, status: 'COMPLETED' } }),
      ]);

      const totalRotas = routes.length;
      const justificadas = routes.filter((r) => r.justification != null).length;
      const visitadas = routes.filter((r) => {
        const start = r.date.getTime();
        const end = start + 24 * 60 * 60 * 1000;
        return completedVisits.some((v) => v.pdvId === r.pdvId && v.startedAt.getTime() >= start && v.startedAt.getTime() < end);
      }).length;

      const avgRating = ratingAgg._avg.score;
      const ratedVisitsCount = ratingAgg._count.score;
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
    })
  );

  result.sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1));

  res.json({ success: true, data: result });
}
