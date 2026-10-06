import { API_RESOURCES } from "@workspace/core/apis";
import { listEmployeeDirectory } from "@/features/employees/server";
import { requireAppToken } from "@/lib/app-token";

export const dynamic = "force-dynamic";

// For other domains (finance, …), with an accounts-issued app token. HR's own UI uses
// /api/employees with the session instead.
export async function GET(request: Request) {
  const { response } = await requireAppToken(request, API_RESOURCES.hr.scopes.employeesRead);
  if (response) return response;

  return Response.json(await listEmployeeDirectory());
}
