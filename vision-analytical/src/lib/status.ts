// Import enum values from the pure-data enums module, not the client
// module - the latter has Node-only top-level imports (node:process etc.)
// that break any client component this ends up bundled into.
import {
  OrderStatus,
  QuoteStatus,
  ServiceRequestStatus,
  StockStatus,
  AmcStatus,
  InvoiceStatus,
  CrmLeadStatus,
  Priority,
  RefurbishedCondition,
} from '@/generated/prisma/enums';
import type { BadgeTone } from '@/components/ui/Badge';

export interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

export const orderStatusMeta: Record<OrderStatus, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  PROCESSING: { label: 'Processing', tone: 'info' },
  SHIPPED: { label: 'Shipped', tone: 'info' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export const quoteStatusMeta: Record<QuoteStatus, StatusMeta> = {
  REQUESTED: { label: 'Requested', tone: 'warning' },
  SENT: { label: 'Sent', tone: 'info' },
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  CONVERTED: { label: 'Converted to order', tone: 'success' },
};

export const serviceRequestStatusMeta: Record<ServiceRequestStatus, StatusMeta> = {
  OPEN: { label: 'Open', tone: 'warning' },
  ASSIGNED: { label: 'Assigned', tone: 'info' },
  IN_PROGRESS: { label: 'In progress', tone: 'info' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export const stockStatusMeta: Record<StockStatus, StatusMeta> = {
  IN_STOCK: { label: 'In stock', tone: 'success' },
  LOW_STOCK: { label: 'Low stock', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'danger' },
  MADE_TO_ORDER: { label: 'Made to order', tone: 'info' },
};

export const amcStatusMeta: Record<AmcStatus, StatusMeta> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  EXPIRING_SOON: { label: 'Expiring soon', tone: 'warning' },
  EXPIRED: { label: 'Expired', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const invoiceStatusMeta: Record<InvoiceStatus, StatusMeta> = {
  UNPAID: { label: 'Unpaid', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const crmLeadStatusMeta: Record<CrmLeadStatus, StatusMeta> = {
  NEW: { label: 'New', tone: 'info' },
  CONTACTED: { label: 'Contacted', tone: 'info' },
  QUALIFIED: { label: 'Qualified', tone: 'info' },
  PROPOSAL_SENT: { label: 'Proposal sent', tone: 'warning' },
  WON: { label: 'Won', tone: 'success' },
  LOST: { label: 'Lost', tone: 'danger' },
};

export const refurbishedConditionMeta: Record<RefurbishedCondition, StatusMeta> = {
  EXCELLENT: { label: 'Excellent condition', tone: 'success' },
  GOOD: { label: 'Good condition', tone: 'info' },
  FAIR: { label: 'Fair condition', tone: 'warning' },
};

export const priorityMeta: Record<Priority, StatusMeta> = {
  LOW: { label: 'Low', tone: 'neutral' },
  NORMAL: { label: 'Normal', tone: 'info' },
  HIGH: { label: 'High', tone: 'warning' },
  URGENT: { label: 'Urgent', tone: 'danger' },
};
