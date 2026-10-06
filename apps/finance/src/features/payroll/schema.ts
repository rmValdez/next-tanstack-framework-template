import { z } from "zod";

const amount = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 45000 or 45000.50.");

// Shared by the form (client validation) and the API route (server validation).
export const createPayrollSchema = z
  .object({
    employeeId: z.string().min(1, "Choose an employee."),
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose the month."),
    grossPay: amount,
    deductions: amount,
  })
  .refine((value) => Number(value.deductions) <= Number(value.grossPay), {
    message: "Deductions cannot exceed gross pay.",
    path: ["deductions"],
  });

export type CreatePayrollInput = z.infer<typeof createPayrollSchema>;

// JSON shapes returned by Finance's API. Amounts are strings to keep decimals exact.
export interface PayrollRow {
  id: string;
  period: string;
  // From HR's API; null if HR no longer lists the employee.
  employee: { employeeNo: string; fullName: string; departmentName: string } | null;
  grossPay: string;
  deductions: string;
  netPay: string;
  status: "DRAFT" | "APPROVED";
}

export interface EmployeeOption {
  id: string;
  employeeNo: string;
  fullName: string;
  departmentName: string;
}
