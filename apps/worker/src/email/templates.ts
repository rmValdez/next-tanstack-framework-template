import type { EmailJob, EmailTemplate } from "@workspace/core/queue/types";
import type { RenderedEmail } from "./mailer";

// Every interpolated value goes through escapeHtml: names are user input, and an
// unescaped name would let anyone inject markup into mail we send.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkEmail(options: {
  name: string;
  url: string;
  subject: string;
  intro: string;
  action: string;
  outro: string;
}): RenderedEmail {
  const { name, url, subject, intro, action, outro } = options;
  const greeting = name ? `Hi ${name},` : "Hi,";

  const text = [greeting, "", intro, "", url, "", outro].join("\n");

  // Inline styles and a table-free single column: the lowest common denominator
  // that renders in every mail client without a template engine.
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px">
      <p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 24px">${escapeHtml(intro)}</p>
      <p style="margin:0 0 24px">
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px">${escapeHtml(action)}</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#52525b">Or paste this link into your browser:</p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${escapeHtml(url)}" style="color:#2563eb">${escapeHtml(url)}</a></p>
      <p style="margin:0;font-size:13px;color:#52525b">${escapeHtml(outro)}</p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

// Keyed by template name with the job's own data type, so adding a variant to
// EmailJob without a template here is a type error.
const templates: {
  [T in EmailTemplate]: (data: Extract<EmailJob, { template: T }>["data"]) => RenderedEmail;
} = {
  "verify-email": ({ name, url }) =>
    linkEmail({
      name,
      url,
      subject: "Verify your email address",
      intro: "Confirm your email address to finish creating your account.",
      action: "Verify email",
      outro: "The link expires in 1 hour. If you didn't create an account, ignore this email.",
    }),
  "reset-password": ({ name, url }) =>
    linkEmail({
      name,
      url,
      subject: "Reset your password",
      intro: "We received a request to reset your password.",
      action: "Reset password",
      outro:
        "The link expires in 1 hour. If you didn't ask for a reset, ignore this email; your password is unchanged.",
    }),
};

export function renderEmail(job: EmailJob): RenderedEmail {
  // The union narrows per branch only through a switch; the lookup needs the cast.
  const render = templates[job.template] as (data: EmailJob["data"]) => RenderedEmail;
  return render(job.data);
}
