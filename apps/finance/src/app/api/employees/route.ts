import { listPayableEmployees } from "@/features/payroll/server";
import { requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

// Read-only, from HR's published view. HR's own /api/employees is the place to change them.
export async function GET() {
  const { response } = await requireApiSession();
  if (response) return response;

  return Response.json(await listPayableEmployees());
}
