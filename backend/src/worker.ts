// Standalone worker process entry point. Run with its OWN process,
// separate from src/main.ts:
//   node dist/worker.js          (production, after `nest build`)
//   npx ts-node src/worker.ts    (dev)
//
// Per BullMQ's own production guidance: if the worker runs inside the
// API process, a worker crash takes the API down with it. This file
// exists specifically so that never happens — see worker.module.ts.
// In production this would run as its own systemd service / Docker
// container / pm2 process, same as the original.

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { BulkImportWorkerModule } from './modules/payroll/bulk-import/worker.module';

async function bootstrap() {
  const logger = new Logger('Worker');

  // createApplicationContext, not create() — this process has no HTTP
  // server, it only needs the DI container so the @Processor can be
  // instantiated and start consuming jobs.
  const app = await NestFactory.createApplicationContext(BulkImportWorkerModule);
  logger.log('Bulk import worker started, listening on queue: bulk-payslip-import');

  const shutdown = async () => {
    logger.log('Worker shutting down...');
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap();
