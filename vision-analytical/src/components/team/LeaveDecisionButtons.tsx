'use client';

import { decideLeaveRequest } from '@/lib/actions/admin-team';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';

/**
 * Approving is the consequential one - it writes attendance rows for every day
 * in the range - so it says so before it happens.
 */
export function LeaveDecisionButtons({
  id,
  employeeName,
  days,
}: {
  id: string;
  employeeName: string;
  days: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <form action={decideLeaveRequest}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="APPROVED" />
        <ConfirmSubmitButton
          confirmMessage={`Approve ${days} day(s) for ${employeeName}? Those days will be marked On leave in the attendance register.`}
          className="text-xs font-medium text-success hover:underline"
        >
          Approve
        </ConfirmSubmitButton>
      </form>
      <form action={decideLeaveRequest}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="REJECTED" />
        <ConfirmSubmitButton
          confirmMessage={`Reject this request for ${employeeName}?`}
          className="text-xs font-medium text-danger hover:underline"
        >
          Reject
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
