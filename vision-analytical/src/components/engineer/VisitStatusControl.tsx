'use client';

import { useActionState, useEffect, useState } from 'react';
import { MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { transitionVisit, type VisitActionState } from '@/lib/actions/engineer-visits';
import {
  visitStatusMeta,
  requiresNote,
  expectsLocation,
  isLocationTrustworthy,
  GPS_TRUSTWORTHY_ACCURACY_M,
} from '@/lib/service-visit';
import type { VisitStatus } from '@/generated/prisma/enums';

interface Fix {
  latitude: number;
  longitude: number;
  accuracyM: number;
}

/**
 * A reading belongs to the transition it was taken for.
 *
 * Keyed by status so a fix taken at check-in is never submitted again as the
 * check-out location — that would be a recorded claim about where someone was
 * that nobody actually made.
 */
interface Reading {
  status: VisitStatus;
  fix: Fix | null;
  error: string | null;
}

interface Props {
  visitId: string;
  options: VisitStatus[];
}

/**
 * The one control an engineer uses on site.
 *
 * Location is requested only when the transition is a claim about being
 * somewhere, so the phone does not prompt for GPS every time a note is saved.
 * A refused or vague fix never blocks the job — an engineer in a basement plant
 * room still has to be able to record their work.
 */
export function VisitStatusControl({ visitId, options }: Props) {
  const [selected, setSelected] = useState<VisitStatus | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [state, formAction, pending] = useActionState<VisitActionState | undefined, FormData>(transitionVisit, undefined);

  // A completed transition changes what can happen next, so the option the
  // engineer picked is no longer on offer. Deriving the open form from that
  // closes it on success without watching the action's result.
  const openFor = selected !== null && options.includes(selected) ? selected : null;
  const wantsLocation = openFor !== null && expectsLocation(openFor);
  const current = reading?.status === openFor ? reading : null;
  const geolocationSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const locating = wantsLocation && geolocationSupported && current === null;

  useEffect(() => {
    if (openFor === null || !expectsLocation(openFor)) return;
    if (!geolocationSupported) return;
    if (reading?.status === openFor) return;

    // One fix, not a running watch: a check-in is a single claim about a
    // moment, and holding the GPS open drains a battery the engineer needs for
    // the rest of the day.
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setReading({
          status: openFor,
          fix: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM: position.coords.accuracy,
          },
          error: null,
        });
      },
      () => {
        if (cancelled) return;
        setReading({ status: openFor, fix: null, error: 'Location unavailable. You can still continue without it.' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );

    return () => {
      cancelled = true;
    };
  }, [openFor, geolocationSupported, reading?.status]);

  if (options.length === 0) {
    return <p className="text-sm text-muted">This job is finished. Nothing further to record here.</p>;
  }

  const fix = current?.fix ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={openFor === status ? 'primary' : 'outline'}
            onClick={() => setSelected(openFor === status ? null : status)}
          >
            {visitStatusMeta[status].action}
          </Button>
        ))}
      </div>

      {openFor && (
        <form action={formAction} className="space-y-3 rounded-xl border border-border bg-surface-muted p-4">
          <input type="hidden" name="visitId" value={visitId} />
          <input type="hidden" name="status" value={openFor} />
          {fix && (
            <>
              <input type="hidden" name="latitude" value={fix.latitude} />
              <input type="hidden" name="longitude" value={fix.longitude} />
              <input type="hidden" name="accuracyM" value={fix.accuracyM} />
            </>
          )}

          <p className="text-sm text-foreground">{visitStatusMeta[openFor].description}</p>

          <div>
            <label htmlFor="visit-note" className="text-xs font-medium text-muted">
              {requiresNote(openFor) ? 'Reason (required)' : 'Note (optional)'}
            </label>
            <Textarea
              id="visit-note"
              name="note"
              rows={2}
              required={requiresNote(openFor)}
              placeholder={requiresNote(openFor) ? 'Why is the job going to this state?' : 'Anything worth recording'}
            />
          </div>

          {wantsLocation && (
            <div className="flex items-start gap-2 text-xs">
              {locating ? (
                <>
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted" />
                  <span className="text-muted">Getting your location…</span>
                </>
              ) : fix ? (
                <>
                  <MapPin
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isLocationTrustworthy(fix.accuracyM) ? 'text-success' : 'text-warning'}`}
                  />
                  <span className="text-muted">
                    {fix.latitude.toFixed(5)}, {fix.longitude.toFixed(5)} · accurate to {Math.round(fix.accuracyM)}m
                    {!isLocationTrustworthy(fix.accuracyM) &&
                      ` — recorded, but too vague to confirm you are on site (needs ${GPS_TRUSTWORTHY_ACCURACY_M}m or better)`}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  <span className="text-muted">
                    {current?.error ??
                      (geolocationSupported
                        ? 'No location yet.'
                        : 'This device cannot report its location. You can still continue.')}
                  </span>
                </>
              )}
            </div>
          )}

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : `Confirm: ${visitStatusMeta[openFor].action}`}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {state?.success && !openFor && <p className="text-sm text-success">{state.success}</p>}
    </div>
  );
}
