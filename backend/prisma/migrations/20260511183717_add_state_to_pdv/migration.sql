-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pdvs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_pdvs" ("active", "address", "city", "createdAt", "id", "name", "updatedAt") SELECT "active", "address", "city", "createdAt", "id", "name", "updatedAt" FROM "pdvs";
DROP TABLE "pdvs";
ALTER TABLE "new_pdvs" RENAME TO "pdvs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
