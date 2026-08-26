ALTER TABLE "validities" ADD COLUMN "extraFields" JSONB;
ALTER TABLE "ruptura_registros" ADD COLUMN "extraFields" JSONB;
ALTER TABLE "price_checks" ADD COLUMN "extraFields" JSONB;

CREATE TABLE "form_field_configs" (
    "id" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'TEXT',
    "core" BOOLEAN NOT NULL DEFAULT false,
    "lockedActive" BOOLEAN NOT NULL DEFAULT false,
    "lockedRequired" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_field_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_field_configs_formType_fieldKey_key" ON "form_field_configs"("formType", "fieldKey");
