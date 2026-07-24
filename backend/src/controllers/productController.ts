import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { buildProductImportTemplate, parseProductImportWorkbook } from '../utils/productImport';

function parsePdvIds(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.filter((id) => typeof id === 'string');
  if (typeof value === 'string' && value) return [value];
  return [];
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const isAdmin = authReq.user?.role === 'ADMIN';
  const { pdvId } = req.query;

  const where: any = isAdmin ? {} : { active: true };
  if (pdvId) where.pdvs = { some: { id: pdvId as string } };

  const products = await prisma.product.findMany({
    where,
    include: { pdvs: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: products });
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const { name, brand, sku, pdvIds } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
    return;
  }

  const parsedPdvIds = parsePdvIds(pdvIds) || [];

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      brand: brand?.trim() || '',
      sku: sku?.trim() || '',
      pdvs: { connect: parsedPdvIds.map((id) => ({ id })) },
    },
    include: { pdvs: { select: { id: true, name: true } } },
  });
  res.status(201).json({ success: true, data: product });
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, brand, sku, active, pdvIds } = req.body;

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

  const parsedPdvIds = parsePdvIds(pdvIds);
  if (parsedPdvIds !== undefined) {
    updateData.pdvs = { set: parsedPdvIds.map((pdvId) => ({ id: pdvId })) };
  }

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { pdvs: { select: { id: true, name: true } } },
  });
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

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    res.status(404).json({ success: false, error: 'Produto não encontrado.' });
    return;
  }

  const [rupturaCount, priceCheckCount, validityCount] = await Promise.all([
    prisma.rupturaRegistro.count({ where: { productId: id } }),
    prisma.priceCheck.count({ where: { productId: id } }),
    prisma.validity.count({ where: { productId: id } }),
  ]);

  if (rupturaCount + priceCheckCount + validityCount > 0) {
    res.status(409).json({
      success: false,
      error: 'Produto tem histórico de visitas registrado e não pode ser excluído. Desative-o em vez de excluir.',
    });
    return;
  }

  await prisma.product.delete({ where: { id } });
  res.json({ success: true, data: null });
}

export async function downloadProductImportTemplate(req: Request, res: Response): Promise<void> {
  const pdvs = await prisma.pDV.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { name: true, city: true },
  });

  const buffer = await buildProductImportTemplate(pdvs);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="modelo-importacao-produtos.xlsx"');
  res.send(buffer);
}

export async function importProducts(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'Selecione um arquivo .xlsx para importar.' });
    return;
  }

  const pdvs = await prisma.pDV.findMany({ where: { active: true }, select: { id: true, name: true } });

  let parsed;
  try {
    parsed = await parseProductImportWorkbook(req.file.buffer, pdvs);
  } catch (err) {
    res.status(400).json({ success: false, error: 'Não foi possível ler o arquivo. Confirme que é um .xlsx válido.' });
    return;
  }

  const messages = [...parsed.messages];
  let created = 0;
  let updated = 0;

  for (const row of parsed.rows) {
    try {
      const existing = await prisma.product.findFirst({
        where: {
          name: { equals: row.name, mode: 'insensitive' },
          brand: { equals: row.brand, mode: 'insensitive' },
        },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            sku: row.sku,
            active: row.active,
            pdvs: { set: row.pdvIds.map((id) => ({ id })) },
          },
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            name: row.name,
            brand: row.brand,
            sku: row.sku,
            active: row.active,
            pdvs: { connect: row.pdvIds.map((id) => ({ id })) },
          },
        });
        created++;
      }
    } catch (err) {
      messages.push({ row: row.rowNumber, type: 'error', text: 'Erro ao salvar essa linha. Tente novamente.' });
    }
  }

  res.json({
    success: true,
    data: { totalRows: parsed.rows.length, created, updated, messages },
  });
}
