// Renders a payslip record into a PDF using Puppeteer (HTML -> PDF),
// and embeds a verification QR code.
//
// NOTE ported from the original: this could not be run end-to-end in
// the authoring sandbox — no Chromium binary, no network access to
// install one. Puppeteer launching a real headless Chrome process is
// something only your environment can verify. Expect to debug
// something on the first real run — that's normal, not a sign
// anything is fundamentally wrong.

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as puppeteer from 'puppeteer';
import * as QRCode from 'qrcode';
import { Prisma } from '@prisma/client';

const TEMPLATE_PATH = path.join(__dirname, 'templates', 'payslip.html');
const STORAGE_DIR = path.join(process.cwd(), process.env.STORAGE_DIR ?? './storage', 'payslip-pdfs');

const COMPANY_NAME = process.env.COMPANY_NAME ?? 'PT Contoh Sejahtera';
const COMPANY_TAGLINE = process.env.COMPANY_TAGLINE ?? 'Jl. Contoh No. 1, Kupang, NTT';

// Indonesian month names for the period label (e.g. "Juni 2026").
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// The fully-loaded shape this service needs: a Payslip with its
// employee (and that employee's User, for fullName/etc.), earnings,
// and deductions all included.
type FullPayslip = Prisma.PayslipGetPayload<{
  include: {
    employee: { include: { user: true } };
    earningDetails: true;
    deductionDetails: true;
  };
}>;

function formatIDR(amount: unknown): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  return 'Rp ' + value.toLocaleString('id-ID', { minimumFractionDigits: 0 });
}

function formatDateID(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function escapeHtml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLineItemRows(items: { label: string; amount: unknown }[]): string {
  if (!items || items.length === 0) return '';
  return items
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td class="amount">${formatIDR(item.amount)}</td>
    </tr>`,
    )
    .join('');
}

@Injectable()
export class PdfService {
  /**
   * Builds the HMAC-SHA256 verification hash for a payslip. This is
   * tamper-evidence, not a way to encode payroll data — the QR code
   * only carries a lookup token, never the actual figures.
   */
  buildVerificationHash(payslip: { payslipId: number; netPay: unknown; issueDate: Date | string }): string {
    const secret = process.env.HASH_SECRET;
    if (!secret) {
      throw new Error('HASH_SECRET is not set in .env — cannot generate a verification hash.');
    }
    const payload = `${payslip.payslipId}:${payslip.netPay}:${payslip.issueDate}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private async renderTemplate(payslip: FullPayslip): Promise<{ html: string; verificationHash: string }> {
    let html = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    const verificationHash = payslip.verificationHash ?? this.buildVerificationHash(payslip);

    const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/payslips/verify/${verificationHash}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });

    const periodLabel = `${MONTH_NAMES_ID[payslip.periodMonth - 1]} ${payslip.periodYear}`;

    const replacements: Record<string, string> = {
      companyName: escapeHtml(COMPANY_NAME),
      companyTagline: escapeHtml(COMPANY_TAGLINE),
      periodLabel,
      // fullName/bankAccountNo/jobTitle/employmentStatus moved: fullName
      // now lives on the linked User, not Employee itself.
      fullName: escapeHtml(payslip.employee.user.fullName),
      bankAccountNo: escapeHtml(payslip.employee.bankAccountNo),
      jobTitle: escapeHtml(payslip.employee.jobTitle),
      employmentStatus: escapeHtml(payslip.employee.employmentStatus),
      basicSalaryFormatted: formatIDR(payslip.basicSalary),
      earningRows: renderLineItemRows(payslip.earningDetails),
      totalEarningsFormatted: formatIDR(payslip.totalEarnings),
      deductionRows: renderLineItemRows(payslip.deductionDetails),
      totalDeductionsFormatted: formatIDR(payslip.totalDeductions),
      netPayFormatted: formatIDR(payslip.netPay),
      issueLocation: escapeHtml(payslip.issueLocation),
      issueDateFormatted: formatDateID(payslip.issueDate),
      authorizedSignatory: escapeHtml(payslip.authorizedSignatory),
      qrCodeDataUrl,
      verificationHash,
    };

    for (const [key, value] of Object.entries(replacements)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }

    return { html, verificationHash };
  }

  /**
   * Generates a finished PDF for a payslip and writes it to disk.
   * `payslip` must be fully-loaded (employee.user, earningDetails,
   * deductionDetails all included).
   *
   * PDF owner-password encryption (via qpdf) was intentionally removed
   * per the original's business decision — employees open their payslip
   * directly from the dashboard with no extra password step. Access
   * control is enforced at the API layer (JWT auth + ownership check),
   * not on the file itself.
   */
  async generatePayslipPdf(payslip: FullPayslip): Promise<{ filePath: string; verificationHash: string }> {
    if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

    const { html, verificationHash } = await this.renderTemplate(payslip);
    const finalPath = path.join(STORAGE_DIR, `payslip-${payslip.payslipId}.pdf`);

    const browser = await puppeteer.launch({
      headless: true,
      // Commonly required in containerized/CI environments where the
      // default Chrome sandbox can't initialize. On a normal desktop
      // Linux session you can likely remove these two flags — test
      // both ways if PDF generation fails with a sandbox-related error.
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: finalPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });
    } finally {
      await browser.close();
    }

    return { filePath: finalPath, verificationHash };
  }
}
