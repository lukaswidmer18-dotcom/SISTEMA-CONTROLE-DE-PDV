CREATE TABLE "form_type_configs" (
    "formType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_type_configs_pkey" PRIMARY KEY ("formType")
);

INSERT INTO "form_type_configs" ("formType", "title", "description", "updatedAt") VALUES
    ('VALIDADE', 'Registrar Validade', 'Campos do formulário de validade de produto.', CURRENT_TIMESTAMP),
    ('RUPTURA', 'Registrar Ruptura', 'Campos do formulário de ruptura de estoque.', CURRENT_TIMESTAMP),
    ('PRECO', 'Pesquisa de Preço', 'Campos do formulário de pesquisa de preço.', CURRENT_TIMESTAMP);
