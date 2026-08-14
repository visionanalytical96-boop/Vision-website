import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getGeneratorOptions } from '@/lib/data/service-reports';
import {
  ServiceReportGenerator,
  type ServiceReportDefaults,
} from '@/components/forms/ServiceReportGenerator';
import { toDateInputValue } from '@/lib/service-report/form';

export const metadata: Metadata = { title: 'New Service Report' };

export default async function NewServiceReportPage() {
  const options = await getGeneratorOptions();

  const defaults: ServiceReportDefaults = {
    serviceRequestId: '',
    engineerId: '',
    companyId: '',
    customerInstrumentId: '',
    reportDate: toDateInputValue(new Date()),
    companyName: '',
    companyAddress: '',
    telephone: '',
    contactPerson: '',
    contactDesignation: '',
    contactDepartment: '',
    weekOff: '',
    kind: 'INSPECTION',
    outcome: '',
    serviceTypes: [],
    contractType: '',
    faultReported: '',
    workPerformed: '',
    partsSummary: '',
    customerRemarks: '',
    recommendations: '',
    customerName: '',
    customerDesignation: '',
    engineerName: '',
    signedAt: '',
    visitLines: [],
  };

  return (
    <div className="space-y-4">
      <Link
        href="/admin/service-reports"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Service reports
      </Link>

      <div>
        <h2 className="font-display text-xl font-bold text-foreground">New Service Report</h2>
        <p className="mt-1 text-sm text-muted">
          Fills itself from the job, the customer and the instrument. Prints as the standard Vision
          Analytical service report.
        </p>
      </div>

      <ServiceReportGenerator options={options} defaults={defaults} />
    </div>
  );
}
