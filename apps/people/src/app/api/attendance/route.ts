import { listAttendanceRecords, recordAttendance } from "@/features/attendance/server";
import { createAttendanceSchema } from "@/features/attendance/schema";
import { requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireApiSession();
  if (response) return response;

  return Response.json(await listAttendanceRecords());
}

export async function POST(request: Request) {
  const { response } = await requireApiSession();
  if (response) return response;

  const parsed = createAttendanceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid attendance payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const record = await recordAttendance(parsed.data);
    return Response.json(record, { status: 201 });
  } catch (error) {
    console.error("[api/attendance] Error:", error);
    return Response.json({ error: "Failed to log attendance record" }, { status: 500 });
  }
}
