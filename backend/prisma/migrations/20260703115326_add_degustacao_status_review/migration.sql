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
    "justification" TEXT NOT NULL DEFAULT '',
    "documentPath" TEXT,
    "documentFileName" TEXT,
    "documentOriginalName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_degustacao_solicitacoes" ("address", "city", "createdAt", "date", "documentFileName", "documentOriginalName", "documentPath", "eventTime", "id", "justification", "productEvent", "requesterName", "store", "supervisor") SELECT "address", "city", "createdAt", "date", "documentFileName", "documentOriginalName", "documentPath", "eventTime", "id", "justification", "productEvent", "requesterName", "store", "supervisor" FROM "degustacao_solicitacoes";
DROP TABLE "degustacao_solicitacoes";
ALTER TABLE "new_degustacao_solicitacoes" RENAME TO "degustacao_solicitacoes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
