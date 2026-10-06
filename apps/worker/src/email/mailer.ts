import nodemailer from "nodemailer";
import { config } from "../config";

export const transport = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  // 465 is implicit TLS; other ports (587, Mailpit's 1025) upgrade with STARTTLS
  // when the server offers it.
  secure: config.SMTP_PORT === 465,
  auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
});

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(to: string, email: RenderedEmail): Promise<void> {
  await transport.sendMail({ from: config.SMTP_FROM, to, ...email });
}
