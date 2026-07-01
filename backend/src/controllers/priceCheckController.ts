import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseDateOnly } from '../utils/date';

const prisma = new PrismaClient();

export async function listPriceChecks(req: Request, res: Response): Promise<void> {
  const { productId, pdvId, from, to } = req.query;

  const where: any = {};
  if (productId) where.productId = productId as string;
  if (pdvId) where.visit = { pdvId: pdvId as string };

  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = new Date(toDate!.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  const priceChecks = await prisma.priceCheck.findMany({
    where,
    include: {
      product: true,
      visit: { include: { pdv: true, promotor: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: priceChecks });
}
