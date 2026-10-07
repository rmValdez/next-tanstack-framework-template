import { z } from "zod";

// Shared by the form (client validation) and the API route (server validation), so the
// two cannot disagree.
export const createEmployeeSchema = z.object({
  employeeNo: z
    .string()
    .trim()
    .regex(/^E-\d{4,}$/, "Use the format E-0001."),
  fullName: z.string().trim().min(2, "Enter the full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  position: z.string().trim().min(2, "Enter the position."),
  departmentId: z.string().min(1, "Choose a department."),
  hiredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the hire date."),
  monthlySalary: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 45000 or 45000.50."),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const EMPLOYEE_STATUSES = ["ACTIVE", "ON_LEAVE", "TERMINATED"] as const;

// JSON shapes returned by HR's API (dates as ISO strings).
export interface EmployeeRow {
  id: string;
  employeeNo: string;
  fullName: string;
  email: string;
  position: string;
  department: { code: string; name: string };
  status: (typeof EMPLOYEE_STATUSES)[number];
  hiredOn: string;
}

export interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}
