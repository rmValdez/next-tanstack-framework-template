import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "@/lib/auth";

// Better Auth's endpoints (/api/auth/*): sign-in/social, the OIDC callback, get-session,
// sign-out. The Start equivalent of the Next apps' app/api/auth/[...all]/route.ts.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => (await getAuth()).handler(request),
      POST: async ({ request }) => (await getAuth()).handler(request),
    },
  },
});
