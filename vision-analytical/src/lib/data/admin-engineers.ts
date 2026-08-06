import 'server-only';
import { prisma } from '@/lib/db';
import { Role, ServiceRequestStatus } from '@/generated/prisma/client';

export function getAdminEngineers() {
  return prisma.user.findMany({
    where: { role: Role.ENGINEER },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          assignedServiceJobs: { where: { status: { in: [ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.IN_PROGRESS] } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function getEngineerOptions() {
  return prisma.user.findMany({
    where: { role: Role.ENGINEER, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

export function getAdminEngineerById(id: string) {
  return prisma.user.findFirst({
    where: { id, role: Role.ENGINEER },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      assignedServiceJobs: {
        select: {
          id: true,
          ticketNumber: true,
          type: true,
          status: true,
          priority: true,
          instrumentDescription: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
}
