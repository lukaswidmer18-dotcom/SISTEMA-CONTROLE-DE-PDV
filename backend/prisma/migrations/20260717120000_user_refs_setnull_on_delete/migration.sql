-- DropForeignKey
ALTER TABLE "pontos" DROP CONSTRAINT "pontos_userId_fkey";

-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_promotorId_fkey";

-- DropForeignKey
ALTER TABLE "visit_ratings" DROP CONSTRAINT "visit_ratings_ratedById_fkey";

-- DropForeignKey
ALTER TABLE "rotas_visita" DROP CONSTRAINT "rotas_visita_promotorId_fkey";

-- AlterTable
ALTER TABLE "pontos" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "visits" ALTER COLUMN "promotorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "visit_ratings" ALTER COLUMN "ratedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "rotas_visita" ALTER COLUMN "promotorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "pontos" ADD CONSTRAINT "pontos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_promotorId_fkey" FOREIGN KEY ("promotorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_ratedById_fkey" FOREIGN KEY ("ratedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas_visita" ADD CONSTRAINT "rotas_visita_promotorId_fkey" FOREIGN KEY ("promotorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
