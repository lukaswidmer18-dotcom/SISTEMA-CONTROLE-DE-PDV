import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const prisma = new PrismaClient();

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ success: false, error: 'E-mail ou senha inválidos.' });
    return;
  }

  if (!user.active) {
    res.status(403).json({ success: false, error: 'Usuário inativo. Entre em contato com o administrador.' });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: '12h' }
  );

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const user = await prisma.user.findUnique({
    where: { id: authReq.user.userId },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  if (!user || !user.active) {
    res.status(401).json({ success: false, error: 'Usuário não encontrado ou inativo.' });
    return;
  }

  res.json({ success: true, data: user });
}
