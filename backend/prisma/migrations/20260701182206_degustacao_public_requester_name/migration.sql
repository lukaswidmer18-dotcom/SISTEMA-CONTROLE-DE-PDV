/*
  Warnings:

  - You are about to drop the column `coordenadorId` on the `degustacao_solicitacoes` table. All the data in the column will be lost.
  - Added the required column `requesterName` to the `degustacao_solicitacoes` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_degustacao_solicitacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterName" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "productEvent" TEXT NOT NULL,
    "eventTime" TEXT NOT NULL,
    "supervisor" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_degustacao_solicitacoes" ("address", "city", "createdAt", "date", "eventTime", "id", "productEvent", "store", "supervisor") SELECT "address", "city", "createdAt", "date", "eventTime", "id", "productEvent", "store", "supervisor" FROM "degustacao_solicitacoes";
DROP TABLE "degustacao_solicitacoes";
ALTER TABLE "new_degustacao_solicitacoes" RENAME TO "degustacao_solicitacoes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
