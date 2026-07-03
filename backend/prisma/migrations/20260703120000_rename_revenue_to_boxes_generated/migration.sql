-- Faturamento (R$) vira numero de caixas (contagem inteira); os 4 valores de teste existentes nao tem conversao valida entre unidades, entao sao descartados.
ALTER TABLE "visits" ADD COLUMN "boxesGenerated" INTEGER;
ALTER TABLE "visits" DROP COLUMN "revenueGenerated";
