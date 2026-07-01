-- CreateTable
CREATE TABLE "ruptura_registros" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qtyGondola" INTEGER NOT NULL DEFAULT 0,
    "qtyDeposito" INTEGER NOT NULL DEFAULT 0,
    "qtySeparadoTroca" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ruptura_registros_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ruptura_registros_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ruptura_registros_visitId_productId_key" ON "ruptura_registros"("visitId", "productId");
