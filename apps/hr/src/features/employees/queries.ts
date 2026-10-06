"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateEmployeeInput, DepartmentOption, EmployeeRow } from "./schema";

export const employeeKeys = {
  all: ["employees"] as const,
  departments: ["departments"] as const,
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

export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.all,
    queryFn: () => request<EmployeeRow[]>("/api/employees"),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: employeeKeys.departments,
    queryFn: () => request<DepartmentOption[]>("/api/departments"),
    staleTime: 1000 * 60 * 30, // departments rarely change
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) =>
      request<EmployeeRow>("/api/employees", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}
