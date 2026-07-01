-- CreateTable
CREATE TABLE "_PDVToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PDVToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "pdvs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PDVToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_PDVToProduct_AB_unique" ON "_PDVToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_PDVToProduct_B_index" ON "_PDVToProduct"("B");
