import { z } from "zod";
import { parseEnv } from "./env";

const urlsSchema = z.object({
  NEXT_PUBLIC_ACCOUNTS_URL: z.string().url().default("http://localhost:5011"),
  NEXT_PUBLIC_WEB_URL: z.string().url().default("http://localhost:5010"),
});

// Referenced as literals, not iterated: Next.js only inlines `process.env.NEXT_PUBLIC_*`
// into the client bundle for statically analyzable member expressions.
const urls = parseEnv(
  urlsSchema,
  {
    NEXT_PUBLIC_ACCOUNTS_URL: process.env.NEXT_PUBLIC_ACCOUNTS_URL || undefined,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || undefined,
  },
  "public URL"
);

// Trailing slashes stripped so callers can always append "/path".
export const accountsUrl = urls.NEXT_PUBLIC_ACCOUNTS_URL.replace(/\/+$/, "");
export const webUrl = urls.NEXT_PUBLIC_WEB_URL.replace(/\/+$/, "");
