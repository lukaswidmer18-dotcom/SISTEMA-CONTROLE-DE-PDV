-- CreateTable
CREATE TABLE "rotas_visita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promotorId" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rotas_visita_promotorId_fkey" FOREIGN KEY ("promotorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rotas_visita_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "pdvs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rotas_visita_promotorId_pdvId_dayOfWeek_key" ON "rotas_visita"("promotorId", "pdvId", "dayOfWeek");
