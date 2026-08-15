'use client';

import { markMissingAsAbsent } from '@/lib/actions/admin-team';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { buttonVariants } from '@/components/ui/Button';

/**
 * Closing a day writes an attendance row for everyone still unmarked, so it
 * asks first and says exactly how many people it will touch.
 */
export function DayCloseButton({ dayKey, count }: { dayKey: string; count: number }) {
  return (
    <form action={markMissingAsAbsent}>
      <input type="hidden" name="date" value={dayKey} />
      <ConfirmSubmitButton
        confirmMessage={`Close ${dayKey}? This writes an attendance row for ${count} unmarked employee(s). Every row is logged and can be corrected afterwards.`}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Close the day
      </ConfirmSubmitButton>
    </form>
  );
}
