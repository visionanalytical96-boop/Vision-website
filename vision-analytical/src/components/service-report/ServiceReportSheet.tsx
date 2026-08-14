import {
  SERVICE_CALL_TYPE_LABELS,
  SERVICE_CALL_TYPE_ORDER,
  SERVICE_CONTRACT_TYPE_LABELS,
  SERVICE_CONTRACT_TYPE_ORDER,
  SERVICE_OUTCOME_LABELS,
  SERVICE_OUTCOME_ORDER,
  formatSheetDate,
} from '@/lib/service-report/form';
import type {
  ServiceCallType,
  ServiceContractType,
  ServiceOutcome,
} from '@/generated/prisma/enums';

/**
 * The printed service report, laid out as the paper sheet it replaces.
 *
 * Deliberately not built from the app's UI primitives: those bind to theme
 * tokens that change with the customiser, and this sheet has to print the same
 * way in five years. Black on white, fixed rules, explicit millimetre-ish
 * sizing — what a customer signs must not shift because someone changed the
 * brand colour.
 */

export interface SheetVisitLine {
  visitedOn: Date | null;
  timeIn: string | null;
  timeOut: string | null;
  systemConfiguration: string | null;
  modelDescription: string | null;
  systemNumber: string | null;
}

export interface SheetLetterhead {
  companyName: string;
  addressLines: string[];
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
}

export interface ServiceReportSheetData {
  reportNumber: string | null;
  reportDate: Date | null;
  companyName: string | null;
  companyAddress: string | null;
  telephone: string | null;
  contactPerson: string | null;
  contactDesignation: string | null;
  contactDepartment: string | null;
  weekOff: string | null;
  visitLines: SheetVisitLine[];
  outcome: ServiceOutcome | null;
  serviceTypes: ServiceCallType[];
  contractType: ServiceContractType | null;
  faultReported: string | null;
  workPerformed: string;
  partsSummary: string | null;
  customerRemarks: string | null;
  customerName: string | null;
  customerDesignation: string | null;
  signedAt: Date | null;
  engineerName: string | null;
}

/** At least four ruled rows, so the table looks like the printed form even when one visit is logged. */
const MIN_VISIT_ROWS = 4;

function Tick({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className="inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center border border-black text-[11px] leading-none font-bold"
      >
        {on ? '✓' : ''}
      </span>
      <span>{label}</span>
      <span className="sr-only">{on ? ': yes' : ': no'}</span>
    </span>
  );
}

/** A labelled box with a ruled underline, the way the paper form asks for a value. */
function Field({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-1.5 ${className}`}>
      <span className="shrink-0 font-semibold">{label}</span>
      <span className="min-w-0 flex-1 border-b border-dotted border-black pb-px break-words">
        {value || ' '}
      </span>
    </div>
  );
}

/** A bordered block with a heading and free text, sized so it prints with room to write. */
function Block({
  title,
  value,
  minHeight,
}: {
  title: string;
  value: string;
  minHeight: string;
}) {
  return (
    <section className="border border-black">
      <h2 className="border-b border-black bg-[#eef2f7] px-2 py-1 text-[11px] font-bold tracking-wide uppercase">
        {title}
      </h2>
      <p
        className="px-2 py-1.5 text-[11px] leading-[1.45] whitespace-pre-wrap"
        style={{ minHeight }}
      >
        {value || ' '}
      </p>
    </section>
  );
}

export function ServiceReportSheet({
  data,
  letterhead,
}: {
  data: ServiceReportSheetData;
  letterhead: SheetLetterhead;
}) {
  const rows: Array<SheetVisitLine | null> = [...data.visitLines];
  while (rows.length < MIN_VISIT_ROWS) rows.push(null);

  const chosenTypes = new Set(data.serviceTypes);

  return (
    <article className="service-sheet mx-auto w-full max-w-[820px] bg-white p-6 text-[11px] leading-snug text-black">
      <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-2">
        <div className="flex items-start gap-3">
          {letterhead.logoUrl && (
            // Plain <img>: next/image rewrites to an optimiser URL that a
            // print-to-PDF of a saved page cannot resolve.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={letterhead.logoUrl}
              alt=""
              className="h-12 w-auto object-contain"
            />
          )}
          <div>
            <h1 className="font-display text-[20px] leading-tight font-bold tracking-tight">
              {letterhead.companyName}
            </h1>
            <p className="text-[10px] tracking-[0.14em] uppercase">
              Precision &middot; Performance &middot; Reliability
            </p>
            <p className="mt-0.5 text-[10px]">Lab Instruments Services &amp; Sales</p>
          </div>
        </div>
        <div className="max-w-[38%] text-right text-[10px] leading-[1.5]">
          {letterhead.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {letterhead.email && <p>{letterhead.email}</p>}
          {letterhead.phone && <p>{letterhead.phone}</p>}
        </div>
      </header>

      <div className="mt-2 flex items-center justify-between border border-black bg-[#eef2f7] px-2 py-1">
        <h2 className="text-[13px] font-bold tracking-[0.2em] uppercase">Service Report</h2>
        {data.reportNumber && (
          <span className="text-[11px] font-semibold">No. {data.reportNumber}</span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <Field label="Company Name &amp; Address:" value={data.companyName ?? ''} />
        <Field label="Date:" value={formatSheetDate(data.reportDate)} className="w-[170px]" />
        <Field label="" value={data.companyAddress ?? ''} />
        <Field label="Tele No.:" value={data.telephone ?? ''} className="w-[170px]" />
      </div>

      <div className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <Field label="Contact Person:" value={data.contactPerson ?? ''} />
        <Field label="Week Off:" value={data.weekOff ?? ''} className="w-[170px]" />
        <Field
          label="Designation &amp; Dept.:"
          value={[data.contactDesignation, data.contactDepartment]
            .filter(Boolean)
            .join(' — ')}
        />
        <span />
      </div>

      <table className="mt-2 w-full table-fixed border-collapse border border-black text-[10px]">
        <thead>
          <tr className="bg-[#eef2f7]">
            <th className="w-[13%] border border-black px-1 py-1 font-bold">Date</th>
            <th className="w-[10%] border border-black px-1 py-1 font-bold">Time IN</th>
            <th className="w-[10%] border border-black px-1 py-1 font-bold">Time OUT</th>
            <th className="border border-black px-1 py-1 font-bold">System Configuration</th>
            <th className="w-[22%] border border-black px-1 py-1 font-bold">Model Description</th>
            <th className="w-[15%] border border-black px-1 py-1 font-bold">System No.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="h-[22px] border border-black px-1 py-0.5 text-center">
                {formatSheetDate(row?.visitedOn) || ' '}
              </td>
              <td className="border border-black px-1 py-0.5 text-center">{row?.timeIn ?? ' '}</td>
              <td className="border border-black px-1 py-0.5 text-center">{row?.timeOut ?? ' '}</td>
              <td className="border border-black px-1 py-0.5">{row?.systemConfiguration ?? ' '}</td>
              <td className="border border-black px-1 py-0.5">{row?.modelDescription ?? ' '}</td>
              <td className="border border-black px-1 py-0.5">{row?.systemNumber ?? ' '}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 border border-black">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-black px-2 py-1">
          <span className="font-semibold">Status:</span>
          {SERVICE_OUTCOME_ORDER.map((outcome) => (
            <Tick
              key={outcome}
              on={data.outcome === outcome}
              label={SERVICE_OUTCOME_LABELS[outcome]}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-black px-2 py-1">
          {SERVICE_CALL_TYPE_ORDER.map((type) => (
            <Tick
              key={type}
              on={chosenTypes.has(type)}
              label={SERVICE_CALL_TYPE_LABELS[type]}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-1">
          {SERVICE_CONTRACT_TYPE_ORDER.map((type) => (
            <Tick
              key={type}
              on={data.contractType === type}
              label={SERVICE_CONTRACT_TYPE_LABELS[type]}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <Block title="Fault Reported" value={data.faultReported ?? ''} minHeight="46px" />
        <Block title="Observation &amp; Action Taken" value={data.workPerformed} minHeight="104px" />
        <Block title="Parts Replaced / Required" value={data.partsSummary ?? ''} minHeight="46px" />
        <Block title="Clients Comments" value={data.customerRemarks ?? ''} minHeight="46px" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="border border-black px-2 pt-1 pb-2">
          <p className="text-[10px] font-bold tracking-wide uppercase">
            Customer&rsquo;s Name, Signature, Date &amp; Stamp
          </p>
          <p className="mt-1 min-h-[14px] font-semibold">{data.customerName ?? ' '}</p>
          <p className="min-h-[13px] text-[10px]">{data.customerDesignation ?? ' '}</p>
          <div className="mt-6 border-t border-black pt-0.5 text-[10px]">
            Signature &amp; Stamp
            {data.signedAt && ` — ${formatSheetDate(data.signedAt)}`}
          </div>
        </div>
        <div className="border border-black px-2 pt-1 pb-2">
          <p className="text-[10px] font-bold tracking-wide uppercase">
            Service Engineer&rsquo;s Name &amp; Signature
          </p>
          <p className="mt-1 min-h-[14px] font-semibold">{data.engineerName ?? ' '}</p>
          <p className="min-h-[13px] text-[10px]">&nbsp;</p>
          <div className="mt-6 border-t border-black pt-0.5 text-[10px]">Signature</div>
        </div>
      </div>

      <p className="mt-2 text-center text-[9px]">
        This report is issued by {letterhead.companyName}. Please retain a copy for your records.
      </p>
    </article>
  );
}
