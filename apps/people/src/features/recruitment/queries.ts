"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeeKeys } from "../employees/queries";
import type {
  CandidateRow,
  CreateCandidateInput,
  HireCandidateInput,
  JobOpeningOption,
} from "./schema";

export const recruitmentKeys = {
  allCandidates: ["candidates"] as const,
  allOpenings: ["job-openings"] as const,
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

export function useCandidates() {
  return useQuery({
    queryKey: recruitmentKeys.allCandidates,
    queryFn: () => request<CandidateRow[]>("/api/recruitment/candidates"),
  });
}

export function useJobOpenings() {
  return useQuery({
    queryKey: recruitmentKeys.allOpenings,
    queryFn: () => request<JobOpeningOption[]>("/api/recruitment/openings"),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCandidateInput) =>
      request<CandidateRow>("/api/recruitment/candidates", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recruitmentKeys.allCandidates }),
  });
}

export function useHireCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HireCandidateInput) =>
      request<{ employee: unknown; candidate: CandidateRow }>("/api/recruitment/hire", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.allCandidates });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}
