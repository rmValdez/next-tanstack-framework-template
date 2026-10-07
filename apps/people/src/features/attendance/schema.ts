import { z } from "zod";

export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT", "ON_LEAVE"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const createAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Select an employee."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose record date."),
  status: z.enum(ATTENDANCE_STATUSES),
  notes: z.string().trim().optional(),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;

export interface AttendanceRecordRow {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  departmentName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  notes: string | null;
}
