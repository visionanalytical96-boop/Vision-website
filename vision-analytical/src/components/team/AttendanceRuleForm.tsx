'use client';

import { useActionState } from 'react';
import { saveAttendanceRule, type TeamFormState } from '@/lib/actions/admin-team';
import type { AttendanceRule } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { submittedOr } from '@/lib/form-values';
import { WEEKDAYS } from '@/lib/team-labels';

const initialState: TeamFormState = {};

/**
 * Offered zones rather than a free-text box: a typo in an IANA name is
 * rejected server-side anyway, and a list makes the common case one click.
 */
const TIME_ZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'UTC',
];

interface Fallback {
  timezone: string;
  officeStartTime: string;
  officeEndTime: string;
  graceMinutes: number;
  halfDayAfterMinutes: number;
  fullDayMinutes: number;
  halfDayMinutes: number;
  overtimeAfterMinutes: number;
  weeklyOffDays: number[];
}

export function AttendanceRuleForm({ rule, fallback }: { rule: AttendanceRule | null; fallback: Fallback }) {
  const [state, formAction, pending] = useActionState(saveAttendanceRule, initialState);
  const current = rule ?? fallback;
  const zones = TIME_ZONES.includes(current.timezone) ? TIME_ZONES : [current.timezone, ...TIME_ZONES];

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <FormField label="Time zone" htmlFor="timezone" error={state.errors?.timezone} required>
          <Select id="timezone" name="timezone" defaultValue={submittedOr(state.values, 'timezone', current.timezone)}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </FormField>

        <div />

        <FormField label="Office starts" htmlFor="officeStartTime" error={state.errors?.officeStartTime} required>
          <Input
            id="officeStartTime"
            name="officeStartTime"
            type="time"
            defaultValue={submittedOr(state.values, 'officeStartTime', current.officeStartTime)}
            required
          />
        </FormField>

        <FormField label="Office ends" htmlFor="officeEndTime" error={state.errors?.officeEndTime} required>
          <Input
            id="officeEndTime"
            name="officeEndTime"
            type="time"
            defaultValue={submittedOr(state.values, 'officeEndTime', current.officeEndTime)}
            required
          />
        </FormField>

        <FormField
          label="Grace period (minutes)"
          htmlFor="graceMinutes"
          error={state.errors?.graceMinutes}
          hint="Arriving within this isn't late."
        >
          <Input
            id="graceMinutes"
            name="graceMinutes"
            type="number"
            min="0"
            defaultValue={submittedOr(state.values, 'graceMinutes', current.graceMinutes)}
          />
        </FormField>

        <FormField
          label="Half day after (minutes late)"
          htmlFor="halfDayAfterMinutes"
          error={state.errors?.halfDayAfterMinutes}
          hint="Arriving later than this costs half the day."
        >
          <Input
            id="halfDayAfterMinutes"
            name="halfDayAfterMinutes"
            type="number"
            min="0"
            defaultValue={submittedOr(state.values, 'halfDayAfterMinutes', current.halfDayAfterMinutes)}
          />
        </FormField>

        <FormField
          label="Full day (minutes worked)"
          htmlFor="fullDayMinutes"
          error={state.errors?.fullDayMinutes}
          hint="480 is eight hours."
        >
          <Input
            id="fullDayMinutes"
            name="fullDayMinutes"
            type="number"
            min="0"
            defaultValue={submittedOr(state.values, 'fullDayMinutes', current.fullDayMinutes)}
          />
        </FormField>

        <FormField
          label="Half day (minutes worked)"
          htmlFor="halfDayMinutes"
          error={state.errors?.halfDayMinutes}
          hint="Below this, the day doesn't count."
        >
          <Input
            id="halfDayMinutes"
            name="halfDayMinutes"
            type="number"
            min="0"
            defaultValue={submittedOr(state.values, 'halfDayMinutes', current.halfDayMinutes)}
          />
        </FormField>

        <FormField
          label="Overtime after (minutes)"
          htmlFor="overtimeAfterMinutes"
          error={state.errors?.overtimeAfterMinutes}
          hint="Anything beyond this is recorded as overtime."
        >
          <Input
            id="overtimeAfterMinutes"
            name="overtimeAfterMinutes"
            type="number"
            min="0"
            defaultValue={submittedOr(state.values, 'overtimeAfterMinutes', current.overtimeAfterMinutes)}
          />
        </FormField>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Weekly offs</legend>
        <p className="mt-1 text-sm text-muted">Nobody is marked absent on these days.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {WEEKDAYS.map((day) => (
            <label key={day.value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="weeklyOffDays"
                value={day.value}
                defaultChecked={current.weeklyOffDays.includes(day.value)}
                className="h-4 w-4 rounded border-border"
              />
              {day.name}
            </label>
          ))}
        </div>
      </fieldset>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.message && <p className="max-w-3xl text-sm text-success">{state.message}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save rules'}
      </Button>
    </form>
  );
}
