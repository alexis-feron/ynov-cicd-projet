import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";

let container: StartedRedisContainer | null = null;

export async function startTestRedis(): Promise<string> {
  container = await new RedisContainer("redis:7-alpine").start();
  return container.getConnectionUrl(); // redis://localhost:<port>
}

export async function stopTestRedis(): Promise<void> {
  await container?.stop();
  container = null;
}
