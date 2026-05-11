import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listPDVs(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const isAdmin = authReq.user?.role === 'ADMIN';

  const pdvs = await prisma.pDV.findMany({
    where: isAdmin ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: pdvs });
}

export async function createPDV(req: Request, res: Response): Promise<void> {
  const { name, address, city, state } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
    return;
  }

  const pdv = await prisma.pDV.create({
    data: { 
      name: name.trim(), 
      address: address?.trim() || '', 
      city: city?.trim() || '',
      state: state?.trim()?.toUpperCase() || ''
    },
  });
  res.status(201).json({ success: true, data: pdv });
}

export async function updatePDV(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, address, city, state, active } = req.body;

  const pdv = await prisma.pDV.findUnique({ where: { id } });
  if (!pdv) {
    res.status(404).json({ success: false, error: 'PDV não encontrado.' });
    return;
  }

  const updateData: any = {};
  if (name) updateData.name = name.trim();
  if (address !== undefined) updateData.address = address.trim();
  if (city !== undefined) updateData.city = city.trim();
  if (state !== undefined) updateData.state = state.trim().toUpperCase();
  if (active !== undefined) updateData.active = Boolean(active);

  const updated = await prisma.pDV.update({ where: { id }, data: updateData });
  res.json({ success: true, data: updated });
}

export async function togglePDVActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const pdv = await prisma.pDV.findUnique({ where: { id } });
  if (!pdv) {
    res.status(404).json({ success: false, error: 'PDV não encontrado.' });
    return;
  }

  const updated = await prisma.pDV.update({ where: { id }, data: { active: !pdv.active } });
  res.json({ success: true, data: updated });
}
