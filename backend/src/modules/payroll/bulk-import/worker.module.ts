import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BulkImportProcessor } from './bulk-import.processor';
import { BULK_IMPORT_QUEUE_NAME, createWorkerConnection } from './redis-connections';

// Bootstrap module for the standalone worker process (src/worker.ts)
// — deliberately never imported into the main API's AppModule.
// Keeping it fully separate means a worker crash can never take the
// API down with it, matching the original's explicit two-process
// design (see the comment in bulkImportWorker.js it was ported from).
@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({ connection: createWorkerConnection() }),
    BullModule.registerQueue({ name: BULK_IMPORT_QUEUE_NAME }),
  ],
  providers: [BulkImportProcessor],
})
export class BulkImportWorkerModule {}
