import IORedis from 'ioredis';

export const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export const BULK_IMPORT_QUEUE_NAME = 'bulk-payslip-import';

// PRODUCER connection (API process, enqueuing jobs). Fails fast if
// Redis is unreachable rather than hanging the HTTP request:
//   - maxRetriesPerRequest: 1 — surface an error quickly instead of
//     spinning.
//   - enableOfflineQueue: false — fail the .add() call instead of
//     silently buffering commands while disconnected.
export function createProducerConnection() {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
}

// CONSUMER connection (worker process). Patient — keeps retrying in
// the background if Redis blips, rather than failing fast like an
// HTTP-facing producer should.
//   - maxRetriesPerRequest: null is REQUIRED by BullMQ Workers — they
//     use blocking Redis commands (BLPOP) internally, and ioredis
//     throws if a max retry count is set on those.
// Deliberately a separate connection object from the producer's —
// sharing one across both roles is a documented BullMQ footgun that
// forces one role's correct behavior onto the other.
export function createWorkerConnection() {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
}
