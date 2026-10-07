import { EmployeesView } from "@/features/employees/EmployeesView";
import { requireAuth } from "@/lib/session";

export default async function EmployeesPage() {
  await requireAuth("/employees");

  return <EmployeesView />;
}
