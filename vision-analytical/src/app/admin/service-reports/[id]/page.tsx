import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import {
  getServiceReport,
  getSheetLetterhead,
  toSheetData,
} from '@/lib/data/service-reports';
import { ServiceReportSheet } from '@/components/service-report/ServiceReportSheet';
import { PrintButton } from '@/components/service-report/PrintButton';
import { buttonVariants } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Service Report' };

export default async function ServiceReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [report, letterhead] = await Promise.all([getServiceReport(id), getSheetLetterhead()]);

  if (!report) notFound();

  return (
    <div className="print-only-sheet space-y-4">
      <div className="print-hide flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/service-reports"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Service reports
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/service-reports/${report.id}/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <Pencil className="h-4 w-4" aria-hidden /> Edit
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white p-4 shadow-sm print:overflow-visible print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <ServiceReportSheet data={toSheetData(report)} letterhead={letterhead} />
      </div>

      <p className="print-hide text-sm text-muted">
        Download PDF opens your browser&rsquo;s print dialog — choose &ldquo;Save as PDF&rdquo; as
        the destination. The page is already laid out for A4.
      </p>
    </div>
  );
}
