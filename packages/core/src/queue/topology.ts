import type { Channel } from "amqplib";
import { EMAIL_MAX_DELIVERIES, QUEUE_NAMES } from "./types";

/**
 * Declares the email queues. Called by both producer and consumer: RabbitMQ rejects a
 * declaration whose arguments differ from the existing queue, so both sides must share
 * this one definition.
 */
export async function assertEmailQueues(channel: Channel): Promise<void> {
  await channel.assertQueue(QUEUE_NAMES.emailDeadLetter, {
    durable: true,
    arguments: { "x-queue-type": "quorum" },
  });

  await channel.assertQueue(QUEUE_NAMES.email, {
    durable: true,
    arguments: {
      // Quorum queues count redeliveries themselves; a classic queue + nack(requeue)
      // would loop forever on a poison message.
      "x-queue-type": "quorum",
      "x-delivery-limit": EMAIL_MAX_DELIVERIES - 1,
      // Default exchange + routing key = publish straight to the dead-letter queue.
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": QUEUE_NAMES.emailDeadLetter,
    },
  });
}
