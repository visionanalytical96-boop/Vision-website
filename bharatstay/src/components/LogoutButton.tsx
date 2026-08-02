'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function LogoutButton({ onDark = false }: { onDark?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      style={onDark ? { color: 'var(--mist)', borderColor: 'rgb(255 255 255 / 0.2)' } : undefined}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          router.replace('/');
          router.refresh();
        })
      }
    >
      {pending ? 'Logging out…' : 'Log out'}
    </button>
  );
}
