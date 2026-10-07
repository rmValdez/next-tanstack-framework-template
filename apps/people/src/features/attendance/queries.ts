"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceRecordRow, CreateAttendanceInput } from "./schema";

export const attendanceKeys = {
  all: ["attendance"] as const,
};

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export function useAttendanceRecords() {
  return useQuery({
    queryKey: attendanceKeys.all,
    queryFn: () => request<AttendanceRecordRow[]>("/api/attendance"),
  });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAttendanceInput) =>
      request<AttendanceRecordRow>("/api/attendance", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}
