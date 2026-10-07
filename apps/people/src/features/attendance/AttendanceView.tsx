"use client";

import { useState } from "react";
import { CalendarCheck, Loader2, Plus, X } from "lucide-react";
import { Button } from "@workspace/ui/button";
import { Card } from "@workspace/ui/card";
import { AttendanceTable } from "./AttendanceTable";
import { RecordAttendanceForm } from "./RecordAttendanceForm";
import { useAttendanceRecords } from "./queries";
import type { AttendanceRecordRow } from "./schema";

const NO_RECORDS: AttendanceRecordRow[] = [];

export function AttendanceView() {
  const records = useAttendanceRecords();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-white">Daily Attendance</h2>
          <p className="text-sm text-slate-400">
            {records.data
              ? `${records.data.length} attendance record${records.data.length === 1 ? "" : "s"}.`
              : "Employee check-ins and shift logs."}
          </p>
        </div>
        <Button
          variant={showForm ? "outline" : "primary"}
          onClick={() => setShowForm((open) => !open)}
        >
          {showForm ? (
            <>
              <X className="mr-1.5 h-4 w-4" /> Close
            </>
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" /> Log Attendance
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <RecordAttendanceForm onRecorded={() => setShowForm(false)} />
        </Card>
      )}

      {records.isLoading ? (
        <div className="flex items-center gap-3 py-10 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="text-sm">Loading attendance records…</span>
        </div>
      ) : records.error ? (
        <p className="text-sm text-red-400">{records.error.message}</p>
      ) : (
        <AttendanceTable data={records.data ?? NO_RECORDS} />
      )}
    </div>
  );
}
