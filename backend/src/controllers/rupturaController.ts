import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

type RiskLevel = 'CRITICO' | 'ATENCAO' | 'OK';
const RISK_ORDER: Record<RiskLevel, number> = { CRITICO: 0, ATENCAO: 1, OK: 2 };

function classifyRisk(qtyGondola: number, qtyDeposito: number, lowStockThreshold: number): RiskLevel {
  if (qtyGondola === 0) return 'CRITICO';
  if (qtyGondola + qtyDeposito <= lowStockThreshold) return 'ATENCAO';
  return 'OK';
}

export async function getRupturaAlertas(req: Request, res: Response): Promise<void> {
  const lowStockThreshold = Number(req.query.limiteEstoque) || 5;

  const registros = await prisma.rupturaRegistro.findMany({
    include: {
      product: true,
      visit: { include: { pdv: true, promotor: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Mantém só o registro mais recente por PDV+produto — o que importa é o estoque atual conhecido, não o histórico
  const latestByKey = new Map<string, typeof registros[number]>();
  for (const r of registros) {
    const key = `${r.visit.pdvId}:${r.productId}`;
    if (!latestByKey.has(key)) latestByKey.set(key, r);
  }

  const alertas = Array.from(latestByKey.values()).filter((r) => r.visit.pdv !== null).map((r) => ({
    id: r.id,
    pdvId: r.visit.pdvId,
    pdvName: r.visit.pdv!.name,
    pdvCity: r.visit.pdv!.city,
    productId: r.productId,
    productName: r.product.name,
    promotorName: r.visit.promotor?.name ?? null,
    qtyGondola: r.qtyGondola,
    qtyDeposito: r.qtyDeposito,
    qtySeparadoTroca: r.qtySeparadoTroca,
    checkedAt: r.createdAt.toISOString(),
    riskLevel: classifyRisk(r.qtyGondola, r.qtyDeposito, lowStockThreshold),
  }));

  alertas.sort((a, b) => {
    const riskDiff = RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
    if (riskDiff !== 0) return riskDiff;
    return (a.qtyGondola + a.qtyDeposito) - (b.qtyGondola + b.qtyDeposito);
  });

  res.json({ success: true, data: alertas });
}
