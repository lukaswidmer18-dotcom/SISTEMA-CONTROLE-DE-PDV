import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listProducts(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const isAdmin = authReq.user?.role === 'ADMIN';

  const products = await prisma.product.findMany({
    where: isAdmin ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: products });
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const { name, brand, sku } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
    return;
  }

  const product = await prisma.product.create({
    data: { name: name.trim(), brand: brand?.trim() || '', sku: sku?.trim() || '' },
  });
  res.status(201).json({ success: true, data: product });
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, brand, sku, active } = req.body;

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

  const updated = await prisma.product.update({ where: { id }, data: updateData });
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
