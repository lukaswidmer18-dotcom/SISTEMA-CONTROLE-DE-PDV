-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_photos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitId" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "photos_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "photos_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "checklist_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_photos" ("fileName", "filePath", "id", "latitude", "longitude", "uploadedAt", "visitId") SELECT "fileName", "filePath", "id", "latitude", "longitude", "uploadedAt", "visitId" FROM "photos";
DROP TABLE "photos";
ALTER TABLE "new_photos" RENAME TO "photos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
