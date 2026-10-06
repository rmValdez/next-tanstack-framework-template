import { financeDb } from "@workspace/finance-db";
import { getHrEmployee, listHrEmployees } from "@/lib/hr-client";
import type { CreatePayrollInput, EmployeeOption, PayrollRow } from "./schema";

// Server-only: Finance's data access. Finance writes only finance_db. Employee data comes
// from HR's API (lib/hr-client.ts) with an app token; Finance never reads hr_db.

export class PayrollError extends Error {}

/** Employees Finance may pay: everyone HR lists who is not terminated. */
export async function listPayableEmployees(): Promise<EmployeeOption[]> {
  const employees = await listHrEmployees();
  return employees
    .filter((employee) => employee.status !== "TERMINATED")
    .map(({ id, employeeNo, fullName, departmentName }) => ({
      id,
      employeeNo,
      fullName,
      departmentName,
    }));
}

export async function listPayroll(): Promise<PayrollRow[]> {
  const entries = await financeDb.payrollEntry.findMany({
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
  });
  if (entries.length === 0) return [];

  // No join across owners: one call for HR's directory, merged in memory. Fine at template
  // scale; a large payroll would ask HR for just these ids, or keep an event-fed read model.
  const byId = new Map((await listHrEmployees()).map((employee) => [employee.id, employee]));

  return entries.map((entry) => {
    const employee = byId.get(entry.employeeId);
    return {
      id: entry.id,
      period: entry.period,
      employee: employee
        ? {
            employeeNo: employee.employeeNo,
            fullName: employee.fullName,
            departmentName: employee.departmentName,
          }
        : null,
      grossPay: entry.grossPay.toFixed(2),
      deductions: entry.deductions.toFixed(2),
      netPay: entry.grossPay.minus(entry.deductions).toFixed(2),
      status: entry.status,
    };
  });
}

export async function createPayrollEntry(
  input: CreatePayrollInput,
  createdById: string
): Promise<void> {
  // The employee id must exist in HR: without a foreign key, this check is what keeps
  // Finance from paying an id HR never issued.
  const employee = await getHrEmployee(input.employeeId);
  if (!employee) throw new PayrollError("Unknown employee.");
  if (employee.status === "TERMINATED") {
    throw new PayrollError("This employee is terminated in HR.");
  }

  await financeDb.payrollEntry.create({ data: { ...input, createdById } });
}
