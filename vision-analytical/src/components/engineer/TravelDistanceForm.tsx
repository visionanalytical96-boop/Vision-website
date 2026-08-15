'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { recordTravelDistance, type VisitActionState } from '@/lib/actions/engineer-visits';

/**
 * Odometer reading, typed by the engineer.
 *
 * Not derived from the two GPS fixes: the straight line between them is not
 * the road that was driven, and this number ends up on an expense claim.
 */
export function TravelDistanceForm({ visitId, current }: { visitId: string; current: number | null }) {
  const [state, formAction, pending] = useActionState<VisitActionState | undefined, FormData>(
    recordTravelDistance,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
      <input type="hidden" name="visitId" value={visitId} />
      <div>
        <label htmlFor="travelDistanceKm" className="text-xs font-medium text-muted">
          Distance travelled (km)
        </label>
        <Input
          id="travelDistanceKm"
          name="travelDistanceKm"
          type="number"
          min="0"
          step="0.1"
          inputMode="decimal"
          defaultValue={current ?? ''}
          className="h-9 w-32"
          placeholder="0.0"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      {state?.error && <p className="w-full text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-success">{state.success}</p>}
    </form>
  );
}
