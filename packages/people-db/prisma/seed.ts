import { peopleDb } from "../src/client";

// Sample data for the People Operations bounded context (HR, Recruitment, Attendance).
// Idempotent: rows are matched on natural keys.

const DEPARTMENTS = [
  { code: "ENG", name: "Engineering" },
  { code: "FIN", name: "Finance" },
  { code: "PPL", name: "People Operations" },
];

const EMPLOYEES = [
  {
    employeeNo: "E-0001",
    fullName: "Admin Operator",
    email: "admin@example.com",
    position: "Platform Administrator",
    department: "ENG",
    hiredOn: "2024-01-15",
    monthlySalary: "120000.00",
  },
  {
    employeeNo: "E-0002",
    fullName: "Maria Santos",
    email: "maria.santos@example.com",
    position: "Payroll Specialist",
    department: "FIN",
    hiredOn: "2024-03-01",
    monthlySalary: "65000.00",
  },
  {
    employeeNo: "E-0003",
    fullName: "Jose Reyes",
    email: "jose.reyes@example.com",
    position: "HR Generalist",
    department: "PPL",
    hiredOn: "2025-06-16",
    monthlySalary: "55000.00",
  },
];

async function main() {
  const departmentIds = new Map<string, string>();
  for (const department of DEPARTMENTS) {
    const row = await peopleDb.department.upsert({
      where: { code: department.code },
      update: { name: department.name },
      create: department,
    });
    departmentIds.set(department.code, row.id);
  }

  const employeeIds = new Map<string, string>();
  for (const { department, hiredOn, ...employee } of EMPLOYEES) {
    const data = {
      ...employee,
      departmentId: departmentIds.get(department)!,
      hiredOn: new Date(hiredOn),
    };
    const row = await peopleDb.employee.upsert({
      where: { employeeNo: employee.employeeNo },
      update: { ...data, updatedAt: new Date() },
      create: data,
    });
    employeeIds.set(employee.employeeNo, row.id);
  }

  // Seed sample recruitment job opening
  const engDeptId = departmentIds.get("ENG")!;
  const jobOpening = await peopleDb.jobOpening.upsert({
    where: { id: "job-eng-lead" },
    update: { title: "Lead Systems Architect", departmentId: engDeptId },
    create: {
      id: "job-eng-lead",
      title: "Lead Systems Architect",
      departmentId: engDeptId,
      status: "OPEN",
    },
  });

  // Seed sample candidate in pipeline
  await peopleDb.candidate.upsert({
    where: { id: "cand-alex-mercer" },
    update: { fullName: "Alex Mercer", email: "alex.mercer@example.com" },
    create: {
      id: "cand-alex-mercer",
      fullName: "Alex Mercer",
      email: "alex.mercer@example.com",
      phone: "+1-555-0199",
      jobOpeningId: jobOpening.id,
      status: "INTERVIEWING",
      notes: "Strong distributed systems background.",
    },
  });

  // Seed attendance for Admin Operator for today
  const adminEmpId = employeeIds.get("E-0001")!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await peopleDb.attendanceRecord.upsert({
    where: {
      employeeId_date: {
        employeeId: adminEmpId,
        date: today,
      },
    },
    update: { status: "PRESENT" },
    create: {
      employeeId: adminEmpId,
      date: today,
      checkIn: new Date(),
      status: "PRESENT",
      notes: "On-time arrival.",
    },
  });

  console.log(
    `Seeded people_db: ${DEPARTMENTS.length} departments, ${EMPLOYEES.length} employees, 1 job opening, 1 candidate, 1 attendance record.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
