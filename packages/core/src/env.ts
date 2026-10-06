import { z } from "zod";

// Shared by the Better Auth server config and the sign-up form, so client-side
// validation cannot disagree with the server's floor.
export const MIN_PASSWORD_LENGTH = 8;

export function parseEnv<T extends z.ZodTypeAny>(schema: T, input: unknown, scope: string) {
  const result = schema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid ${scope} environment variables:\n${issues}`);
  }

  return result.data as z.infer<T>;
}
