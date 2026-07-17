-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_pdvId_fkey";

-- DropForeignKey
ALTER TABLE "rotas_visita" DROP CONSTRAINT "rotas_visita_pdvId_fkey";

-- AlterTable
ALTER TABLE "visits" ALTER COLUMN "pdvId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "rotas_visita" ALTER COLUMN "pdvId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "pdvs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas_visita" ADD CONSTRAINT "rotas_visita_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "pdvs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
