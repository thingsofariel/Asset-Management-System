import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

// Expected CSV columns:
//   employeeId,periodMonth,periodYear,issueDate,issueLocation,
//   basicSalary,authorizedSignatory,earnings,deductions
//
// `earnings` and `deductions` are encoded as "label:amount|label:amount"
// within a single cell — avoids needing a second file or a nested CSV
// structure for what is a 1-to-N relationship on the database side.
const REQUIRED_COLUMNS = ['employeeId', 'periodMonth', 'periodYear', 'issueDate', 'basicSalary', 'authorizedSignatory'];

export interface ParsedLineItem {
  label: string;
  amount: number;
}

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  earnings: ParsedLineItem[];
  deductions: ParsedLineItem[];
}

@Injectable()
export class BulkImportService {
  /** Parses a "label:amount|label:amount" cell. Empty cell -> []. Throws for malformed entries rather than silently dropping a bad line item. */
  parseLineItemsCell(cell: string | undefined, columnName: string, rowNumber: number): ParsedLineItem[] {
    if (!cell || cell.trim() === '') return [];

    return cell.split('|').map((entry) => {
      const parts = entry.split(':');
      if (parts.length !== 2) {
        throw new Error(`Row ${rowNumber}: malformed ${columnName} entry "${entry}" -- expected "label:amount".`);
      }
      const [label, amountStr] = parts;
      const amount = Number(amountStr.trim());
      if (!label.trim() || isNaN(amount)) {
        throw new Error(`Row ${rowNumber}: malformed ${columnName} entry "${entry}" -- amount must be a number.`);
      }
      return { label: label.trim(), amount };
    });
  }

  /** Validates one parsed row's shape/types. Does NOT check whether employeeId exists in the DB — that needs a query, done in the controller so this stays a pure, fast, synchronous validator. */
  validateRow(row: Record<string, string>, rowNumber: number) {
    const errors: string[] = [];

    for (const col of REQUIRED_COLUMNS) {
      if (!row[col] || String(row[col]).trim() === '') errors.push(`missing required field "${col}"`);
    }

    if (row.employeeId && isNaN(Number(row.employeeId))) errors.push(`employeeId "${row.employeeId}" is not a number`);
    if (
      row.periodMonth &&
      (isNaN(Number(row.periodMonth)) || Number(row.periodMonth) < 1 || Number(row.periodMonth) > 12)
    ) {
      errors.push(`periodMonth "${row.periodMonth}" must be a number between 1 and 12`);
    }
    if (row.periodYear && isNaN(Number(row.periodYear))) errors.push(`periodYear "${row.periodYear}" is not a number`);
    if (row.basicSalary && isNaN(Number(row.basicSalary))) errors.push(`basicSalary "${row.basicSalary}" is not a number`);
    if (row.issueDate && isNaN(new Date(row.issueDate).getTime())) {
      errors.push(`issueDate "${row.issueDate}" is not a valid date`);
    }

    let earnings: ParsedLineItem[] = [];
    let deductions: ParsedLineItem[] = [];
    try {
      earnings = this.parseLineItemsCell(row.earnings, 'earnings', rowNumber);
    } catch (err: any) {
      errors.push(err.message);
    }
    try {
      deductions = this.parseLineItemsCell(row.deductions, 'deductions', rowNumber);
    } catch (err: any) {
      errors.push(err.message);
    }

    return { errors, earnings, deductions };
  }

  /** Rows with validation errors are still included (so the caller can report them) — filtering invalid rows out is left to the caller. */
  parseAndValidateCsv(csvText: string): ParsedRow[] {
    let records: Record<string, string>[];
    try {
      records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse CSV: ${err.message}`);
    }

    if (records.length === 0) throw new BadRequestException('CSV file contains no data rows.');

    const headerColumns = Object.keys(records[0]);
    const missingColumns = REQUIRED_COLUMNS.filter((c) => !headerColumns.includes(c));
    if (missingColumns.length > 0) {
      throw new BadRequestException(`CSV is missing required column(s): ${missingColumns.join(', ')}`);
    }

    return records.map((row, idx) => {
      // +2 accounts for 1-indexing and the header row, so the row
      // number matches what the admin sees in a spreadsheet program.
      const rowNumber = idx + 2;
      const { errors, earnings, deductions } = this.validateRow(row, rowNumber);
      return { rowNumber, data: row, errors, earnings, deductions };
    });
  }
}
