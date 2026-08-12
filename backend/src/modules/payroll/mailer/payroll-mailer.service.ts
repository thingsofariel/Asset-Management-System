import { Injectable } from '@nestjs/common';
import { MailerService } from '../../core/mailer/mailer.service';
import { escapeHtml } from '../../../shared/escape-html';

@Injectable()
export class PayrollMailerService {
  constructor(private readonly mailer: MailerService) {}

  // Deliberately does NOT include salary figures or attach the PDF —
  // email isn't a fully secure channel, and a forwarded/leaked email
  // shouldn't expose payroll data. The link requires login (or the
  // share token) to actually view anything.
  notifyPayslipReady(to: string, fullName: string, periodLabel: string, viewLink: string) {
    return this.mailer.send({
      to,
      subject: `Your payslip for ${periodLabel} is ready`,
      html: `
        <p>Hi ${escapeHtml(fullName)},</p>
        <p>Your payslip for <strong>${escapeHtml(periodLabel)}</strong> has been finalized and is ready to view.</p>
        <p><a href="${viewLink}">View your payslip</a></p>
        <p style="color:#666;font-size:0.9em">This email doesn't include your salary figures — you'll need to open the link to view them.</p>
      `,
    });
  }
}
