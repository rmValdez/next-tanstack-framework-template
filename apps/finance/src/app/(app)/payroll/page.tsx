import { PayrollView } from "@/features/payroll/PayrollView";
import { requireAuth } from "@/lib/session";

export default async function PayrollPage() {
  await requireAuth("/payroll");

  return <PayrollView />;
}
