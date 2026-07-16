import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function listChecklistItems(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const isAdmin = authReq.user?.role === 'ADMIN';

  const items = await prisma.checklistItem.findMany({
    where: isAdmin ? {} : { active: true },
    orderBy: { order: 'asc' },
  });
  res.json({ success: true, data: items });
}

function parseRequiredCount(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.round(parsed) : null;
}

export async function createChecklistItem(req: Request, res: Response): Promise<void> {
  const { label, requiredCount } = req.body;
  if (!label?.trim()) {
    res.status(400).json({ success: false, error: 'Descrição do item é obrigatória.' });
    return;
  }

  const parsedRequiredCount = requiredCount === undefined ? 1 : parseRequiredCount(requiredCount);
  if (parsedRequiredCount === null) {
    res.status(400).json({ success: false, error: 'Quantidade de fotos deve ser um número maior ou igual a 1.' });
    return;
  }

  const count = await prisma.checklistItem.count();
  const item = await prisma.checklistItem.create({
    data: { label: label.trim(), order: count, requiredCount: parsedRequiredCount },
  });
  res.status(201).json({ success: true, data: item });
}

export async function updateChecklistItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { label, active, order, requiredCount } = req.body;

  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) {
    res.status(404).json({ success: false, error: 'Item não encontrado.' });
    return;
  }

  const updateData: any = {};
  if (label !== undefined) {
    if (!label.trim()) {
      res.status(400).json({ success: false, error: 'Descrição do item é obrigatória.' });
      return;
    }
    updateData.label = label.trim();
  }
  if (active !== undefined) updateData.active = Boolean(active);
  if (order !== undefined) updateData.order = Number(order);
  if (requiredCount !== undefined) {
    const parsedRequiredCount = parseRequiredCount(requiredCount);
    if (parsedRequiredCount === null) {
      res.status(400).json({ success: false, error: 'Quantidade de fotos deve ser um número maior ou igual a 1.' });
      return;
    }
    updateData.requiredCount = parsedRequiredCount;
  }

  const updated = await prisma.checklistItem.update({ where: { id }, data: updateData });
  res.json({ success: true, data: updated });
}

export async function toggleChecklistItemActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) {
    res.status(404).json({ success: false, error: 'Item não encontrado.' });
    return;
  }

  const updated = await prisma.checklistItem.update({ where: { id }, data: { active: !item.active } });
  res.json({ success: true, data: updated });
}

export async function deleteChecklistItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) {
    res.status(404).json({ success: false, error: 'Item não encontrado.' });
    return;
  }

  const photoCount = await prisma.photo.count({ where: { checklistItemId: id } });
  if (photoCount > 0) {
    res.status(409).json({
      success: false,
      error: `Este item já tem ${photoCount} foto(s) vinculada(s) em visitas. Inative-o em vez de excluir, pra não perder o histórico.`,
    });
    return;
  }

  await prisma.checklistItem.delete({ where: { id } });
  res.json({ success: true, data: null });
}

export async function reorderChecklistItems(req: Request, res: Response): Promise<void> {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'string')) {
    res.status(400).json({ success: false, error: 'Lista de IDs inválida.' });
    return;
  }

  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.checklistItem.update({ where: { id }, data: { order: index } })
    )
  );

  const items = await prisma.checklistItem.findMany({ orderBy: { order: 'asc' } });
  res.json({ success: true, data: items });
}
