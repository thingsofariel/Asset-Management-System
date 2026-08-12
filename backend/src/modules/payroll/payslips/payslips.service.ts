import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { randomBytes } from 'crypto';
import { PayslipStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { PayrollMailerService } from '../mailer/payroll-mailer.service';
import { CreatePayslipDto } from './dto/create-payslip.dto';

const FULL_INCLUDE = {
  employee: { include: { user: { select: { id: true, fullName: true, email: true } } } },
  earningDetails: { orderBy: { sortOrder: 'asc' as const } },
  deductionDetails: { orderBy: { sortOrder: 'asc' as const } },
};

type FullPayslip = Prisma.PayslipGetPayload<{ include: typeof FULL_INCLUDE }>;

@Injectable()
export class PayslipsService {
  private readonly logger = new Logger(PayslipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly mailer: PayrollMailerService,
  ) {}

  // The unified JWT carries core userId, not employeeId — the original
  // system's req.user.employeeId came for free since Employee WAS the
  // auth table. Every ownership/actor check here resolves it via this
  // lookup instead.
  private async resolveEmployee(userId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new ForbiddenException('No employee record is linked to this account');
    return employee;
  }

  /**
   * ADMIN sees all payslips (optionally filtered by ?employeeId=).
   * EMPLOYEE sees only their own, regardless of query params — identity
   * comes from the verified JWT via resolveEmployee(), never a
   * client-supplied employeeId.
   */
  async listForUser(
    user: { userId: string; role: Role },
    query: { employeeId?: string; year?: string; month?: string },
  ) {
    const where: Prisma.PayslipWhereInput = {};

    if (user.role === Role.EMPLOYEE) {
      const employee = await this.resolveEmployee(user.userId);
      where.employeeId = employee.employeeId;
    } else if (query.employeeId) {
      where.employeeId = Number(query.employeeId);
    }

    if (query.year) where.periodYear = Number(query.year);
    if (query.month) where.periodMonth = Number(query.month);

    return this.prisma.payslip.findMany({
      where,
      include: { employee: { include: { user: { select: { fullName: true } } } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  private async canAccess(payslip: { employeeId: number }, user: { userId: string; role: Role }): Promise<boolean> {
    if (user.role === Role.ADMIN) return true;
    const employee = await this.prisma.employee.findUnique({ where: { userId: user.userId } });
    return employee?.employeeId === payslip.employeeId;
  }

  /** Same ownership rule enforced per-record — can't fetch someone else's by guessing/incrementing the ID. */
  async findOneForUser(payslipId: number, user: { userId: string; role: Role }): Promise<FullPayslip> {
    const payslip = await this.prisma.payslip.findUnique({ where: { payslipId }, include: FULL_INCLUDE });
    if (!payslip) throw new NotFoundException('Payslip not found');

    if (!(await this.canAccess(payslip, user))) {
      // 404, not 403 — don't reveal that a payslip with this ID exists
      // at all to someone who has no right to see it.
      throw new NotFoundException('Payslip not found');
    }
    return payslip;
  }

  /**
   * Creates a payslip header plus its earning/deduction line items in a
   * single transaction. Totals are NOT computed here — the DB trigger
   * (recalc_payslip_totals, see prisma/manual-migrations/) fires once
   * the line items are inserted, same as the original.
   */
  async create(dto: CreatePayslipDto, actorUserId: string) {
    const actor = await this.resolveEmployee(actorUserId);

    let payslip;
    try {
      payslip = await this.prisma.$transaction(async (tx) => {
        const created = await tx.payslip.create({
          data: {
            employeeId: dto.employeeId,
            periodMonth: dto.periodMonth,
            periodYear: dto.periodYear,
            issueDate: new Date(dto.issueDate),
            issueLocation: dto.issueLocation ?? 'Kupang',
            basicSalary: dto.basicSalary,
            authorizedSignatory: dto.authorizedSignatory,
            status: PayslipStatus.DRAFT,
          },
        });

        if (dto.earnings?.length) {
          await tx.earningDetail.createMany({
            data: dto.earnings.map((e, idx) => ({
              payslipId: created.payslipId,
              label: e.label,
              category: e.category ?? 'ALLOWANCE',
              amount: e.amount,
              sortOrder: idx,
            })),
          });
        }
        if (dto.deductions?.length) {
          await tx.deductionDetail.createMany({
            data: dto.deductions.map((d, idx) => ({
              payslipId: created.payslipId,
              label: d.label,
              category: d.category ?? 'OTHER',
              amount: d.amount,
              sortOrder: idx,
            })),
          });
        }

        // Re-fetch so the response includes the trigger-calculated
        // totals, not the stale zero-value totals from the initial insert.
        return tx.payslip.findUnique({
          where: { payslipId: created.payslipId },
          include: { earningDetails: true, deductionDetails: true },
        });
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('A payslip for this employee and period already exists.');
      }
      throw err;
    }

    await this.prisma.payrollAuditLog.create({
      data: {
        payslipId: payslip!.payslipId,
        actorId: actor.employeeId,
        action: 'CREATE',
        detail: `Payslip created for employee ${dto.employeeId}, period ${dto.periodMonth}/${dto.periodYear}`,
      },
    });

    return payslip;
  }

  /** Transitions DRAFT -> FINALIZED. PDF is generated before the status flips, so a Puppeteer failure leaves it in DRAFT rather than FINALIZED with no document. */
  async finalize(payslipId: number, actorUserId: string) {
    const actor = await this.resolveEmployee(actorUserId);
    const payslip = await this.prisma.payslip.findUnique({ where: { payslipId }, include: FULL_INCLUDE });
    if (!payslip) throw new NotFoundException('Payslip not found');
    if (payslip.status !== PayslipStatus.DRAFT) {
      throw new ConflictException(
        `Cannot finalize a payslip with status "${payslip.status}". Only DRAFT payslips can be finalized.`,
      );
    }

    const { filePath, verificationHash } = await this.pdfService.generatePayslipPdf(payslip);

    const updated = await this.prisma.payslip.update({
      where: { payslipId },
      data: { status: PayslipStatus.FINALIZED, pdfPath: filePath, pdfGeneratedAt: new Date(), verificationHash },
    });

    await this.prisma.payrollAuditLog.create({
      data: { payslipId, actorId: actor.employeeId, action: 'FINALIZE', detail: 'Payslip finalized and PDF generated.' },
    });

    // Best-effort — nothing in this block should be able to make
    // finalize() itself fail. The payslip is correctly finalized
    // either way; HR can always fall back to manual outreach + markSent.
    try {
      const { link } = await this.getOrCreateShareLink(payslipId);
      const periodLabel = `${payslip.periodMonth}/${payslip.periodYear}`;
      await this.mailer.notifyPayslipReady(payslip.employee.user.email, payslip.employee.user.fullName, periodLabel, link);
    } catch (err: any) {
      this.logger.error(`Failed to send payslip-ready notification: ${err.message}`);
    }

    return updated;
  }

  /** Manual confirmation, independent of the automatic email finalize() now sends — useful as an explicit audit record, or if HR handed it over another way (e.g. the automatic email bounced). */
  async markSent(payslipId: number, actorUserId: string) {
    const actor = await this.resolveEmployee(actorUserId);
    const payslip = await this.prisma.payslip.findUnique({ where: { payslipId } });
    if (!payslip) throw new NotFoundException('Payslip not found');
    if (payslip.status !== PayslipStatus.FINALIZED) {
      throw new ConflictException(
        `Cannot mark as sent — payslip status is "${payslip.status}". Only FINALIZED payslips can be marked as sent.`,
      );
    }

    const updated = await this.prisma.payslip.update({ where: { payslipId }, data: { status: PayslipStatus.SENT } });

    await this.prisma.payrollAuditLog.create({
      data: { payslipId, actorId: actor.employeeId, action: 'MARK_SENT', detail: 'Payslip manually marked as sent to employee.' },
    });

    return updated;
  }

  async getOrCreateShareLink(payslipId: number) {
    const payslip = await this.prisma.payslip.findUnique({ where: { payslipId } });
    if (!payslip) throw new NotFoundException('Payslip not found');

    let { shareToken } = payslip;
    if (!shareToken) {
      shareToken = randomBytes(24).toString('hex');
      await this.prisma.payslip.update({ where: { payslipId }, data: { shareToken } });
    }

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173';
    return { link: `${frontendBaseUrl}/slip/${shareToken}` };
  }

  async loadFullByShareToken(shareToken: string): Promise<FullPayslip | null> {
    return this.prisma.payslip.findUnique({ where: { shareToken }, include: FULL_INCLUDE });
  }

  canAccessLoaded(payslip: { employeeId: number }, user: { userId: string; role: Role }) {
    return this.canAccess(payslip, user);
  }

  /** Serves the cached PDF if present, otherwise generates and caches it. Shared by both the by-id and by-share-token routes so they never drift apart. */
  async servePdfFile(payslip: FullPayslip): Promise<string> {
    if (payslip.pdfPath && fs.existsSync(payslip.pdfPath)) {
      return payslip.pdfPath;
    }
    const { filePath, verificationHash } = await this.pdfService.generatePayslipPdf(payslip);
    await this.prisma.payslip.update({
      where: { payslipId: payslip.payslipId },
      data: { pdfPath: filePath, pdfGeneratedAt: new Date(), verificationHash },
    });
    return filePath;
  }

  /** Public — no auth. Deliberately returns only non-sensitive confirmation info, never the actual payroll figures. */
  async verifyByHash(hash: string) {
    const payslip = await this.prisma.payslip.findFirst({
      where: { verificationHash: hash },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    });
    if (!payslip) {
      return { valid: false, message: 'No payslip matches this verification code.' };
    }
    return {
      valid: true,
      employeeName: payslip.employee.user.fullName,
      period: `${payslip.periodMonth}/${payslip.periodYear}`,
      status: payslip.status,
      authorizedSignatory: payslip.authorizedSignatory,
      issueDate: payslip.issueDate,
      // Deliberately omitted: basicSalary, totalEarnings, totalDeductions, netPay.
    };
  }
}
