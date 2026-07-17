-- CreateIndex
CREATE INDEX "users_role_active_idx" ON "users"("role", "active");

-- CreateIndex
CREATE INDEX "pontos_userId_idx" ON "pontos"("userId");

-- CreateIndex
CREATE INDEX "pontos_visitId_idx" ON "pontos"("visitId");

-- CreateIndex
CREATE INDEX "visits_promotorId_idx" ON "visits"("promotorId");

-- CreateIndex
CREATE INDEX "visits_pdvId_idx" ON "visits"("pdvId");

-- CreateIndex
CREATE INDEX "visits_status_idx" ON "visits"("status");

-- CreateIndex
CREATE INDEX "visits_startedAt_idx" ON "visits"("startedAt");

-- CreateIndex
CREATE INDEX "visit_ratings_ratedById_idx" ON "visit_ratings"("ratedById");

-- CreateIndex
CREATE INDEX "photos_visitId_idx" ON "photos"("visitId");

-- CreateIndex
CREATE INDEX "photos_checklistItemId_idx" ON "photos"("checklistItemId");

-- CreateIndex
CREATE INDEX "rotas_visita_pdvId_idx" ON "rotas_visita"("pdvId");

-- CreateIndex
CREATE INDEX "rotas_visita_date_idx" ON "rotas_visita"("date");

-- CreateIndex
CREATE INDEX "ruptura_registros_productId_idx" ON "ruptura_registros"("productId");

-- CreateIndex
CREATE INDEX "price_checks_productId_idx" ON "price_checks"("productId");

-- CreateIndex
CREATE INDEX "validities_visitId_idx" ON "validities"("visitId");

-- CreateIndex
CREATE INDEX "validities_productId_idx" ON "validities"("productId");
