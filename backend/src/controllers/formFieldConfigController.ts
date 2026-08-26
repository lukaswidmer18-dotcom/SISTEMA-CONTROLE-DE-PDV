import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';

const VALID_FORM_TYPES = ['VALIDADE', 'RUPTURA', 'PRECO'] as const;
const VALID_CUSTOM_FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'CURRENCY'] as const;

export async function listFormFields(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const isAdmin = authReq.user?.role === 'ADMIN';
  const { formType } = req.query;

  const where: any = {};
  if (formType) where.formType = formType;
  if (!isAdmin) where.active = true;

  const fields = await prisma.formFieldConfig.findMany({
    where,
    orderBy: [{ formType: 'asc' }, { order: 'asc' }],
  });
  res.json({ success: true, data: fields });
}

export async function createFormField(req: Request, res: Response): Promise<void> {
  const { formType, label, fieldType } = req.body;

  if (!VALID_FORM_TYPES.includes(formType)) {
    res.status(400).json({ success: false, error: 'Tipo de formulário inválido.' });
    return;
  }
  if (!label?.trim()) {
    res.status(400).json({ success: false, error: 'Nome do campo é obrigatório.' });
    return;
  }
  const resolvedFieldType = VALID_CUSTOM_FIELD_TYPES.includes(fieldType) ? fieldType : 'TEXT';

  const maxOrder = await prisma.formFieldConfig.aggregate({
    where: { formType },
    _max: { order: true },
  });

  const field = await prisma.formFieldConfig.create({
    data: {
      formType,
      fieldKey: `custom_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      label: label.trim(),
      fieldType: resolvedFieldType,
      core: false,
      lockedActive: false,
      lockedRequired: false,
      active: true,
      required: Boolean(req.body.required),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  res.status(201).json({ success: true, data: field });
}

export async function updateFormField(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { label, active, required, order } = req.body;

  const field = await prisma.formFieldConfig.findUnique({ where: { id } });
  if (!field) {
    res.status(404).json({ success: false, error: 'Campo não encontrado.' });
    return;
  }

  const updateData: any = {};
  if (label !== undefined) {
    if (!label.trim()) {
      res.status(400).json({ success: false, error: 'Nome do campo é obrigatório.' });
      return;
    }
    updateData.label = label.trim();
  }
  if (active !== undefined) {
    if (field.lockedActive && !active) {
      res.status(400).json({ success: false, error: 'Esse campo alimenta um cálculo do sistema e não pode ser desativado.' });
      return;
    }
    updateData.active = Boolean(active);
  }
  if (required !== undefined) {
    if (field.lockedRequired && !required) {
      res.status(400).json({ success: false, error: 'Esse campo é sempre obrigatório.' });
      return;
    }
    updateData.required = Boolean(required);
  }
  if (order !== undefined) updateData.order = Number(order);

  const updated = await prisma.formFieldConfig.update({ where: { id }, data: updateData });
  res.json({ success: true, data: updated });
}

export async function deleteFormField(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const field = await prisma.formFieldConfig.findUnique({ where: { id } });
  if (!field) {
    res.status(404).json({ success: false, error: 'Campo não encontrado.' });
    return;
  }
  if (field.core) {
    res.status(400).json({ success: false, error: 'Campo padrão do sistema não pode ser excluído. Desative em vez de excluir.' });
    return;
  }

  await prisma.formFieldConfig.delete({ where: { id } });
  res.json({ success: true, data: null });
}

export async function reorderFormFields(req: Request, res: Response): Promise<void> {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'string')) {
    res.status(400).json({ success: false, error: 'Lista de IDs inválida.' });
    return;
  }

  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.formFieldConfig.update({ where: { id }, data: { order: index } })
    )
  );

  const fields = await prisma.formFieldConfig.findMany({ orderBy: [{ formType: 'asc' }, { order: 'asc' }] });
  res.json({ success: true, data: fields });
}
