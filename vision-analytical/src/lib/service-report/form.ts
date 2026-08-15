// Enum values, not the client module - see the comment in src/lib/status.ts.
import {
  ServiceOutcome,
  ServiceCallType,
  ServiceContractType,
} from '@/generated/prisma/enums';

/**
 * The vocabulary of the printed service report.
 *
 * Labels match the wording on the paper sheet exactly, because the printed
 * output has to be recognisable to a customer who has signed the old one for
 * years. No database access here — the form, the print view and the tests all
 * read the same lists.
 */

export const SERVICE_OUTCOME_LABELS: Record<ServiceOutcome, string> = {
  OK: 'OK',
  NOT_OK: 'Not OK',
};

export const SERVICE_CALL_TYPE_LABELS: Record<ServiceCallType, string> = {
  NEW_INSTALLATION: 'New Installation',
  CALIBRATION: 'Calibration',
  DEMONSTRATION: 'Demonstration',
  VALIDATION: 'Validation',
  MAINTENANCE: 'Maintenance',
  REPAIRS: 'Repairs',
};

export const SERVICE_CONTRACT_TYPE_LABELS: Record<ServiceContractType, string> = {
  UNDER_WARRANTY: 'Under Warranty',
  UNDER_AMC: 'Under AMC',
  COURTESY: 'Courtesy',
  PAID_VISIT: 'Paid Visit',
};

/** Tick-box order on the sheet, left to right. */
export const SERVICE_CALL_TYPE_ORDER: ServiceCallType[] = [
  'NEW_INSTALLATION',
  'CALIBRATION',
  'DEMONSTRATION',
  'VALIDATION',
  'MAINTENANCE',
  'REPAIRS',
];

export const SERVICE_CONTRACT_TYPE_ORDER: ServiceContractType[] = [
  'UNDER_WARRANTY',
  'UNDER_AMC',
  'COURTESY',
  'PAID_VISIT',
];

export const SERVICE_OUTCOME_ORDER: ServiceOutcome[] = ['OK', 'NOT_OK'];

export function isServiceCallType(value: string): value is ServiceCallType {
  return Object.prototype.hasOwnProperty.call(SERVICE_CALL_TYPE_LABELS, value);
}

export function isServiceContractType(value: string): value is ServiceContractType {
  return Object.prototype.hasOwnProperty.call(SERVICE_CONTRACT_TYPE_LABELS, value);
}

export function isServiceOutcome(value: string): value is ServiceOutcome {
  return Object.prototype.hasOwnProperty.call(SERVICE_OUTCOME_LABELS, value);
}

/**
 * Keeps only the values that are real call types, in sheet order.
 *
 * Checkbox groups arrive from FormData as whatever the browser posted, so this
 * both filters unknown values and stops the print view from listing the ticks
 * in the order the user happened to click them.
 */
export function parseServiceCallTypes(values: string[]): ServiceCallType[] {
  const chosen = new Set(values.filter(isServiceCallType));
  return SERVICE_CALL_TYPE_ORDER.filter((type) => chosen.has(type));
}

/**
 * The number printed at the top of the sheet: VA-SR-YYMM-XXXX.
 *
 * Year and month are in the number so a filed stack of paper sorts itself, and
 * the random tail avoids a counter that two engineers filing at once would
 * both read as the same value.
 */
export function buildReportNumber(date: Date, suffix: string): string {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `VA-SR-${year}${month}-${suffix}`;
}

/** dd/mm/yy, the format the boxes on the sheet are ruled for. */
export function formatSheetDate(date: Date | null | undefined): string {
  if (!date) return '';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/** yyyy-mm-dd, for the value of a date input. */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

/**
 * Joins the parts of a postal address that are actually present.
 *
 * Written out rather than inlined at each call site because an instrument, a
 * company and a customer all carry the same optional-line shape, and a blank
 * line in the middle of a printed address looks like a mistake.
 */
export function joinAddress(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');
}
