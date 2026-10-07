"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { useCreateCandidate, useJobOpenings } from "./queries";
import { createCandidateSchema, type CreateCandidateInput } from "./schema";

const EMPTY: CreateCandidateInput = {
  fullName: "",
  email: "",
  phone: "",
  jobOpeningId: "",
  notes: "",
};

function FieldError({ errors }: { errors: unknown[] }) {
  const first = errors[0] as { message?: string } | string | undefined;
  const message = typeof first === "string" ? first : first?.message;
  return message ? <p className="mt-1 text-[11px] text-red-400">{message}</p> : null;
}

export function CreateCandidateForm({ onCreated }: { onCreated?: () => void }) {
  const openings = useJobOpenings();
  const createCandidate = useCreateCandidate();

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onChange: createCandidateSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        const candidate = await createCandidate.mutateAsync(value);
        toast.success(`Candidate ${candidate.fullName} added.`);
        formApi.reset();
        onCreated?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add candidate.");
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
      <form.Field name="fullName">
        {(field) => (
          <div>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              label="Full name"
              placeholder="Alex Mercer"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
            />
            {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
          </div>
        )}
      </form.Field>

      <form.Field name="email">
        {(field) => (
          <div>
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              placeholder="alex@example.com"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
            />
            {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
          </div>
        )}
      </form.Field>

      <form.Field name="phone">
        {(field) => (
          <div>
            <Input
              id="phone"
              name="phone"
              type="text"
              label="Phone (optional)"
              placeholder="+1-555-0199"
              value={field.state.value ?? ""}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="jobOpeningId">
        {(field) => (
          <div>
            <label
              htmlFor="jobOpeningId"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Job Opening
            </label>
            <select
              id="jobOpeningId"
              name="jobOpeningId"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              disabled={openings.isLoading}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="">{openings.isLoading ? "Loading…" : "Choose opening…"}</option>
              {openings.data?.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.title} ({op.department.name})
                </option>
              ))}
            </select>
            {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
          </div>
        )}
      </form.Field>

      <div className="sm:col-span-2">
        <form.Field name="notes">
          {(field) => (
            <div>
              <Input
                id="notes"
                name="notes"
                type="text"
                label="Notes (optional)"
                placeholder="Background notes or interview comments"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </div>
          )}
        </form.Field>
      </div>

      <div className="flex items-end sm:col-span-2">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Adding…" : "Add Candidate"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
