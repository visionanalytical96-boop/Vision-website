// Enum values, not the client module - see the comment in src/lib/status.ts.
import { ServiceRequestType, Priority } from '@/generated/prisma/enums';

export const SERVICE_REQUEST_TYPE_LABELS: Record<ServiceRequestType, string> = {
  INSTALLATION: 'Installation',
  PREVENTIVE_MAINTENANCE: 'Preventive Maintenance',
  BREAKDOWN: 'Breakdown',
  CALIBRATION: 'Calibration',
  IQ: 'IQ (Installation Qualification)',
  OQ: 'OQ (Operational Qualification)',
  PQ: 'PQ (Performance Qualification)',
  VALIDATION: 'Validation',
  SOFTWARE_INSTALL: 'Software Installation',
  TRAINING: 'Training',
  OTHER: 'Other',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};
