import { AttendanceView } from "@/features/attendance/AttendanceView";
import { requireAuth } from "@/lib/session";

export default async function AttendancePage() {
  await requireAuth("/attendance");

  return <AttendanceView />;
}
