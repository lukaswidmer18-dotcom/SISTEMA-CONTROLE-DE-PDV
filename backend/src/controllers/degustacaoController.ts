import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseDateOnly } from '../utils/date';

const prisma = new PrismaClient();

export async function createDegustacaoSolicitacao(req: Request, res: Response): Promise<void> {
  const { requesterName, date, city, address, store, productEvent, eventTime, supervisor } = req.body;

  if (!requesterName || !date || !city || !address || !store || !productEvent || !eventTime) {
    res.status(400).json({
      success: false,
      error: 'Nome do solicitante, data, cidade, endereço, loja, produto/evento e horário são obrigatórios.',
    });
    return;
  }

  const parsedDate = parseDateOnly(date);
  if (!parsedDate) {
    res.status(400).json({ success: false, error: 'Data inválida. Use o formato AAAA-MM-DD.' });
    return;
  }

  const solicitacao = await prisma.degustacaoSolicitacao.create({
    data: {
      requesterName: String(requesterName).trim(),
      date: parsedDate,
      city: String(city).trim(),
      address: String(address).trim(),
      store: String(store).trim(),
      productEvent: String(productEvent).trim(),
      eventTime: String(eventTime).trim(),
      supervisor: typeof supervisor === 'string' ? supervisor.trim() : '',
    },
  });

  res.status(201).json({ success: true, data: solicitacao });
}

export async function listMyDegustacaoSolicitacoes(req: Request, res: Response): Promise<void> {
  const nome = typeof req.query.nome === 'string' ? req.query.nome.trim() : '';
  if (!nome) {
    res.status(400).json({ success: false, error: 'Informe o nome do solicitante.' });
    return;
  }

  const solicitacoes = await prisma.degustacaoSolicitacao.findMany({
    where: { requesterName: { contains: nome } },
    orderBy: { date: 'desc' },
  });

  res.json({ success: true, data: solicitacoes });
}

export async function listAllDegustacaoSolicitacoes(req: Request, res: Response): Promise<void> {
  const { from, to, city } = req.query;

  const where: any = {};
  if (city) where.city = { contains: city as string };

  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date.gte = fromDate;
    if (toDate) where.date.lte = toDate;
  }

  const solicitacoes = await prisma.degustacaoSolicitacao.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  res.json({ success: true, data: solicitacoes });
}
