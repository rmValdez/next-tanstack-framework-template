import type { HrEmployeeV1 } from "@workspace/core/apis";
import { hrDb } from "@workspace/hr-db";
import type { CreateEmployeeInput, DepartmentOption, EmployeeRow } from "./schema";

// Server-only: the HR domain's data access. Only HR touches hr_db; other domains call
// /api/v1 (the read model below) or, later, send HR an event.

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

// ─── Read model for other domains (/api/v1) ─────────────────────────────────

const directorySelect = {
  id: true,
  employeeNo: true,
  fullName: true,
  email: true,
  position: true,
  status: true,
  department: { select: { code: true, name: true } },
} as const;

type DirectoryRow = Awaited<
  ReturnType<typeof hrDb.employee.findFirstOrThrow<{ select: typeof directorySelect }>>
>;

function toDirectoryEntry({ department, ...employee }: DirectoryRow): HrEmployeeV1 {
  return { ...employee, departmentCode: department.code, departmentName: department.name };
}

export async function listEmployeeDirectory(): Promise<HrEmployeeV1[]> {
  const employees = await hrDb.employee.findMany({
    select: directorySelect,
    orderBy: { employeeNo: "asc" },
  });
  return employees.map(toDirectoryEntry);
}

export async function findEmployeeDirectoryEntry(id: string): Promise<HrEmployeeV1 | null> {
  const employee = await hrDb.employee.findUnique({ where: { id }, select: directorySelect });
  return employee ? toDirectoryEntry(employee) : null;
}
