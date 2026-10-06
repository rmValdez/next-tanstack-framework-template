"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { useCreateEmployee, useDepartments } from "./queries";
import { createEmployeeSchema, type CreateEmployeeInput } from "./schema";

const EMPTY: CreateEmployeeInput = {
  employeeNo: "",
  fullName: "",
  email: "",
  position: "",
  departmentId: "",
  hiredOn: "",
  monthlySalary: "",
};

const TEXT_FIELDS = [
  { name: "employeeNo", label: "Employee no.", placeholder: "E-0004", type: "text" },
  { name: "fullName", label: "Full name", placeholder: "Juan dela Cruz", type: "text" },
  { name: "email", label: "Email", placeholder: "juan@example.com", type: "email" },
  { name: "position", label: "Position", placeholder: "Accountant", type: "text" },
  { name: "hiredOn", label: "Hired on", placeholder: "", type: "date" },
  { name: "monthlySalary", label: "Monthly salary", placeholder: "45000", type: "text" },
] as const;

function FieldError({ errors }: { errors: unknown[] }) {
  // Zod (a Standard Schema) reports issue objects; show the first message.
  const first = errors[0] as { message?: string } | string | undefined;
  const message = typeof first === "string" ? first : first?.message;
  return message ? <p className="mt-1 text-[11px] text-red-400">{message}</p> : null;
}

export function CreateEmployeeForm({ onCreated }: { onCreated?: () => void }) {
  const departments = useDepartments();
  const createEmployee = useCreateEmployee();

  const form = useForm({
    defaultValues: EMPTY,
    // Same schema the API validates with; validate on change once a field was touched.
    validators: { onChange: createEmployeeSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        const employee = await createEmployee.mutateAsync(value);
        toast.success(`${employee.fullName} added.`);
        formApi.reset();
        onCreated?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add the employee.");
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
              onChange={(event) => field.handleChange(event.target.value)}
              disabled={departments.isLoading}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="">{departments.isLoading ? "Loading…" : "Choose…"}</option>
              {departments.data?.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
          </div>
        )}
      </form.Field>

      <div className="flex items-end sm:col-span-2">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Adding…" : "Add employee"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
