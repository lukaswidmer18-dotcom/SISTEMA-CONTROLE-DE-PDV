-- CreateTable
CREATE TABLE "price_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ownPrice" REAL NOT NULL,
    "competitorName" TEXT,
    "competitorPrice" REAL,
    "photoPath" TEXT,
    "photoFileName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_checks_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "price_checks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "price_checks_visitId_productId_key" ON "price_checks"("visitId", "productId");
