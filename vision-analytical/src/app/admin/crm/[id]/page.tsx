import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { LogActivityForm } from '@/components/forms/LogActivityForm';
import { getAdminLeadById, getAssignableStaff } from '@/lib/data/admin-crm';
import { updateLeadStatus, assignLead } from '@/lib/actions/admin-crm';
import { formatDateTime } from '@/lib/format';
import { crmLeadStatusMeta } from '@/lib/status';
import { CRM_ACTIVITY_TYPE_LABELS } from '@/lib/crm-labels';
import { CrmLeadStatus } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Lead Detail' };

export default async function AdminLeadDetailPage(props: PageProps<'/admin/crm/[id]'>) {
  const { id } = await props.params;
  const [lead, staff] = await Promise.all([getAdminLeadById(id), getAssignableStaff()]);
  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">{lead.name}</h2>
          {lead.company && <p className="text-sm text-muted">{lead.company}</p>}
          <p className="text-sm text-muted">{[lead.email, lead.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
          {lead.source && <p className="text-xs text-muted">Source: {lead.source}</p>}
          <p className="text-xs text-muted">Added {formatDateTime(lead.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge meta={crmLeadStatusMeta[lead.status]} />
          <form action={updateLeadStatus} className="flex items-center gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <Select name="status" defaultValue={lead.status} className="h-9 w-40 text-sm">
              {Object.values(CrmLeadStatus).map((status) => (
                <option key={status} value={status}>
                  {crmLeadStatusMeta[status].label}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="outline">
              Set
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={assignLead} className="flex items-center gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <Select name="assignedToId" defaultValue={lead.assignedToId ?? ''} className="h-9 text-sm">
                <option value="">Unassigned</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="sm" variant="outline">
                Assign
              </Button>
            </form>
          </CardContent>
        </Card>

        {lead.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">{lead.notes}</CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogActivityForm leadId={lead.id} />

          {lead.activities.length === 0 ? (
            <p className="text-sm text-muted">No activity logged yet.</p>
          ) : (
            <ul className="space-y-4 border-t border-border pt-4">
              {lead.activities.map((activity) => (
                <li key={activity.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{CRM_ACTIVITY_TYPE_LABELS[activity.type]}</span>
                    <span className="text-xs text-muted">
                      {formatDateTime(activity.createdAt)} · {activity.createdBy.name}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">{activity.notes}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
