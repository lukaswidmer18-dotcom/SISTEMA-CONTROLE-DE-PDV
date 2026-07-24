-- CreateTable
CREATE TABLE "promotor_locations" (
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotor_locations_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "promotor_locations" ADD CONSTRAINT "promotor_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
