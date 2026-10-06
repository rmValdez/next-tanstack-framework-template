import { connect, type ChannelModel, type ConfirmChannel } from "amqplib";
import { z } from "zod";
import { parseEnv } from "../env";
import { assertEmailQueues } from "./topology";
import { QUEUE_NAMES, type EmailJob } from "./types";

// Server-only: never import from a client component.

let channelPromise: Promise<ConfirmChannel> | null = null;

// Parsed on first publish rather than at import, so apps that import the queue types
// without publishing don't need RABBITMQ_URL.
function rabbitmqUrl(): string {
  return parseEnv(
    z.object({ RABBITMQ_URL: z.string().min(1, "RABBITMQ_URL is required.") }),
    { RABBITMQ_URL: process.env.RABBITMQ_URL },
    "queue"
  ).RABBITMQ_URL;
}

async function openChannel(): Promise<ConfirmChannel> {
  const connection: ChannelModel = await connect(rabbitmqUrl());
  // Drop the cached channel when the broker goes away, so the next publish reconnects
  // instead of writing to a dead socket.
  const reset = () => {
    channelPromise = null;
  };
  connection.on("close", reset);
  connection.on("error", reset);

  const channel = await connection.createConfirmChannel();
  channel.on("close", reset);
  channel.on("error", reset);
  await assertEmailQueues(channel);
  return channel;
}

function getChannel(): Promise<ConfirmChannel> {
  if (!channelPromise) {
    channelPromise = openChannel().catch((error: unknown) => {
      channelPromise = null;
      throw error;
    });
  }
  return channelPromise;
}

/**
 * Queues an email job. Resolves once the broker has confirmed the message is stored
 * (persistent, durable queue); throws if the broker is unreachable or rejects it.
 * Callers decide whether a failure should fail their request.
 */
export async function publishEmail(job: EmailJob): Promise<void> {
  const channel = await getChannel();
  channel.sendToQueue(QUEUE_NAMES.email, Buffer.from(JSON.stringify(job)), {
    persistent: true,
    contentType: "application/json",
  });
  await channel.waitForConfirms();
}
