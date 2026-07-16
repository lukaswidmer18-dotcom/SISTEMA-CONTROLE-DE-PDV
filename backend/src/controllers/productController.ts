import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

function parsePdvIds(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.filter((id) => typeof id === 'string');
  if (typeof value === 'string' && value) return [value];
  return [];
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const isAdmin = authReq.user?.role === 'ADMIN';
  const { pdvId } = req.query;

  const where: any = isAdmin ? {} : { active: true };
  if (pdvId) where.pdvs = { some: { id: pdvId as string } };

  const products = await prisma.product.findMany({
    where,
    include: { pdvs: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: products });
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const { name, brand, sku, pdvIds } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
    return;
  }

  const parsedPdvIds = parsePdvIds(pdvIds) || [];

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      brand: brand?.trim() || '',
      sku: sku?.trim() || '',
      pdvs: { connect: parsedPdvIds.map((id) => ({ id })) },
    },
    include: { pdvs: { select: { id: true, name: true } } },
  });
  res.status(201).json({ success: true, data: product });
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, brand, sku, active, pdvIds } = req.body;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    res.status(404).json({ success: false, error: 'Produto não encontrado.' });
    return;
  }

  const updateData: any = {};
  if (name) updateData.name = name.trim();
  if (brand !== undefined) updateData.brand = brand.trim();
  if (sku !== undefined) updateData.sku = sku.trim();
  if (active !== undefined) updateData.active = Boolean(active);

  const parsedPdvIds = parsePdvIds(pdvIds);
  if (parsedPdvIds !== undefined) {
    updateData.pdvs = { set: parsedPdvIds.map((pdvId) => ({ id: pdvId })) };
  }

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { pdvs: { select: { id: true, name: true } } },
  });
  res.json({ success: true, data: updated });
}

export async function toggleProductActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    res.status(404).json({ success: false, error: 'Produto não encontrado.' });
    return;
  }

  const updated = await prisma.product.update({ where: { id }, data: { active: !product.active } });
  res.json({ success: true, data: updated });
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    res.status(404).json({ success: false, error: 'Produto não encontrado.' });
    return;
  }

  const [rupturaCount, priceCheckCount, validityCount] = await Promise.all([
    prisma.rupturaRegistro.count({ where: { productId: id } }),
    prisma.priceCheck.count({ where: { productId: id } }),
    prisma.validity.count({ where: { productId: id } }),
  ]);

  if (rupturaCount + priceCheckCount + validityCount > 0) {
    res.status(409).json({
      success: false,
      error: 'Produto tem histórico de visitas registrado e não pode ser excluído. Desative-o em vez de excluir.',
    });
    return;
  }

  await prisma.product.delete({ where: { id } });
  res.json({ success: true, data: null });
}
