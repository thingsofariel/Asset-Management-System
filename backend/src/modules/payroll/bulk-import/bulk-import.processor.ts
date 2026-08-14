import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PayslipStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BULK_IMPORT_QUEUE_NAME } from './redis-connections';

interface ImportJobData {
  employeeId: number;
  periodMonth: number;
  periodYear: number;
  issueDate: string;
  issueLocation?: string;
  basicSalary: number;
  authorizedSignatory: string;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  actorId: string; // core User id, not Employee id
  batchId: string;
  sourceRowNumber: number;
}

// Only ever instantiated inside the standalone worker process (see
// src/worker.ts) — never imported into the main API's AppModule.
@Processor(BULK_IMPORT_QUEUE_NAME, { concurrency: 5 })
export class BulkImportProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkImportProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ImportJobData>) {
    const {
      employeeId,
      periodMonth,
      periodYear,
      issueDate,
      issueLocation,
      basicSalary,
      authorizedSignatory,
      earnings,
      deductions,
      actorId,
    } = job.data;

    // Re-validate employeeId exists — the CSV could reference an
    // employeeId that looked numeric but doesn't correspond to a real
    // row, and this is the first point with actual DB access to check.
    const employeeExists = await this.prisma.employee.findUnique({ where: { employeeId } });
    if (!employeeExists) {
      throw new Error(`employeeId ${employeeId} does not exist.`);
    }

    const payslip = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payslip.create({
        data: {
          employeeId,
          periodMonth,
          periodYear,
          issueDate: new Date(issueDate),
          issueLocation: issueLocation || 'Kupang',
          basicSalary,
          authorizedSignatory,
          status: PayslipStatus.DRAFT,
        },
      });

      if (earnings.length > 0) {
        await tx.earningDetail.createMany({
          data: earnings.map((e, idx) => ({
            payslipId: created.payslipId,
            label: e.label,
            category: 'ALLOWANCE',
            amount: e.amount,
            sortOrder: idx,
          })),
        });
      }
      if (deductions.length > 0) {
        await tx.deductionDetail.createMany({
          data: deductions.map((d, idx) => ({
            payslipId: created.payslipId,
            label: d.label,
            category: 'OTHER',
            amount: d.amount,
            sortOrder: idx,
          })),
        });
      }

      return created;
    });

    await this.prisma.payrollAuditLog.create({
      data: {
        payslipId: payslip.payslipId,
        actorId,
        action: 'CREATE',
        detail: `Created via bulk CSV import (job ${job.id}).`,
      },
    });

    return { payslipId: payslip.payslipId, employeeId };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: { payslipId: number }) {
    this.logger.log(`Job ${job.id} completed — created payslip ${result.payslipId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.error(`Job ${job?.id} failed: ${err.message}`);
  }
}
