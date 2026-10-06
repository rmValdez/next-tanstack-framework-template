import { publishEmail } from "@workspace/core/queue/producer";
import type { EmailJob } from "@workspace/core/queue/types";

// Server-only. Emails are rendered and sent by apps/worker; this only queues the job.
//
// Never throws: the user row already exists when Better Auth calls the senders, so
// failing here would leave a half-completed sign-up. If the broker is down the email
// is lost and the user recovers with "Resend verification email" or "Forgot password".
export async function queueEmail(job: EmailJob): Promise<void> {
  try {
    await publishEmail(job);
  } catch (error) {
    console.error(`[email] Could not queue "${job.template}" for ${job.to}:`, error);
  }
}
