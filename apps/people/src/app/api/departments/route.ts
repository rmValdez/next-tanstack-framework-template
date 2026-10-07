import { listDepartments } from "@/features/employees/server";
import { requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireApiSession();
  if (response) return response;

  return Response.json(await listDepartments());
}
