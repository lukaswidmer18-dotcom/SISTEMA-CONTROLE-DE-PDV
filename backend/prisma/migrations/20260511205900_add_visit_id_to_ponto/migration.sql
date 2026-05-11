-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pontos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "visitId" TEXT,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" REAL,
    "longitude" REAL,
    "locationAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pontos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pontos_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pontos" ("createdAt", "id", "latitude", "locationAvailable", "longitude", "timestamp", "type", "userId") SELECT "createdAt", "id", "latitude", "locationAvailable", "longitude", "timestamp", "type", "userId" FROM "pontos";
DROP TABLE "pontos";
ALTER TABLE "new_pontos" RENAME TO "pontos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
