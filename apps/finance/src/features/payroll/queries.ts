"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePayrollInput, EmployeeOption, PayrollRow } from "./schema";

export const payrollKeys = {
  all: ["payroll"] as const,
  employees: ["employees"] as const,
};

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = response.status === 201 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export function usePayroll() {
  return useQuery({
    queryKey: payrollKeys.all,
    queryFn: () => request<PayrollRow[]>("/api/payroll"),
  });
}

export function usePayableEmployees() {
  return useQuery({
    queryKey: payrollKeys.employees,
    queryFn: () => request<EmployeeOption[]>("/api/employees"),
  });
}

export function useCreatePayrollEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePayrollInput) =>
      request<null>("/api/payroll", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}
