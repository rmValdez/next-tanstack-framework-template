import { listPayableEmployees } from "@/features/payroll/server";
import { requireApiSession } from "@/lib/api";
import { HrUnavailableError } from "@/lib/hr-client";

export const dynamic = "force-dynamic";

// Read-only, fetched from HR's API. HR is the place to change employees.
export async function GET() {
  const { response } = await requireApiSession();
  if (response) return response;

  try {
    return Response.json(await listPayableEmployees());
  } catch (error) {
    if (error instanceof HrUnavailableError) {
      console.error("[finance] HR API:", error.message);
      return Response.json({ error: "HR is unavailable. Try again shortly." }, { status: 503 });
    }
    throw error;
  }
}
