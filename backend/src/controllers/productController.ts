import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
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

export async function listProductImportBatches(req: Request, res: Response): Promise<void> {
  const batches = await prisma.product.groupBy({
    by: ['importBatchId'],
    where: { importBatchId: { not: null } },
    _count: { _all: true },
    _max: { importedAt: true },
    orderBy: { _max: { importedAt: 'desc' } },
  });

  res.json({
    success: true,
    data: batches.map((b) => ({
      batchId: b.importBatchId,
      count: b._count._all,
      importedAt: b._max.importedAt,
    })),
  });
}

export async function deleteProductImportBatch(req: Request, res: Response): Promise<void> {
  const { batchId } = req.params;

  // Mesma regra do delete individual: produto com histórico de ruptura/preço/validade
  // fica protegido (RESTRICT no banco) — o excluir em massa só remove quem não tem histórico.
  const [withRuptura, withPriceCheck, withValidity] = await Promise.all([
    prisma.rupturaRegistro.groupBy({ by: ['productId'] }),
    prisma.priceCheck.groupBy({ by: ['productId'] }),
    prisma.validity.groupBy({ by: ['productId'] }),
  ]);
  const historyIds = new Set([...withRuptura, ...withPriceCheck, ...withValidity].map((r) => r.productId));

  const batchProducts = await prisma.product.findMany({ where: { importBatchId: batchId }, select: { id: true } });
  const deletableIds = batchProducts.map((p) => p.id).filter((id) => !historyIds.has(id));
  const skippedWithHistory = batchProducts.length - deletableIds.length;

  const { count } = await prisma.product.deleteMany({ where: { id: { in: deletableIds } } });

  res.json({ success: true, data: { deletedCount: count, skippedWithHistory } });
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
  const importBatchId = randomUUID();
  const importedAt = new Date();

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
            importBatchId,
            importedAt,
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
            importBatchId,
            importedAt,
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
