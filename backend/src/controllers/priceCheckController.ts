import { Request, Response } from 'express';
import { parseDateOnly } from '../utils/date';
import { prisma } from '../lib/prisma';
import { deleteFromBlob } from '../utils/blobStorage';

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

export async function deletePriceCheckAdmin(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const priceCheck = await prisma.priceCheck.findUnique({ where: { id } });
  if (!priceCheck) {
    res.status(404).json({ success: false, error: 'Registro de preço não encontrado.' });
    return;
  }

  await prisma.priceCheck.delete({ where: { id } });
  if (priceCheck.photoPath) {
    await deleteFromBlob(priceCheck.photoPath);
  }

  res.json({ success: true, data: null });
}
