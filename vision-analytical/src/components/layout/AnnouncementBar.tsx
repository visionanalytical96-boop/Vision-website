'use client';

import { useEffect, useState } from 'react';
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

export function AnnouncementBar({
  message,
  linkLabel,
  linkHref,
}: {
  message: string;
  linkLabel: string;
  linkHref: string;
}) {
  // Rendered server-side by default: a returning visitor who dismissed it sees
  // a brief flash, which beats every other visitor getting layout shift.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey(message)) === '1') setDismissed(true);
    } catch {
      // Private browsing or blocked storage - just leave the bar visible.
    }
  }, [message]);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey(message), '1');
    } catch {
      // Nothing to do - the bar is hidden for this page view either way.
    }
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
