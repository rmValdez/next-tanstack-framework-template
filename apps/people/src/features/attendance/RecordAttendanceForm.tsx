"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { useEmployees } from "../employees/queries";
import { useRecordAttendance } from "./queries";
import {
  ATTENDANCE_STATUSES,
  createAttendanceSchema,
  type CreateAttendanceInput,
} from "./schema";

const todayStr = new Date().toISOString().slice(0, 10);

const EMPTY: CreateAttendanceInput = {
  employeeId: "",
  date: todayStr,
  status: "PRESENT",
  notes: "",
};

function FieldError({ errors }: { errors: unknown[] }) {
  const first = errors[0] as { message?: string } | string | undefined;
  const message = typeof first === "string" ? first : first?.message;
  return message ? <p className="mt-1 text-[11px] text-red-400">{message}</p> : null;
}

export function RecordAttendanceForm({ onRecorded }: { onRecorded?: () => void }) {
  const employees = useEmployees();
  const recordAttendance = useRecordAttendance();

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onChange: createAttendanceSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        const record = await recordAttendance.mutateAsync(value);
        toast.success(`Attendance logged for ${record.employeeName} (${record.status}).`);
        formApi.reset();
        onRecorded?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to record attendance.");
      }
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <form.Field name="employeeId">
        {(field) => (
          <div>
            <label htmlFor="employeeId" className="mb-1.5 block text-xs font-medium text-slate-300">
              Employee
            </label>
            <select
              id="employeeId"
              name="employeeId"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              disabled={employees.isLoading}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="">{employees.isLoading ? "Loading…" : "Choose employee…"}</option>
              {employees.data?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeNo} · {emp.department.name})
                </option>
              ))}
            </select>
            {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
          </div>
        )}
      </form.Field>

      <form.Field name="date">
        {(field) => (
          <div>
            <Input
              id="date"
              name="date"
              type="date"
              label="Date"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
            />
            {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
          </div>
        )}
      </form.Field>

      <form.Field name="status">
        {(field) => (
          <div>
            <label htmlFor="status" className="mb-1.5 block text-xs font-medium text-slate-300">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) =>
                field.handleChange(e.target.value as CreateAttendanceInput["status"])
              }
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
            >
              {ATTENDANCE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.replace("_", " ")}
                </option>
              ))}
            </select>
            {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
          </div>
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <div>
            <Input
              id="notes"
              name="notes"
              type="text"
              label="Notes (optional)"
              placeholder="e.g. Remote work, dentist appointment"
              value={field.state.value ?? ""}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <div className="flex items-end sm:col-span-2">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Recording…" : "Log Attendance"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
