import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getGeneratorOptions, getServiceReport } from '@/lib/data/service-reports';
import {
  ServiceReportGenerator,
  type ServiceReportDefaults,
} from '@/components/forms/ServiceReportGenerator';
import { toDateInputValue } from '@/lib/service-report/form';

export const metadata: Metadata = { title: 'Edit Service Report' };

export default async function EditServiceReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [report, options] = await Promise.all([getServiceReport(id), getGeneratorOptions()]);

  if (!report) notFound();

  const defaults: ServiceReportDefaults = {
    id: report.id,
    serviceRequestId: report.serviceRequestId ?? '',
    engineerId: report.engineerId,
    companyId: report.companyId ?? '',
    customerInstrumentId: report.customerInstrumentId ?? '',
    reportDate: toDateInputValue(report.reportDate ?? report.reportedAt),
    companyName: report.companyName ?? '',
    companyAddress: report.companyAddress ?? '',
    telephone: report.telephone ?? '',
    contactPerson: report.contactPerson ?? '',
    contactDesignation: report.contactDesignation ?? '',
    contactDepartment: report.contactDepartment ?? '',
    weekOff: report.weekOff ?? '',
    kind: report.kind,
    outcome: report.outcome ?? '',
    serviceTypes: report.serviceTypes,
    contractType: report.contractType ?? '',
    faultReported: report.faultReported ?? '',
    workPerformed: report.workPerformed,
    partsSummary: report.partsSummary ?? '',
    customerRemarks: report.customerRemarks ?? '',
    recommendations: report.recommendations ?? '',
    customerName: report.customerName ?? '',
    customerDesignation: report.customerDesignation ?? '',
    engineerName: report.engineerName ?? report.engineer.name,
    signedAt: toDateInputValue(report.signedAt),
    visitLines: report.visitLines.map((line) => ({
      visitedOn: toDateInputValue(line.visitedOn),
      timeIn: line.timeIn ?? '',
      timeOut: line.timeOut ?? '',
      systemConfiguration: line.systemConfiguration ?? '',
      modelDescription: line.modelDescription ?? '',
      systemNumber: line.systemNumber ?? '',
    })),
  };

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/service-reports/${report.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to report
      </Link>

      <div>
        <h2 className="font-display text-xl font-bold text-foreground">
          Edit {report.reportNumber ?? 'Service Report'}
        </h2>
      </div>

      <ServiceReportGenerator options={options} defaults={defaults} />
    </div>
  );
}
