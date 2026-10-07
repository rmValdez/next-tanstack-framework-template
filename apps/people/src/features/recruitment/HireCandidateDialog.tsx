"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { useDepartments } from "../employees/queries";
import { useHireCandidate } from "./queries";
import {
  hireCandidateSchema,
  type CandidateRow,
  type HireCandidateInput,
} from "./schema";

function FieldError({ errors }: { errors: unknown[] }) {
  const first = errors[0] as { message?: string } | string | undefined;
  const message = typeof first === "string" ? first : first?.message;
  return message ? <p className="mt-1 text-[11px] text-red-400">{message}</p> : null;
}

export function HireCandidateDialog({
  candidate,
  onClose,
}: {
  candidate: CandidateRow;
  onClose: () => void;
}) {
  const departments = useDepartments();
  const hireCandidate = useHireCandidate();

  const todayStr = new Date().toISOString().slice(0, 10);

  const initialValues: HireCandidateInput = {
    candidateId: candidate.id,
    employeeNo: "",
    position: candidate.jobOpening.title,
    departmentId: "",
    hiredOn: todayStr,
    monthlySalary: "60000",
  };

  const form = useForm({
    defaultValues: initialValues,
    validators: { onChange: hireCandidateSchema },
    onSubmit: async ({ value }) => {
      try {
        await hireCandidate.mutateAsync(value);
        toast.success(
          `Successfully hired ${candidate.fullName}! Created employee ${value.employeeNo}.`
        );
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to hire candidate.");
      }
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white">Hire {candidate.fullName}</h3>
            <p className="text-xs text-slate-400">
              Convert candidate into an active Employee in a single atomic transaction.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            ✕
          </button>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.Field name="employeeNo">
              {(field) => (
                <div>
                  <Input
                    id="employeeNo"
                    name="employeeNo"
                    type="text"
                    label="Employee No."
                    placeholder="E-0005"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
                </div>
              )}
            </form.Field>

            <form.Field name="position">
              {(field) => (
                <div>
                  <Input
                    id="position"
                    name="position"
                    type="text"
                    label="Position"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
                </div>
              )}
            </form.Field>

            <form.Field name="departmentId">
              {(field) => (
                <div>
                  <label
                    htmlFor="departmentId"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Department
                  </label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={departments.isLoading}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                  >
                    <option value="">Choose department…</option>
                    {departments.data?.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
                </div>
              )}
            </form.Field>

            <form.Field name="hiredOn">
              {(field) => (
                <div>
                  <Input
                    id="hiredOn"
                    name="hiredOn"
                    type="date"
                    label="Hire Date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
                </div>
              )}
            </form.Field>

            <div className="sm:col-span-2">
              <form.Field name="monthlySalary">
                {(field) => (
                  <div>
                    <Input
                      id="monthlySalary"
                      name="monthlySalary"
                      type="text"
                      label="Monthly Salary"
                      placeholder="65000"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={
                        field.state.meta.isTouched && field.state.meta.errors.length > 0
                      }
                    />
                    {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Processing…" : "Confirm Hire"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </div>
    </div>
  );
}
