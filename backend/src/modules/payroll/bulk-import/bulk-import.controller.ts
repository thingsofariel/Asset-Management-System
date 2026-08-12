import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { BulkImportService } from './bulk-import.service';
import { BULK_IMPORT_QUEUE_NAME } from './redis-connections';

@Controller('payslips/bulk-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class BulkImportController {
  constructor(
    private readonly bulkImportService: BulkImportService,
    private readonly prisma: PrismaService,
    @InjectQueue(BULK_IMPORT_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  /**
   * Validation happens synchronously here, BEFORE anything is
   * enqueued — a CSV with bad rows is rejected immediately with a
   * full list of problems, rather than the admin discovering failures
   * one at a time as jobs trickle through the queue. Valid rows are
   * enqueued individually — one bad row doesn't block the others.
   */
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async bulkImport(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { userId: string }) {
    if (!file) throw new BadRequestException('No file uploaded. Expected a CSV file in the "file" field.');

    const csvText = file.buffer.toString('utf-8');
    const parsedRows = this.bulkImportService.parseAndValidateCsv(csvText);

    const validRows = parsedRows.filter((r) => r.errors.length === 0);
    const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

    if (validRows.length === 0) {
      throw new BadRequestException({
        error: 'No valid rows found in the CSV.',
        invalidRows: invalidRows.map((r) => ({ row: r.rowNumber, errors: r.errors })),
      });
    }

    // req.user.employeeId came for free in the original since Employee
    // WAS the auth table — resolved via lookup here instead.
    const actor = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
      select: { employeeId: true },
    });
    if (!actor) throw new BadRequestException('No employee record is linked to this account');

    // Generated up front so the response can tell the admin how to
    // poll for status, even though jobs are still being enqueued below.
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const jobs = await Promise.all(
      validRows.map((row) =>
        this.queue.add(
          'import-row',
          {
            employeeId: Number(row.data.employeeId),
            periodMonth: Number(row.data.periodMonth),
            periodYear: Number(row.data.periodYear),
            issueDate: row.data.issueDate,
            issueLocation: row.data.issueLocation || 'Kupang',
            basicSalary: Number(row.data.basicSalary),
            authorizedSignatory: row.data.authorizedSignatory,
            earnings: row.earnings,
            deductions: row.deductions,
            actorId: actor.employeeId,
            batchId,
            sourceRowNumber: row.rowNumber,
          },
          // jobId scoped to batch + row keeps IDs unique across
          // concurrent imports with no extra bookkeeping.
          { jobId: `${batchId}-row-${row.rowNumber}` },
        ),
      ),
    );

    return {
      batchId,
      queuedCount: jobs.length,
      skippedCount: invalidRows.length,
      invalidRows: invalidRows.map((r) => ({ row: r.rowNumber, errors: r.errors })),
      message: `${jobs.length} row(s) queued for processing. Poll /payslips/bulk-import/${batchId}/status for progress.`,
    };
  }

  /**
   * BullMQ doesn't index jobs by arbitrary data fields natively, so
   * this fetches a bounded window of each state and filters to this
   * batch — a practical compromise at this scale, not something built
   * for thousands of concurrent batches.
   */
  @Get(':batchId/status')
  async status(@Param('batchId') batchId: string) {
    const [completed, failed, active, waiting] = await Promise.all([
      this.queue.getJobs(['completed'], 0, 500),
      this.queue.getJobs(['failed'], 0, 500),
      this.queue.getJobs(['active'], 0, 500),
      this.queue.getJobs(['waiting'], 0, 500),
    ]);

    const matchesBatch = (job: Job) => job.data.batchId === batchId;
    const completedForBatch = completed.filter(matchesBatch);
    const failedForBatch = failed.filter(matchesBatch);
    const activeForBatch = active.filter(matchesBatch);
    const waitingForBatch = waiting.filter(matchesBatch);

    const total = completedForBatch.length + failedForBatch.length + activeForBatch.length + waitingForBatch.length;
    if (total === 0) throw new NotFoundException('No jobs found for this batch ID.');

    return {
      batchId,
      total,
      completed: completedForBatch.length,
      failed: failedForBatch.length,
      active: activeForBatch.length,
      waiting: waitingForBatch.length,
      isDone: activeForBatch.length === 0 && waitingForBatch.length === 0,
      failures: failedForBatch.map((j) => ({
        row: j.data.sourceRowNumber,
        employeeId: j.data.employeeId,
        reason: j.failedReason,
      })),
    };
  }
}
