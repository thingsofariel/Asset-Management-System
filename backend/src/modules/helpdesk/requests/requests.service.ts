import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, Priority, Request as HelpdeskRequest, RequestStatus } from '@prisma/client';
import { Subject } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { HelpdeskMailerService } from '../mailer/helpdesk-mailer.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { DenyRequestDto } from './dto/deny-request.dto';
import { AcceptRequestDto } from './dto/accept-request.dto';

// Unambiguous alphabet — no 0/O, 1/I/l — so codes are easy to read back over the phone.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePublicCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `REQ-${code}`;
}

// Everyone gets the same base hub URL — the code is what's specific to them.
function buildHubLink(code: string): string {
  const base = (process.env.APP_PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/hub?code=${encodeURIComponent(code)}`;
}

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  // In-memory SSE bus — same idea as the original notificationBus's
  // Set<res>, expressed as an RxJS stream since that's what NestJS's
  // @Sse() decorator on the controller consumes.
  private readonly events = new Subject<{ type: string; data: unknown }>();
  get eventStream() {
    return this.events.asObservable();
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: HelpdeskMailerService,
  ) {}

  async create(dto: CreateRequestDto, attachmentUrl?: string) {
    if (!dto.categoryId && !dto.customCategoryText) {
      throw new BadRequestException('categoryId or customCategoryText is required');
    }

    let priority: Priority = Priority.MEDIUM;
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (category) priority = category.defaultPriority;
    }
    if (dto.priority) priority = dto.priority;

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await this.insertWithUniqueCode(tx, {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        categoryId: dto.categoryId,
        customCategoryText: dto.customCategoryText,
        description: dto.description,
        attachmentUrl,
        priority,
      });
      await tx.requestActivityLog.create({
        data: { requestId: created.id, toStatus: RequestStatus.OPEN, note: 'Request submitted' },
      });
      return created;
    });

    const hubLink = buildHubLink(request.publicCode);
    this.mailer.notifyRequestCreated(request, hubLink).catch((err) => this.logger.error(err));

    // Real-time nudge to any admin dashboard currently connected.
    this.events.next({
      type: 'new_request',
      data: {
        id: request.id,
        publicCode: request.publicCode,
        fullName: request.fullName,
        description: request.description,
        priority: request.priority,
        createdAt: request.createdAt,
      },
    });

    return { message: 'Request created', publicCode: request.publicCode, hubLink, request };
  }

  // Tries a handful of freshly generated codes in case of a (very
  // unlikely) collision with an existing publicCode, rather than
  // letting the unique constraint fail the request outright.
  private async insertWithUniqueCode(
    tx: Prisma.TransactionClient,
    fields: {
      fullName: string;
      email: string;
      phone: string;
      categoryId?: number;
      customCategoryText?: string;
      description: string;
      attachmentUrl?: string;
      priority: Priority;
    },
  ): Promise<HelpdeskRequest> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const publicCode = generatePublicCode();
      try {
        return await tx.request.create({ data: { ...fields, publicCode } });
      } catch (err: any) {
        if (err.code === 'P2002' && attempt < 4) continue; // unique_violation — retry with a new code
        throw err;
      }
    }
    throw new Error('Failed to generate a unique request code');
  }

  async findByCode(code: string) {
    const request = await this.prisma.request.findUnique({
      where: { publicCode: code.toUpperCase() },
      include: { category: { select: { name: true } }, review: true },
    });
    if (!request) throw new NotFoundException('No request found with that Request ID');
    return request;
  }

  async submitReview(code: string, dto: SubmitReviewDto) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({ where: { publicCode: code.toUpperCase() } });
      if (!request) throw new NotFoundException('No request found with that Request ID');
      if (request.status !== RequestStatus.DONE) {
        throw new ConflictException(
          `Request must be 'done' before it can be reviewed (current: ${request.status})`,
        );
      }

      await tx.requestReview.upsert({
        where: { requestId: request.id },
        create: { requestId: request.id, rating: dto.rating, comment: dto.comment },
        update: { rating: dto.rating, comment: dto.comment },
      });

      await tx.request.update({
        where: { id: request.id },
        data: { status: RequestStatus.CLOSED, closedAt: new Date() },
      });
      await tx.requestActivityLog.create({
        data: {
          requestId: request.id,
          fromStatus: RequestStatus.DONE,
          toStatus: RequestStatus.CLOSED,
          note: 'Review submitted',
        },
      });

      return { message: 'Review submitted, request closed' };
    });
  }

  // Priority-queue ordering: highest priority first, then oldest first.
  findAll(filters: { status?: RequestStatus; priority?: Priority }) {
    return this.prisma.request.findMany({
      where: { status: filters.status, priority: filters.priority },
      include: { category: { select: { name: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: number) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: { category: { select: { name: true } }, review: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  // Shared helper: safely transitions a request's status with an
  // activity log entry, inside one transaction.
  private async transition(
    id: number,
    allowedFrom: RequestStatus[],
    toStatus: RequestStatus,
    extraSet: Record<string, unknown>,
    note: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Request not found');
      if (!allowedFrom.includes(request.status)) {
        throw new ConflictException(
          `Request must be one of [${allowedFrom.join(', ')}] (current: ${request.status})`,
        );
      }

      const updated = await tx.request.update({ where: { id }, data: { status: toStatus, ...extraSet } });
      await tx.requestActivityLog.create({
        data: { requestId: id, fromStatus: request.status, toStatus, note },
      });
      return updated;
    });
  }

  async accept(id: number, dto: AcceptRequestDto) {
    const extraSet: Record<string, unknown> = { acceptedAt: new Date() };
    if (dto.priority) extraSet.priority = dto.priority;

    const request = await this.transition(id, [RequestStatus.OPEN], RequestStatus.ACCEPTED, extraSet, 'Accepted by IT');
    this.mailer.notifyRequestAccepted(request).catch((err) => this.logger.error(err));
    return request;
  }

  async deny(id: number, dto: DenyRequestDto) {
    const request = await this.transition(
      id,
      [RequestStatus.OPEN],
      RequestStatus.DENIED,
      { denialReason: dto.reason, closedAt: new Date() },
      'Denied by IT',
    );
    this.mailer.notifyRequestDenied(request).catch((err) => this.logger.error(err));
    return request;
  }

  start(id: number) {
    return this.transition(id, [RequestStatus.ACCEPTED], RequestStatus.IN_PROGRESS, { startedAt: new Date() }, 'Work started');
  }

  async complete(id: number) {
    const request = await this.transition(
      id,
      [RequestStatus.IN_PROGRESS],
      RequestStatus.DONE,
      { completedAt: new Date() },
      'Marked done, awaiting review',
    );
    const hubLink = buildHubLink(request.publicCode);
    this.mailer.notifyRequestDone(request, hubLink).catch((err) => this.logger.error(err));
    return request;
  }
}
