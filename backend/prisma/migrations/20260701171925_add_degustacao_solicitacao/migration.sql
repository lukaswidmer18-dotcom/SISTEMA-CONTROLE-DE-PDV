-- CreateTable
CREATE TABLE "degustacao_solicitacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordenadorId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "productEvent" TEXT NOT NULL,
    "eventTime" TEXT NOT NULL,
    "supervisor" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "degustacao_solicitacoes_coordenadorId_fkey" FOREIGN KEY ("coordenadorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
