export const QUEUE_NAMES = {
  email: "email",
  // Jobs that failed EMAIL_MAX_DELIVERIES times land here for inspection instead of
  // being retried forever.
  emailDeadLetter: "email.dlq",
} as const;

// Total delivery attempts per job, counted by RabbitMQ (quorum queue delivery limit),
// so the limit holds across worker restarts.
export const EMAIL_MAX_DELIVERIES = 5;

interface LinkEmailData {
  name: string;
  url: string;
}

// A job carries a template name and data, never rendered HTML: templates and escaping
// live in the worker.
export type EmailJob =
  | { template: "verify-email"; to: string; data: LinkEmailData }
  | { template: "reset-password"; to: string; data: LinkEmailData };

export type EmailTemplate = EmailJob["template"];
