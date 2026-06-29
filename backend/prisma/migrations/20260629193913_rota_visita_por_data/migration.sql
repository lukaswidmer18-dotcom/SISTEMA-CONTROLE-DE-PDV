/*
  Warnings:

  - You are about to drop the column `dayOfWeek` on the `rotas_visita` table. All the data in the column will be lost.
  - Added the required column `date` to the `rotas_visita` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_rotas_visita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promotorId" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rotas_visita_promotorId_fkey" FOREIGN KEY ("promotorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rotas_visita_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "pdvs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_rotas_visita" ("createdAt", "id", "order", "pdvId", "promotorId", "updatedAt") SELECT "createdAt", "id", "order", "pdvId", "promotorId", "updatedAt" FROM "rotas_visita";
DROP TABLE "rotas_visita";
ALTER TABLE "new_rotas_visita" RENAME TO "rotas_visita";
CREATE UNIQUE INDEX "rotas_visita_promotorId_pdvId_date_key" ON "rotas_visita"("promotorId", "pdvId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
