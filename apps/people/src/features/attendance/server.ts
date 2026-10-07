import { peopleDb } from "@workspace/people-db";
import type { AttendanceRecordRow, CreateAttendanceInput } from "./schema";

const attendanceSelect = {
  id: true,
  employeeId: true,
  employee: {
    select: {
      employeeNo: true,
      fullName: true,
      department: { select: { name: true } },
    },
  },
  date: true,
  checkIn: true,
  checkOut: true,
  status: true,
  notes: true,
} as const;

type SelectedRecord = Awaited<
  ReturnType<typeof peopleDb.attendanceRecord.findFirstOrThrow<{ select: typeof attendanceSelect }>>
>;

function toAttendanceRow(rec: SelectedRecord): AttendanceRecordRow {
  return {
    id: rec.id,
    employeeId: rec.employeeId,
    employeeNo: rec.employee.employeeNo,
    employeeName: rec.employee.fullName,
    departmentName: rec.employee.department.name,
    date: rec.date.toISOString().slice(0, 10),
    checkIn: rec.checkIn?.toISOString() ?? null,
    checkOut: rec.checkOut?.toISOString() ?? null,
    status: rec.status,
    notes: rec.notes,
  };
}

export async function listAttendanceRecords(): Promise<AttendanceRecordRow[]> {
  const records = await peopleDb.attendanceRecord.findMany({
    select: attendanceSelect,
    orderBy: { date: "desc" },
    take: 100,
  });
  return records.map(toAttendanceRow);
}

export async function recordAttendance(input: CreateAttendanceInput): Promise<AttendanceRecordRow> {
  const dateObj = new Date(input.date);
  dateObj.setHours(0, 0, 0, 0);

  const checkInTime = input.status === "PRESENT" || input.status === "LATE" ? new Date() : null;

  const record = await peopleDb.attendanceRecord.upsert({
    where: {
      employeeId_date: {
        employeeId: input.employeeId,
        date: dateObj,
      },
    },
    update: {
      status: input.status,
      notes: input.notes || null,
      checkIn: checkInTime,
    },
    create: {
      employeeId: input.employeeId,
      date: dateObj,
      status: input.status,
      checkIn: checkInTime,
      notes: input.notes || null,
    },
    select: attendanceSelect,
  });

  return toAttendanceRow(record);
}
