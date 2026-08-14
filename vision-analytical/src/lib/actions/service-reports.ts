'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { customAlphabet } from 'nanoid';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/dal';
import { Role } from '@/generated/prisma/client';
import {
  serviceReportSchema,
  isBlankVisitLine,
} from '@/lib/validation/service-report';
import { buildReportNumber } from '@/lib/service-report/form';

export interface ServiceReportFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

// Same unambiguous alphabet as the other reference numbers: a report number is
// read aloud over a phone call as often as it is typed.
const suffix = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 4);

/**
 * FormData carries the visit table as `visit.0.timeIn`, `visit.1.timeIn` and so
 * on. This walks that back into rows, keeping their order, so adding a row in
 * the browser needs no extra plumbing on the server.
 */
function readVisitLines(formData: FormData): Array<Record<string, string>> {
  const byIndex = new Map<number, Record<string, string>>();

  for (const [name, value] of formData.entries()) {
    const match = /^visit\.(\d+)\.([a-zA-Z]+)$/.exec(name);
    if (!match || typeof value !== 'string') continue;

    const index = Number(match[1]);
    const row = byIndex.get(index) ?? {};
    row[match[2]] = value;
    byIndex.set(index, row);
  }

  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row);
}

function parse(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? '');

  return serviceReportSchema.safeParse({
    serviceRequestId: text('serviceRequestId'),
    visitId: text('visitId'),
    engineerId: text('engineerId'),
    companyId: text('companyId'),
    customerInstrumentId: text('customerInstrumentId'),

    reportDate: text('reportDate'),
    companyName: text('companyName'),
    companyAddress: text('companyAddress'),
    telephone: text('telephone'),
    contactPerson: text('contactPerson'),
    contactDesignation: text('contactDesignation'),
    contactDepartment: text('contactDepartment'),
    weekOff: text('weekOff'),

    kind: text('kind') || undefined,
    outcome: text('outcome') || undefined,
    serviceTypes: formData.getAll('serviceTypes').map(String),
    contractType: text('contractType') || undefined,

    faultReported: text('faultReported'),
    workPerformed: text('workPerformed'),
    partsSummary: text('partsSummary'),
    customerRemarks: text('customerRemarks'),
    recommendations: text('recommendations'),

    customerName: text('customerName'),
    customerDesignation: text('customerDesignation'),
    engineerName: text('engineerName'),
    signedAt: text('signedAt'),

    visitLines: readVisitLines(formData),
  });
}

export async function createServiceReport(
  _prevState: ServiceReportFormState | undefined,
  formData: FormData,
): Promise<ServiceReportFormState> {
  await requireUser(Role.ADMIN);

  const validated = parse(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { visitLines, ...report } = validated.data;
  const reportDate = report.reportDate ?? new Date();

  let id: string;
  try {
    const created = await prisma.serviceReport.create({
      data: {
        ...report,
        reportDate,
        reportNumber: buildReportNumber(reportDate, suffix()),
        // Superseded by the relation rows, but the columns are not nullable on
        // reports written before those tables existed.
        partsUsed: [],
        photos: [],
        visitLines: {
          create: visitLines
            .filter((line) => !isBlankVisitLine(line))
            .map((line, index) => ({ ...line, sortOrder: index })),
        },
      },
      select: { id: true },
    });
    id = created.id;
  } catch {
    return { formError: 'Could not save the report. Check the engineer and company and try again.' };
  }

  revalidatePath('/admin/service-reports');
  redirect(`/admin/service-reports/${id}`);
}

export async function updateServiceReport(
  _prevState: ServiceReportFormState | undefined,
  formData: FormData,
): Promise<ServiceReportFormState> {
  await requireUser(Role.ADMIN);

  const id = String(formData.get('id') ?? '');
  if (!id) return { formError: 'Missing report.' };

  const validated = parse(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { visitLines, ...report } = validated.data;
  const rows = visitLines.filter((line) => !isBlankVisitLine(line));

  try {
    // Replace the visit table wholesale: the rows have no identity of their own
    // and diffing them would be more code than rewriting four lines.
    await prisma.$transaction(async (tx) => {
      await tx.serviceReportVisitLine.deleteMany({ where: { reportId: id } });
      await tx.serviceReport.update({
        where: { id },
        data: {
          ...report,
          reportDate: report.reportDate ?? undefined,
          visitLines: {
            create: rows.map((line, index) => ({ ...line, sortOrder: index })),
          },
        },
      });
    });
  } catch {
    return { formError: 'Could not save the report. Check the engineer and company and try again.' };
  }

  revalidatePath('/admin/service-reports');
  revalidatePath(`/admin/service-reports/${id}`);
  redirect(`/admin/service-reports/${id}`);
}
