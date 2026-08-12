import { Injectable } from '@nestjs/common';
import { MailerService } from '../../core/mailer/mailer.service';
import { escapeHtml } from '../../../shared/escape-html';

// Content lives here (subject lines, copy); the actual SMTP transport
// lives in core/mailer, shared with payroll. Method signatures are
// unchanged from the original stub, so RequestsService — the only
// caller — needed no changes when this stopped being a stub.
@Injectable()
export class HelpdeskMailerService {
  constructor(private readonly mailer: MailerService) {}

  notifyRequestCreated(request: { email: string; fullName: string; publicCode: string }, hubLink: string) {
    return this.mailer.send({
      to: request.email,
      subject: `Request ${request.publicCode} received`,
      html: `
        <p>Hi ${escapeHtml(request.fullName)},</p>
        <p>We received your request. Your Request ID is <strong>${escapeHtml(request.publicCode)}</strong>.</p>
        <p>You can check its status anytime at the help desk hub: <a href="${hubLink}">${hubLink}</a></p>
      `,
    });
  }

  notifyRequestDenied(request: { email: string; fullName: string; publicCode: string; denialReason: string | null }) {
    return this.mailer.send({
      to: request.email,
      subject: `Request ${request.publicCode} was not accepted`,
      html: `
        <p>Hi ${escapeHtml(request.fullName)},</p>
        <p>Your request (<strong>${escapeHtml(request.publicCode)}</strong>) was not accepted.</p>
        <p>Reason: ${escapeHtml(request.denialReason ?? 'No reason given.')}</p>
      `,
    });
  }

  notifyRequestAccepted(request: { email: string; fullName: string; publicCode: string }) {
    return this.mailer.send({
      to: request.email,
      subject: `Request ${request.publicCode} accepted`,
      html: `
        <p>Hi ${escapeHtml(request.fullName)},</p>
        <p>IT support has accepted your request (<strong>${escapeHtml(request.publicCode)}</strong>) and will begin work soon.</p>
      `,
    });
  }

  notifyRequestDone(request: { email: string; fullName: string; publicCode: string }, hubLink: string) {
    return this.mailer.send({
      to: request.email,
      subject: `Request ${request.publicCode} resolved — please rate your experience`,
      html: `
        <p>Hi ${escapeHtml(request.fullName)},</p>
        <p>Your request (<strong>${escapeHtml(request.publicCode)}</strong>) has been resolved.</p>
        <p>Leave a rating here: <a href="${hubLink}">${hubLink}</a></p>
      `,
    });
  }
}
