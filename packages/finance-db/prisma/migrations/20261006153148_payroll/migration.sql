-- CreateEnum
CREATE TYPE "payroll_status" AS ENUM ('DRAFT', 'APPROVED');

-- CreateTable
CREATE TABLE "payroll_entries" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "gross_pay" DECIMAL(12,2) NOT NULL,
    "deductions" DECIMAL(12,2) NOT NULL,
    "status" "payroll_status" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_entries_period_idx" ON "payroll_entries"("period");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entries_employee_id_period_key" ON "payroll_entries"("employee_id", "period");
