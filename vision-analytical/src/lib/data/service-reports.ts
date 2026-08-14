import 'server-only';
import { prisma } from '@/lib/db';
import { getSiteSettings } from '@/lib/data/cms';
import { joinAddress } from '@/lib/service-report/form';
import type {
  SheetLetterhead,
  ServiceReportSheetData,
} from '@/components/service-report/ServiceReportSheet';

/** Everything the sheet and the edit form need, in one round trip. */
export async function getServiceReport(id: string) {
  return prisma.serviceReport.findUnique({
    where: { id },
    include: {
      engineer: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
      customerInstrument: {
        select: { id: true, serialNumber: true, nickname: true },
      },
      serviceRequest: {
        select: { id: true, ticketNumber: true, instrumentDescription: true },
      },
      visitLines: { orderBy: { sortOrder: 'asc' } },
      reportParts: { orderBy: { partName: 'asc' } },
    },
  });
}

export type ServiceReportWithRelations = NonNullable<
  Awaited<ReturnType<typeof getServiceReport>>
>;

export async function listServiceReports(limit = 100) {
  return prisma.serviceReport.findMany({
    orderBy: [{ reportDate: 'desc' }, { reportedAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      reportNumber: true,
      reportDate: true,
      reportedAt: true,
      companyName: true,
      outcome: true,
      serviceTypes: true,
      contractType: true,
      engineer: { select: { name: true } },
    },
  });
}

/**
 * The letterhead block at the top of every printed report.
 *
 * Read from SiteSettings rather than hardcoded, so changing the address in the
 * admin changes what prints — and falls back to the registered details when
 * settings have not been filled in yet, because a report with no address on it
 * is not a document anyone can act on.
 */
export async function getSheetLetterhead(): Promise<SheetLetterhead> {
  const settings = await getSiteSettings();

  const composed = joinAddress([
    settings?.addressLine,
    settings?.city,
    settings?.state,
    settings?.country,
  ]);

  return {
    companyName: settings?.companyName ?? 'Vision Analytical',
    addressLines: composed ? composed.split(', ') : [],
    email: settings?.email ?? null,
    phone: settings?.phone ?? null,
    logoUrl: settings?.logoUrl ?? null,
  };
}

/** Narrows a loaded report to exactly what the printed sheet renders. */
export function toSheetData(report: ServiceReportWithRelations): ServiceReportSheetData {
  return {
    reportNumber: report.reportNumber,
    reportDate: report.reportDate ?? report.reportedAt,
    companyName: report.companyName,
    companyAddress: report.companyAddress,
    telephone: report.telephone,
    contactPerson: report.contactPerson,
    contactDesignation: report.contactDesignation,
    contactDepartment: report.contactDepartment,
    weekOff: report.weekOff,
    visitLines: report.visitLines.map((line) => ({
      visitedOn: line.visitedOn,
      timeIn: line.timeIn,
      timeOut: line.timeOut,
      systemConfiguration: line.systemConfiguration,
      modelDescription: line.modelDescription,
      systemNumber: line.systemNumber,
    })),
    outcome: report.outcome,
    serviceTypes: report.serviceTypes,
    contractType: report.contractType,
    faultReported: report.faultReported,
    workPerformed: report.workPerformed,
    partsSummary: report.partsSummary,
    customerRemarks: report.customerRemarks,
    customerName: report.customerName,
    customerDesignation: report.customerDesignation,
    signedAt: report.signedAt,
    engineerName: report.engineerName ?? report.engineer.name,
  };
}

/**
 * The lists the generator auto-fills from: companies with their contacts and
 * registered instruments, and the engineers who can be named on a report.
 */
export async function getGeneratorOptions() {
  const [companies, engineers, openRequests] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: 500,
      select: {
        id: true,
        name: true,
        addressLine: true,
        city: true,
        state: true,
        postalCode: true,
        phone: true,
        contacts: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          take: 25,
          select: { id: true, name: true, phone: true, email: true },
        },
        instruments: {
          orderBy: { serialNumber: 'asc' },
          take: 100,
          select: {
            id: true,
            serialNumber: true,
            nickname: true,
            instrumentModel: { select: { name: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: 'ENGINEER', isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.serviceRequest.findMany({
      where: { status: { notIn: ['CLOSED', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        ticketNumber: true,
        instrumentDescription: true,
        description: true,
        customerInstrumentId: true,
        assignedEngineerId: true,
        customer: {
          select: { name: true, phone: true, companyName: true, companyId: true },
        },
      },
    }),
  ]);

  return { companies, engineers, openRequests };
}

export type GeneratorOptions = Awaited<ReturnType<typeof getGeneratorOptions>>;
