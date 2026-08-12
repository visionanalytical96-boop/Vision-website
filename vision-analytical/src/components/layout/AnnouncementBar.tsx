'use client';

import { useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { X, Megaphone } from 'lucide-react';

/**
 * Dismissal is keyed on the message text, so editing the announcement brings
 * it back for everyone who had dismissed the previous one.
 */
function storageKey(message: string): string {
  let hash = 0;
  for (let index = 0; index < message.length; index += 1) {
    hash = (hash * 31 + message.charCodeAt(index)) | 0;
  }
  return `va-announcement-${hash}`;
}

// localStorage is an external store, so it is read through
// useSyncExternalStore rather than mirrored into state in an effect: that way
// the server renders "visible" and the client corrects during hydration,
// without a second render pass.
const listeners = new Set<() => void>();
// Covers private browsing and blocked storage: dismissing still works, it just
// doesn't survive a reload.
const dismissedThisSession = new Set<string>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function AnnouncementBar({
  message,
  linkLabel,
  linkHref,
}: {
  message: string;
  linkLabel: string;
  linkHref: string;
}) {
  const key = storageKey(message);

  const getSnapshot = useCallback(() => {
    if (dismissedThisSession.has(key)) return true;
    try {
      return window.localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }, [key]);

  const dismissed = useSyncExternalStore(subscribe, getSnapshot, () => false);
  if (dismissed) return null;

  function dismiss() {
    dismissedThisSession.add(key);
    try {
      window.localStorage.setItem(key, '1');
    } catch {
      // Storage is unavailable; the in-memory set still hides it until reload.
    }
    for (const listener of listeners) listener();
  }

  return (
    <div className="border-b border-border bg-primary text-white">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <Megaphone className="h-4 w-4 flex-none" aria-hidden />
        <p className="min-w-0 flex-1 text-sm">
          {message}
          {linkLabel && linkHref ? (
            <>
              {' '}
              <Link href={linkHref} className="font-medium underline underline-offset-2">
                {linkLabel}
              </Link>
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="-mr-1 flex h-7 w-7 flex-none items-center justify-center rounded-md transition-colors hover:bg-white/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
