import { hrDb } from "@workspace/hr-db";
import type { CreateEmployeeInput, DepartmentOption, EmployeeRow } from "./schema";

// Server-only: the HR domain's data access. Only HR writes the hr schema; other domains
// read hr_public.employee_directory_v1 or ask HR's API / send HR an event.

const employeeSelect = {
  id: true,
  employeeNo: true,
  fullName: true,
  email: true,
  position: true,
  status: true,
  hiredOn: true,
  department: { select: { code: true, name: true } },
} as const;

type SelectedEmployee = Awaited<
  ReturnType<typeof hrDb.employee.findFirstOrThrow<{ select: typeof employeeSelect }>>
>;

function toRow(employee: SelectedEmployee): EmployeeRow {
  return { ...employee, hiredOn: employee.hiredOn.toISOString().slice(0, 10) };
}

export async function listEmployees(): Promise<EmployeeRow[]> {
  const employees = await hrDb.employee.findMany({
    select: employeeSelect,
    orderBy: { employeeNo: "asc" },
  });
  return employees.map(toRow);
}

export async function listDepartments(): Promise<DepartmentOption[]> {
  return hrDb.department.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeRow> {
  const employee = await hrDb.employee.create({
    data: { ...input, hiredOn: new Date(input.hiredOn) },
    select: employeeSelect,
  });
  return toRow(employee);
}
