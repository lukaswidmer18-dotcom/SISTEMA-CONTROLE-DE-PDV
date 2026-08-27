import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const VALID_TYPES = ['TEXTO', 'MULTIPLA_ESCOLHA', 'SIM_NAO', 'FOTO'] as const;
type ChecklistItemType = typeof VALID_TYPES[number];

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

function parseOptions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const options = value.map((v) => String(v).trim()).filter((v) => v.length > 0);
  return options.length >= 2 ? options : null;
}

// O primeiro item ativo do checklist funciona como confirmação de presença no PDV
// (ver findMissingFacadePhotoLabel em visitController.ts) — precisa continuar Foto e obrigatório,
// senão o antifraude vira um item que ninguém é forçado a preencher.
async function findFacadeGuardViolation(item: { id: string; order: number; active: boolean }): Promise<{ label: string } | null> {
  if (!item.active) return null;
  const isCurrentFirstActive = (await prisma.checklistItem.findFirst({
    where: { active: true, order: { lt: item.order } },
  })) === null;
  if (!isCurrentFirstActive) return null;

  const nextFirstActive = await prisma.checklistItem.findFirst({
    where: { active: true, id: { not: item.id }, order: { gt: item.order } },
    orderBy: { order: 'asc' },
  });
  if (nextFirstActive && (nextFirstActive.type !== 'FOTO' || !nextFirstActive.required)) {
    return { label: nextFirstActive.label };
  }
  return null;
}

export async function createChecklistItem(req: Request, res: Response): Promise<void> {
  const { label, requiredCount, type, required, options } = req.body;
  if (!label?.trim()) {
    res.status(400).json({ success: false, error: 'Descrição do item é obrigatória.' });
    return;
  }

  const resolvedType: ChecklistItemType = VALID_TYPES.includes(type) ? type : 'FOTO';

  let parsedRequiredCount = 1;
  if (resolvedType === 'FOTO') {
    parsedRequiredCount = requiredCount === undefined ? 1 : (parseRequiredCount(requiredCount) ?? NaN);
    if (!Number.isFinite(parsedRequiredCount)) {
      res.status(400).json({ success: false, error: 'Quantidade de fotos deve ser um número maior ou igual a 1.' });
      return;
    }
  }

  let parsedOptions: string[] | null = null;
  if (resolvedType === 'MULTIPLA_ESCOLHA') {
    parsedOptions = parseOptions(options);
    if (!parsedOptions) {
      res.status(400).json({ success: false, error: 'Múltipla escolha precisa de pelo menos 2 opções preenchidas.' });
      return;
    }
  }

  const count = await prisma.checklistItem.count();
  const item = await prisma.checklistItem.create({
    data: {
      label: label.trim(),
      order: count,
      type: resolvedType,
      requiredCount: parsedRequiredCount,
      required: required === undefined ? true : Boolean(required),
      options: parsedOptions ?? undefined,
    },
  });
  res.status(201).json({ success: true, data: item });
}

export async function updateChecklistItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { label, active, order, requiredCount, type, required, options } = req.body;

  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) {
    res.status(404).json({ success: false, error: 'Item não encontrado.' });
    return;
  }

  const resolvedType: ChecklistItemType = VALID_TYPES.includes(type) ? type : (item.type as ChecklistItemType);

  if ((type !== undefined && resolvedType !== 'FOTO') || (required !== undefined && !required)) {
    const firstActive = await prisma.checklistItem.findFirst({ where: { active: true }, orderBy: { order: 'asc' } });
    if (firstActive?.id === item.id) {
      res.status(400).json({
        success: false,
        error: 'Esse é o primeiro item ativo do checklist e funciona como confirmação de presença no PDV — precisa continuar como tipo Foto e obrigatório.',
      });
      return;
    }
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
  if (required !== undefined) updateData.required = Boolean(required);
  if (type !== undefined) updateData.type = resolvedType;

  if (resolvedType === 'FOTO' && requiredCount !== undefined) {
    const parsedRequiredCount = parseRequiredCount(requiredCount);
    if (parsedRequiredCount === null) {
      res.status(400).json({ success: false, error: 'Quantidade de fotos deve ser um número maior ou igual a 1.' });
      return;
    }
    updateData.requiredCount = parsedRequiredCount;
  }

  if (resolvedType === 'MULTIPLA_ESCOLHA' && options !== undefined) {
    const parsedOptions = parseOptions(options);
    if (!parsedOptions) {
      res.status(400).json({ success: false, error: 'Múltipla escolha precisa de pelo menos 2 opções preenchidas.' });
      return;
    }
    updateData.options = parsedOptions;
  } else if (type !== undefined && resolvedType !== 'MULTIPLA_ESCOLHA') {
    updateData.options = null;
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

  const violation = await findFacadeGuardViolation(item);
  if (violation) {
    res.status(400).json({
      success: false,
      error: `Desativar "${item.label}" deixaria "${violation.label}" em primeiro, mas só item Foto e obrigatório pode ser o primeiro — ele serve de confirmação de presença no PDV.`,
    });
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

  const responseCount = await prisma.checklistResponse.count({ where: { checklistItemId: id } });
  if (responseCount > 0) {
    res.status(409).json({
      success: false,
      error: `Este item já tem ${responseCount} resposta(s) registrada(s) em visitas. Inative-o em vez de excluir, pra não perder o histórico.`,
    });
    return;
  }

  const violation = await findFacadeGuardViolation(item);
  if (violation) {
    res.status(400).json({
      success: false,
      error: `Excluir "${item.label}" deixaria "${violation.label}" em primeiro, mas só item Foto e obrigatório pode ser o primeiro — ele serve de confirmação de presença no PDV.`,
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

  const allItems = await prisma.checklistItem.findMany();
  const itemsById = new Map(allItems.map((i) => [i.id, i]));
  const firstActiveId = orderedIds.find((id) => itemsById.get(id)?.active);
  const firstActiveItem = firstActiveId ? itemsById.get(firstActiveId) : undefined;
  if (firstActiveItem && (firstActiveItem.type !== 'FOTO' || !firstActiveItem.required)) {
    res.status(400).json({
      success: false,
      error: `"${firstActiveItem.label}" ficaria em primeiro no checklist, mas só item Foto e obrigatório pode ser o primeiro — ele serve de confirmação de presença no PDV.`,
    });
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
