// Server-only. Better Auth's genericOAuth reads accounts' discovery document once, when the
// auth instance initializes. If accounts is unreachable at that moment (all apps starting
// together under `pnpm dev`, accounts restarting in production), the provider is skipped for
// the life of the process and every sign-in fails with "Provider not found". Verified with
// better-auth 1.7.7 (build log, step 3).
//
// selfHealingAuth() hands out the instance through getAuth(): when the instance came up
// without the provider, the next request after `retryAfterMs` builds a fresh one, which
// fetches discovery again. Once accounts answers, the healthy instance is kept for good.

interface AuthWithProviders {
  $context: Promise<{ socialProviders: { id: string }[] }>;
}

export function selfHealingAuth<T extends AuthWithProviders>(
  create: () => T,
  providerId: string,
  retryAfterMs = 5000
): () => Promise<T> {
  let instance = create();
  let createdAt = Date.now();

  return async function getAuth() {
    const context = await instance.$context;
    if (context.socialProviders.some((provider) => provider.id === providerId)) {
      return instance;
    }
    if (Date.now() - createdAt >= retryAfterMs) {
      // Updated before awaiting, so concurrent requests don't each build an instance.
      createdAt = Date.now();
      instance = create();
      await instance.$context;
    }
    return instance;
  };
}
