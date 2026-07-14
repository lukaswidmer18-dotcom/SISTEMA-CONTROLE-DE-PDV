import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseDateOnly, todayDateOnly } from '../utils/date';
import { AuthRequest } from '../middleware/auth';
import { uploadToBlob, deleteFromBlob } from '../utils/blobStorage';

const prisma = new PrismaClient();

const MIN_LEAD_DAYS = 10;
const DEGUSTACAO_STATUSES = ['pendente', 'aprovada', 'reprovada'] as const;
type DegustacaoStatus = (typeof DEGUSTACAO_STATUSES)[number];

export async function createDegustacaoSolicitacao(req: Request, res: Response): Promise<void> {
  const { requesterName, date, city, address, store, productEvent, eventTime, supervisor, sellerName, justification } = req.body;

  if (!requesterName || !date || !city || !address || !store || !productEvent || !eventTime || !supervisor || !sellerName || !justification) {
    res.status(400).json({
      success: false,
      error: 'Nome do solicitante, data, cidade, endereço, loja, produto/evento, horário, supervisor, vendedor e justificativa são obrigatórios.',
    });
    return;
  }

  const parsedDate = parseDateOnly(date);
  if (!parsedDate) {
    res.status(400).json({ success: false, error: 'Data inválida. Use o formato AAAA-MM-DD.' });
    return;
  }

  const minDate = new Date(todayDateOnly().getTime() + MIN_LEAD_DAYS * 24 * 60 * 60 * 1000);
  if (parsedDate.getTime() < minDate.getTime()) {
    res.status(422).json({
      success: false,
      error: `A degustação precisa ser solicitada com pelo menos ${MIN_LEAD_DAYS} dias de antecedência. Data mínima: ${minDate.toISOString().slice(0, 10)}.`,
    });
    return;
  }

  const documentData = req.file
    ? await uploadToBlob(req.file.buffer, req.file.originalname, 'degustacao-docs')
    : null;

  const solicitacao = await prisma.degustacaoSolicitacao.create({
    data: {
      requesterName: String(requesterName).trim(),
      date: parsedDate,
      city: String(city).trim(),
      address: String(address).trim(),
      store: String(store).trim(),
      productEvent: String(productEvent).trim(),
      eventTime: String(eventTime).trim(),
      supervisor: String(supervisor).trim(),
      sellerName: String(sellerName).trim(),
      justification: String(justification).trim(),
      ...(documentData
        ? {
            documentPath: documentData.url,
            documentFileName: documentData.pathname,
            documentOriginalName: req.file!.originalname,
          }
        : {}),
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
  const { from, to, city, requesterName, store } = req.query;

  const where: any = {};
  if (city) where.city = { contains: city as string };
  if (requesterName) where.requesterName = { contains: requesterName as string };
  if (store) where.store = { contains: store as string };

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

export async function updateDegustacaoSolicitacaoStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  if (!DEGUSTACAO_STATUSES.includes(status)) {
    res.status(400).json({ success: false, error: 'Status inválido. Use aprovada ou reprovada.' });
    return;
  }
  if (status === 'pendente') {
    res.status(400).json({ success: false, error: 'Não é possível reverter para pendente.' });
    return;
  }

  const existing = await prisma.degustacaoSolicitacao.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Solicitação de degustação não encontrada.' });
    return;
  }

  const solicitacao = await prisma.degustacaoSolicitacao.update({
    where: { id },
    data: {
      status: status as DegustacaoStatus,
      reviewedBy: req.user?.email ?? null,
      reviewedAt: new Date(),
    },
  });

  res.json({ success: true, data: solicitacao });
}

export async function updateDegustacaoSolicitacao(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { requesterName, date, city, address, store, productEvent, eventTime, supervisor, sellerName, justification } = req.body;

  if (!requesterName || !date || !city || !address || !store || !productEvent || !eventTime || !supervisor || !sellerName || !justification) {
    res.status(400).json({
      success: false,
      error: 'Nome do solicitante, data, cidade, endereço, loja, produto/evento, horário, supervisor, vendedor e justificativa são obrigatórios.',
    });
    return;
  }

  const parsedDate = parseDateOnly(date);
  if (!parsedDate) {
    res.status(400).json({ success: false, error: 'Data inválida. Use o formato AAAA-MM-DD.' });
    return;
  }

  const existing = await prisma.degustacaoSolicitacao.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Solicitação de degustação não encontrada.' });
    return;
  }

  const solicitacao = await prisma.degustacaoSolicitacao.update({
    where: { id },
    data: {
      requesterName: String(requesterName).trim(),
      date: parsedDate,
      city: String(city).trim(),
      address: String(address).trim(),
      store: String(store).trim(),
      productEvent: String(productEvent).trim(),
      eventTime: String(eventTime).trim(),
      supervisor: String(supervisor).trim(),
      sellerName: String(sellerName).trim(),
      justification: String(justification).trim(),
    },
  });

  res.json({ success: true, data: solicitacao });
}

export async function deleteDegustacaoSolicitacao(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.degustacaoSolicitacao.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Solicitação de degustação não encontrada.' });
    return;
  }

  if (existing.documentPath) {
    await deleteFromBlob(existing.documentPath);
  }

  await prisma.degustacaoSolicitacao.delete({ where: { id } });

  res.json({ success: true });
}
