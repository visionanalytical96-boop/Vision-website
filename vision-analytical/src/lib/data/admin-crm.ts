import 'server-only';
import { prisma } from '@/lib/db';
import { CrmLeadStatus, Role, type Prisma } from '@/generated/prisma/client';

export function getAdminLeads(status?: CrmLeadStatus) {
  const where: Prisma.CrmLeadWhereInput = status ? { status } : {};
  return prisma.crmLead.findMany({
    where,
    include: { assignedTo: { select: { name: true } }, _count: { select: { activities: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function getAdminLeadById(id: string) {
  return prisma.crmLead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      activities: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export function getAssignableStaff() {
  return prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.ENGINEER] }, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });
}
