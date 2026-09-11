/**
 * Shared Kafka transport config.
 * ------------------------------
 * One broker list from env (KAFKA_BROKER, default localhost:9092 for the docker
 * compose Kafka). clientId identifies the producer; groupId is the CONSUMER GROUP —
 * all instances of a service share it so Kafka assigns each partition to exactly
 * one instance (horizontal scaling + ordered processing per partition).
 */

import { Transport, type KafkaOptions } from '@nestjs/microservices';

const BROKER = process.env.KAFKA_BROKER ?? 'localhost:9092';

export function kafkaOptions(clientId: string, groupId: string): KafkaOptions {
  return {
    transport: Transport.KAFKA,
    options: {
      client: { clientId, brokers: [BROKER] },
      consumer: { groupId },
      // retry with backoff so a transient broker hiccup doesn't drop the consumer
      run: { autoCommit: true },
    },
  };
}

// Config for a service that also PRODUCES (ClientsModule.register).
export function kafkaClientConfig(clientId: string, groupId: string) {
  return {
    transport: Transport.KAFKA as const,
    options: {
      client: { clientId, brokers: [BROKER] },
      consumer: { groupId: `${groupId}-client` },
    },
  };
}
