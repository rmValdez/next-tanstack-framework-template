"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { useCreatePayrollEntry, usePayableEmployees } from "./queries";
import { createPayrollSchema, type CreatePayrollInput } from "./schema";

const EMPTY: CreatePayrollInput = { employeeId: "", period: "", grossPay: "", deductions: "" };

const TEXT_FIELDS = [
  { name: "period", label: "Month", placeholder: "", type: "month" },
  { name: "grossPay", label: "Gross pay", placeholder: "65000", type: "text" },
  { name: "deductions", label: "Deductions", placeholder: "8500", type: "text" },
] as const;

function FieldError({ errors }: { errors: unknown[] }) {
  // Zod (a Standard Schema) reports issue objects; show the first message.
  const first = errors[0] as { message?: string } | string | undefined;
  const message = typeof first === "string" ? first : first?.message;
  return message ? <p className="mt-1 text-[11px] text-red-400">{message}</p> : null;
}

export function CreatePayrollForm({ onCreated }: { onCreated?: () => void }) {
  const employees = usePayableEmployees();
  const createEntry = useCreatePayrollEntry();

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onChange: createPayrollSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        await createEntry.mutateAsync(value);
        toast.success("Payroll entry recorded.");
        formApi.reset();
        onCreated?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not record the entry.");
      }
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <form.Field name="employeeId">
        {(field) => (
          <div className="sm:col-span-2">
            <label htmlFor="employeeId" className="mb-1.5 block text-xs font-medium text-slate-300">
              Employee <span className="text-slate-500">(from HR)</span>
            </label>
            <select
              id="employeeId"
              name="employeeId"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              disabled={employees.isLoading}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="">{employees.isLoading ? "Loading…" : "Choose…"}</option>
              {employees.data?.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeNo} · {employee.fullName} ({employee.departmentName})
                </option>
              ))}
            </select>
            {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
          </div>
        )}
      </form.Field>

      {TEXT_FIELDS.map(({ name, label, placeholder, type }) => (
        <form.Field key={name} name={name}>
          {(field) => (
            <div>
              <Input
                id={name}
                name={name}
                type={type}
                label={label}
                placeholder={placeholder}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
              />
              {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
            </div>
          )}
        </form.Field>
      ))}

      <div className="flex items-end sm:col-span-2">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Recording…" : "Record entry"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
