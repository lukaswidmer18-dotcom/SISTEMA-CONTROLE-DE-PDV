-- CreateTable
CREATE TABLE "visit_ratings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "ratedById" TEXT NOT NULL,
    "ratedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "visit_ratings_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "visit_ratings_ratedById_fkey" FOREIGN KEY ("ratedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "visit_ratings_visitId_key" ON "visit_ratings"("visitId");
