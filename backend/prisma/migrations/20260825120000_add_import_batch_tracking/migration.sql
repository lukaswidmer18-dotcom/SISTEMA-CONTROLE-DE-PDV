-- Rastreia qual import (em massa) criou/atualizou cada PDV/Produto, pra permitir
-- desfazer só um import específico em vez de apagar tudo.
ALTER TABLE "pdvs" ADD COLUMN "importBatchId" TEXT;
ALTER TABLE "pdvs" ADD COLUMN "importedAt" TIMESTAMP(3);
CREATE INDEX "pdvs_importBatchId_idx" ON "pdvs"("importBatchId");

ALTER TABLE "products" ADD COLUMN "importBatchId" TEXT;
ALTER TABLE "products" ADD COLUMN "importedAt" TIMESTAMP(3);
CREATE INDEX "products_importBatchId_idx" ON "products"("importBatchId");
