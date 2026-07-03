import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const VALID_ROLES = ['ADMIN', 'PROMOTOR'];

function normalizeRole(role: unknown): string {
  return VALID_ROLES.includes(role as string) ? (role as string) : 'PROMOTOR';
}

const INVALID_MONTHLY_SALARY = Symbol('INVALID_MONTHLY_SALARY');

function parseMonthlySalary(value: unknown): number | null | typeof INVALID_MONTHLY_SALARY {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : INVALID_MONTHLY_SALARY;
}

const USER_SELECT = { id: true, name: true, email: true, role: true, active: true, monthlySalary: true, createdAt: true };

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: users });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { name, email, password, role, monthlySalary } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ success: false, error: 'Nome, e-mail e senha são obrigatórios.' });
    return;
  }

  const parsedMonthlySalary = parseMonthlySalary(monthlySalary);
  if (parsedMonthlySalary === INVALID_MONTHLY_SALARY) {
    res.status(400).json({ success: false, error: 'Salário mensal deve ser um número maior ou igual a zero.' });
    return;
  }

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (exists) {
    res.status(409).json({ success: false, error: 'E-mail já cadastrado.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: normalizeRole(role),
      monthlySalary: parsedMonthlySalary,
    },
    select: USER_SELECT,
  });

  res.status(201).json({ success: true, data: user });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, email, password, role, active, monthlySalary } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    return;
  }

  if (email && email.toLowerCase().trim() !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (exists) {
      res.status(409).json({ success: false, error: 'E-mail já cadastrado.' });
      return;
    }
  }

  const parsedMonthlySalary = parseMonthlySalary(monthlySalary);
  if (parsedMonthlySalary === INVALID_MONTHLY_SALARY) {
    res.status(400).json({ success: false, error: 'Salário mensal deve ser um número maior ou igual a zero.' });
    return;
  }

  const updateData: any = {};
  if (name) updateData.name = name.trim();
  if (email) updateData.email = email.toLowerCase().trim();
  if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
  if (role !== undefined) updateData.role = normalizeRole(role);
  if (active !== undefined) updateData.active = Boolean(active);
  if (monthlySalary !== undefined) updateData.monthlySalary = parsedMonthlySalary;

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: USER_SELECT,
  });

  res.json({ success: true, data: updated });
}

export async function toggleUserActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { active: !user.active },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  res.json({ success: true, data: updated });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    return;
  }

  if (id === authReq.user.userId) {
    res.status(400).json({ success: false, error: 'Você não pode excluir seu próprio usuário.' });
    return;
  }

  const [pontosCount, visitsCount, rotasCount, ratingsCount] = await Promise.all([
    prisma.ponto.count({ where: { userId: id } }),
    prisma.visit.count({ where: { promotorId: id } }),
    prisma.rotaVisita.count({ where: { promotorId: id } }),
    prisma.visitRating.count({ where: { ratedById: id } }),
  ]);

  if (pontosCount > 0 || visitsCount > 0 || rotasCount > 0 || ratingsCount > 0) {
    res.status(409).json({
      success: false,
      error: 'Este usuário já tem histórico (visitas, pontos, rotas ou avaliações) e não pode ser excluído. Use "Desativar" para removê-lo sem perder o histórico.',
    });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.json({ success: true, data: null });
}
