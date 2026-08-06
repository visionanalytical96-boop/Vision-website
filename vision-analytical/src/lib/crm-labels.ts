// Enum values, not the client module - see the comment in src/lib/status.ts.
import { CrmActivityType } from '@/generated/prisma/enums';

export const CRM_ACTIVITY_TYPE_LABELS: Record<CrmActivityType, string> = {
  CALL: 'Call',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  MEETING: 'Meeting',
  NOTE: 'Note',
};
