-- AlterTable: replace hourlyCost with monthlySalary, preserving existing configured rate
-- (monthlySalary = hourlyCost * 220, the CLT-standard monthly-hours divisor, so the
-- previously configured hourly rate keeps producing the same cost math after the switch)
ALTER TABLE "users" ADD COLUMN "monthlySalary" REAL;

UPDATE "users" SET "monthlySalary" = "hourlyCost" * 220 WHERE "hourlyCost" IS NOT NULL;

ALTER TABLE "users" DROP COLUMN "hourlyCost";
