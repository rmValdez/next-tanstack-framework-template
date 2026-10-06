import { assertEmailQueues } from "@workspace/core/queue/topology";
import { EMAIL_MAX_DELIVERIES, QUEUE_NAMES, type EmailJob } from "@workspace/core/queue/types";
import { connect, type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import { z } from "zod";
import { config } from "./config";
import { sendMail } from "./email/mailer";
import { renderEmail } from "./email/templates";

const PREFETCH = 5;
const MAX_RECONNECT_DELAY_MS = 30_000;

// Links are rendered into href attributes; anything but http(s) (e.g. javascript:)
// is rejected even though the only producer is our own accounts app.
const httpUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "must be an http(s) URL");

const linkData = z.object({ name: z.string(), url: httpUrl });

// Mirrors the EmailJob union in @workspace/core; `satisfies` keeps the two in step.
const emailJobSchema = z.discriminatedUnion("template", [
  z.object({ template: z.literal("verify-email"), to: z.string().email(), data: linkData }),
  z.object({ template: z.literal("reset-password"), to: z.string().email(), data: linkData }),
]) satisfies z.ZodType<EmailJob>;

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let consumerTag: string | null = null;
let stopping = false;
let reconnectAttempt = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
const inFlight = new Set<Promise<void>>();

export function isConnected(): boolean {
  return channel !== null;
}

/** Connects in the background and keeps retrying; never throws. */
export function startConsumer(): void {
  stopping = false;
  void connectAndConsume();
}

async function connectAndConsume(): Promise<void> {
  reconnectTimer = null;
  try {
    const conn = await connect(config.RABBITMQ_URL);
    connection = conn;
    conn.on("error", (error: unknown) => {
      console.error("[worker] Broker connection error:", errorMessage(error));
    });
    conn.on("close", () => {
      connection = null;
      channel = null;
      consumerTag = null;
      if (!stopping) {
        console.warn("[worker] Broker connection closed.");
        scheduleReconnect();
      }
    });

    const ch = await conn.createChannel();
    // Same declaration as the producer (delivery limit + dead-letter queue).
    await assertEmailQueues(ch);
    // Backpressure: at most PREFETCH unacknowledged jobs on this worker at a time.
    await ch.prefetch(PREFETCH);
    const { consumerTag: tag } = await ch.consume(QUEUE_NAMES.email, (msg) => {
      if (!msg) return;
      const task = handleMessage(ch, msg).finally(() => inFlight.delete(task));
      inFlight.add(task);
    });

    channel = ch;
    consumerTag = tag;
    reconnectAttempt = 0;
    console.info(`[worker] Consuming "${QUEUE_NAMES.email}" (prefetch ${PREFETCH}).`);
  } catch (error) {
    console.error("[worker] Could not connect to the broker:", errorMessage(error));
    // A connection that opened but failed later (e.g. queue declaration) would never
    // emit the close that triggers a retry, so close it quietly and retry from here.
    const conn = connection;
    connection = null;
    channel = null;
    if (conn) {
      conn.removeAllListeners("close");
      await conn.close().catch(() => {});
    }
    if (!stopping) scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  const delay = Math.min(1000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
  reconnectAttempt += 1;
  console.info(`[worker] Reconnecting in ${delay / 1000}s.`);
  reconnectTimer = setTimeout(() => void connectAndConsume(), delay);
}

async function handleMessage(ch: Channel, msg: ConsumeMessage): Promise<void> {
  // Quorum queues set this header from the second delivery on.
  const previousDeliveries = Number(msg.properties.headers?.["x-delivery-count"] ?? 0);
  const attempt = previousDeliveries + 1;

  let job: EmailJob;
  try {
    job = emailJobSchema.parse(JSON.parse(msg.content.toString()));
  } catch (error) {
    // A malformed job fails the same way every time: dead-letter it now instead of
    // spending the remaining deliveries on it.
    console.error("[worker] Invalid email job, moved to dead-letter queue:", errorMessage(error));
    ch.nack(msg, false, false);
    return;
  }

  try {
    await sendMail(job.to, renderEmail(job));
    ch.ack(msg);
    console.info(`[worker] Sent "${job.template}" to ${job.to}.`);
  } catch (error) {
    const final = attempt >= EMAIL_MAX_DELIVERIES;
    console.error(
      `[worker] Sending "${job.template}" to ${job.to} failed ` +
        `(attempt ${attempt}/${EMAIL_MAX_DELIVERIES}${final ? ", moving to dead-letter queue" : ""}):`,
      errorMessage(error)
    );
    if (final) {
      ch.nack(msg, false, false);
      return;
    }
    // A requeued message is redelivered at once, so without a pause a short SMTP
    // outage would use up every attempt. Back off 2s, 4s, 8s, 16s.
    await sleep(1000 * 2 ** attempt);
    // If the channel closed meanwhile, RabbitMQ has already requeued the message.
    if (channel === ch) ch.nack(msg, false, true);
  }
}

/** Stops taking new jobs, lets in-flight ones finish, then closes the connection. */
export async function stopConsumer(): Promise<void> {
  stopping = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (channel && consumerTag) await channel.cancel(consumerTag).catch(() => {});
  await Promise.allSettled(inFlight);
  channel = null;
  await connection?.close().catch(() => {});
  connection = null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
