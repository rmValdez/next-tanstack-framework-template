// Shared by the Better Auth server config and the sign-up form, so client-side
// validation cannot disagree with the server's floor.
export const MIN_PASSWORD_LENGTH = 8;

// Any schema with Zod's safeParse shape. Typed structurally, not as a Zod 3 or Zod 4 type:
// the Next apps use Zod 3 while TanStack Start apps use Zod 4 (their bundler gives the whole
// server one zod copy, and better-auth needs 4), and both call this helper.
interface SafeParseSchema<T> {
  safeParse(
    input: unknown
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
}

export function parseEnv<T>(schema: SafeParseSchema<T>, input: unknown, scope: string): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid ${scope} environment variables:\n${issues}`);
  }

  return result.data;
}
