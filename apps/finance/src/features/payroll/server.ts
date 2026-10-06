import { financeDb } from "@workspace/finance-db";
import type { CreatePayrollInput, EmployeeOption, PayrollRow } from "./schema";

// Server-only: Finance's data access. Finance writes only the finance schema. Employee data
// comes from HR's published view (financeDb.employeeDirectory, read-only); Finance never
// imports @workspace/hr-db.

export class PayrollError extends Error {}

/** Employees Finance may pay: everyone HR lists who is not terminated. */
export async function listPayableEmployees(): Promise<EmployeeOption[]> {
  return financeDb.employeeDirectory.findMany({
    where: { status: { not: "TERMINATED" } },
    select: { id: true, employeeNo: true, fullName: true, departmentName: true },
    orderBy: { employeeNo: "asc" },
  });
}

export async function listPayroll(): Promise<PayrollRow[]> {
  const entries = await financeDb.payrollEntry.findMany({
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
  });

  // No join across owners: read the matching directory rows and merge in memory.
  const employees = await financeDb.employeeDirectory.findMany({
    where: { id: { in: [...new Set(entries.map((entry) => entry.employeeId))] } },
    select: { id: true, employeeNo: true, fullName: true, departmentName: true },
  });
  const byId = new Map(employees.map(({ id, ...employee }) => [id, employee]));

  return entries.map((entry) => ({
    id: entry.id,
    period: entry.period,
    employee: byId.get(entry.employeeId) ?? null,
    grossPay: entry.grossPay.toFixed(2),
    deductions: entry.deductions.toFixed(2),
    netPay: entry.grossPay.minus(entry.deductions).toFixed(2),
    status: entry.status,
  }));
}

export async function createPayrollEntry(
  input: CreatePayrollInput,
  createdById: string
): Promise<void> {
  // The employee id must exist in HR's view: without a foreign key, this check is what
  // keeps Finance from paying an id HR never issued.
  const employee = await financeDb.employeeDirectory.findUnique({
    where: { id: input.employeeId },
    select: { status: true },
  });
  if (!employee) throw new PayrollError("Unknown employee.");
  if (employee.status === "TERMINATED") {
    throw new PayrollError("This employee is terminated in HR.");
  }

  await financeDb.payrollEntry.create({ data: { ...input, createdById } });
}
