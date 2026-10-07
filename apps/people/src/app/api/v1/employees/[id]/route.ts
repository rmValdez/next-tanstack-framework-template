import { API_RESOURCES } from "@workspace/core/apis";
import { findEmployeeDirectoryEntry } from "@/features/employees/server";
import { requireAppToken } from "@/lib/app-token";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAppToken(request, API_RESOURCES.people.scopes.employeesRead);
  if (response) return response;

  const employee = await findEmployeeDirectoryEntry((await params).id);
  if (!employee) {
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }
  return Response.json(employee);
}
