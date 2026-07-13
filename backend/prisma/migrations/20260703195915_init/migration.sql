-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PROMOTOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "monthlySalary" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdvs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusMeters" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdvs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "sku" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pontos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visitId" TEXT,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationAvailable" BOOLEAN NOT NULL DEFAULT false,
    "batteryLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pontos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "promotorId" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "noProductsFound" BOOLEAN NOT NULL DEFAULT false,
    "latitudeStart" DOUBLE PRECISION,
    "longitudeStart" DOUBLE PRECISION,
    "latitudeEnd" DOUBLE PRECISION,
    "longitudeEnd" DOUBLE PRECISION,
    "boxesGenerated" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_ratings" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "ratedById" TEXT NOT NULL,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotas_visita" (
    "id" TEXT NOT NULL,
    "promotorId" TEXT NOT NULL,
    "pdvId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "justification" TEXT,
    "justifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotas_visita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ruptura_registros" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qtyGondola" INTEGER NOT NULL DEFAULT 0,
    "qtyDeposito" INTEGER NOT NULL DEFAULT 0,
    "qtySeparadoTroca" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ruptura_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "degustacao_solicitacoes" (
    "id" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
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
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "degustacao_solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_checks" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ownPrice" DOUBLE PRECISION NOT NULL,
    "competitorName" TEXT,
    "competitorPrice" DOUBLE PRECISION,
    "photoPath" TEXT,
    "photoFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validities" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PDVToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "visit_ratings_visitId_key" ON "visit_ratings"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "rotas_visita_promotorId_pdvId_date_key" ON "rotas_visita"("promotorId", "pdvId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ruptura_registros_visitId_productId_key" ON "ruptura_registros"("visitId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "price_checks_visitId_productId_key" ON "price_checks"("visitId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "_PDVToProduct_AB_unique" ON "_PDVToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_PDVToProduct_B_index" ON "_PDVToProduct"("B");

-- AddForeignKey
ALTER TABLE "pontos" ADD CONSTRAINT "pontos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontos" ADD CONSTRAINT "pontos_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_promotorId_fkey" FOREIGN KEY ("promotorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "pdvs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_ratedById_fkey" FOREIGN KEY ("ratedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "checklist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas_visita" ADD CONSTRAINT "rotas_visita_promotorId_fkey" FOREIGN KEY ("promotorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas_visita" ADD CONSTRAINT "rotas_visita_pdvId_fkey" FOREIGN KEY ("pdvId") REFERENCES "pdvs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruptura_registros" ADD CONSTRAINT "ruptura_registros_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruptura_registros" ADD CONSTRAINT "ruptura_registros_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_checks" ADD CONSTRAINT "price_checks_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_checks" ADD CONSTRAINT "price_checks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validities" ADD CONSTRAINT "validities_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validities" ADD CONSTRAINT "validities_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PDVToProduct" ADD CONSTRAINT "_PDVToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "pdvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PDVToProduct" ADD CONSTRAINT "_PDVToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
