import type { HrEmployeeV1 } from "@workspace/core/apis";
import { peopleDb } from "@workspace/people-db";
import type { CreateEmployeeInput, DepartmentOption, EmployeeRow } from "./schema";

// Server-only: the People domain's data access. Only People touches people_db; other domains call
// /api/v1 (the read model below) or, later, send People an event.

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
  ReturnType<typeof peopleDb.employee.findFirstOrThrow<{ select: typeof employeeSelect }>>
>;

function toRow(employee: SelectedEmployee): EmployeeRow {
  return { ...employee, hiredOn: employee.hiredOn.toISOString().slice(0, 10) };
}

export async function listEmployees(): Promise<EmployeeRow[]> {
  const employees = await peopleDb.employee.findMany({
    select: employeeSelect,
    orderBy: { employeeNo: "asc" },
  });
  return employees.map(toRow);
}

export async function listDepartments(): Promise<DepartmentOption[]> {
  return peopleDb.department.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeRow> {
  const employee = await peopleDb.employee.create({
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
  ReturnType<typeof peopleDb.employee.findFirstOrThrow<{ select: typeof directorySelect }>>
>;

function toDirectoryEntry({ department, ...employee }: DirectoryRow): HrEmployeeV1 {
  return { ...employee, departmentCode: department.code, departmentName: department.name };
}

export async function listEmployeeDirectory(): Promise<HrEmployeeV1[]> {
  const employees = await peopleDb.employee.findMany({
    select: directorySelect,
    orderBy: { employeeNo: "asc" },
  });
  return employees.map(toDirectoryEntry);
}

export async function findEmployeeDirectoryEntry(id: string): Promise<HrEmployeeV1 | null> {
  const employee = await peopleDb.employee.findUnique({ where: { id }, select: directorySelect });
  return employee ? toDirectoryEntry(employee) : null;
}
