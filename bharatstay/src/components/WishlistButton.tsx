'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * The heart on a stay card and on the stay page.
 *
 * Saving needs an account, so a logged-out tap goes to login and comes back to
 * where it started rather than silently doing nothing. The fill flips
 * immediately and rolls back if the request fails — a heart that lags behind
 * the tap feels broken even when it worked.
 */
export function WishlistButton({
  stayId,
  initialSaved = false,
  size = 34,
  className = '',
}: {
  stayId: string;
  initialSaved?: boolean;
  size?: number;
  className?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    // The card is wrapped in a link; without this the page navigates away.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    setBusy(true);
    const next = !saved;
    setSaved(next);

    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stayId }),
      });

      if (res.status === 401) {
        setSaved(!next);
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (!res.ok) {
        setSaved(!next);
        return;
      }
      const json = (await res.json()) as { saved: boolean };
      setSaved(json.saved);
      router.refresh();
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'Wishlist se hatao' : 'Wishlist mein save karo'}
      title={saved ? 'Wishlist se hatao' : 'Wishlist mein save karo'}
      data-testid="wishlist-toggle"
      className={`inline-flex items-center justify-center rounded-full transition ${className}`}
      style={{
        width: size,
        height: size,
        background: 'var(--surface)',
        color: saved ? 'var(--laterite)' : 'var(--basalt-soft)',
        opacity: busy ? 0.65 : 1,
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 20.6 3.9 12.9a5 5 0 0 1 7.1-7l1 1 1-1a5 5 0 1 1 7.1 7Z"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
