import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isValidScore(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value < 0.5 || value > 5) return false;
  return Number.isInteger(value * 2);
}

export async function rateVisit(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { visitId } = req.params;
  const { score } = req.body;

  if (!isValidScore(score)) {
    res.status(400).json({ success: false, error: 'Nota inválida. Use de 0.5 a 5, em incrementos de 0.5.' });
    return;
  }

  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) {
    res.status(404).json({ success: false, error: 'Visita não encontrada.' });
    return;
  }
  if (visit.status !== 'COMPLETED') {
    res.status(422).json({ success: false, error: 'Só é possível avaliar visitas concluídas.' });
    return;
  }

  const rating = await prisma.visitRating.upsert({
    where: { visitId },
    create: { visitId, score, ratedById: authReq.user.userId },
    update: { score, ratedById: authReq.user.userId, ratedAt: new Date() },
  });

  res.json({ success: true, data: rating });
}
