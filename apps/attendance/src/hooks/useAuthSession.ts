"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const AUTH_SESSION_QUERY_KEY = ["auth", "session"] as const;

export function useAuthSession() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await authClient.getSession();
      if (error) {
        throw error;
      }
      return data ?? null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });

  return {
    session: query.data?.session ?? null,
    user: query.data?.user ?? null,
    data: query.data,
    isLoading: query.isLoading,
    isAuthenticated: Boolean(query.data?.user),
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}
