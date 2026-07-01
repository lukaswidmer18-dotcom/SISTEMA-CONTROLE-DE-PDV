-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_checklist_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_checklist_items" ("active", "createdAt", "id", "label", "order", "updatedAt") SELECT "active", "createdAt", "id", "label", "order", "updatedAt" FROM "checklist_items";
DROP TABLE "checklist_items";
ALTER TABLE "new_checklist_items" RENAME TO "checklist_items";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
