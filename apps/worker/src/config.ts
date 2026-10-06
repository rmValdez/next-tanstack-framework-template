import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const configSchema = z.object({
  RABBITMQ_URL: z.string().min(1, "RABBITMQ_URL is required."),
  WORKER_PORT: z.coerce.number().int().positive().default(5012),
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(5003),
  // Empty means "no auth" (Mailpit); `.env` lines like `SMTP_USER=` arrive as "".
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().min(1).default("Next TanStack Template <no-reply@localhost>"),
});

// Parsed at import so a misconfigured worker exits at startup with every problem
// listed, instead of failing on the first job.
export const config = parseEnv(
  configSchema,
  {
    RABBITMQ_URL: process.env.RABBITMQ_URL,
    WORKER_PORT: process.env.WORKER_PORT || undefined,
    SMTP_HOST: process.env.SMTP_HOST || undefined,
    SMTP_PORT: process.env.SMTP_PORT || undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM || undefined,
  },
  "worker"
);
