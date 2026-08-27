import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const VALID_FORM_TYPES = ['VALIDADE', 'RUPTURA', 'PRECO'] as const;

export async function listFormTypeConfigs(_req: Request, res: Response): Promise<void> {
  const configs = await prisma.formTypeConfig.findMany();
  res.json({ success: true, data: configs });
}

export async function updateFormTypeConfig(req: Request, res: Response): Promise<void> {
  const { formType } = req.params;
  const { title, description } = req.body;

  if (!VALID_FORM_TYPES.includes(formType as any)) {
    res.status(400).json({ success: false, error: 'Tipo de formulário inválido.' });
    return;
  }
  if (!title?.trim()) {
    res.status(400).json({ success: false, error: 'Título é obrigatório.' });
    return;
  }

  const updated = await prisma.formTypeConfig.update({
    where: { formType },
    data: { title: title.trim(), description: description !== undefined ? String(description).trim() : undefined },
  });
  res.json({ success: true, data: updated });
}
