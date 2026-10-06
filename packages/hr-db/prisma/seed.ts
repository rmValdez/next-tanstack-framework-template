import { hrDb } from "../src/client";

// Sample data so the HR app and the hr_public view have something to show. Idempotent:
// rows are matched on their natural keys (department code, employee number).

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
    const row = await hrDb.department.upsert({
      where: { code: department.code },
      update: { name: department.name },
      create: department,
    });
    departmentIds.set(department.code, row.id);
  }

  for (const { department, hiredOn, ...employee } of EMPLOYEES) {
    const data = {
      ...employee,
      departmentId: departmentIds.get(department)!,
      hiredOn: new Date(hiredOn),
    };
    await hrDb.employee.upsert({
      where: { employeeNo: employee.employeeNo },
      update: data,
      create: data,
    });
  }

  console.log(`Seeded hr: ${DEPARTMENTS.length} departments, ${EMPLOYEES.length} employees`);
}

main()
  .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await hrDb.$disconnect();
  });
