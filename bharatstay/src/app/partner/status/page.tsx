'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function FindApplicationPage() {
  const router = useRouter();
  const [token, setToken] = useState('');

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-16">
      <p className="eyebrow">Owners ke liye</p>
      <h1 className="display mt-3 text-[clamp(28px,5vw,42px)]">Application status</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
        Form bhejne ke baad jo link mila tha, wahi kholiye. Us link ke aakhir wala code yahan bhi daal sakte hain.
      </p>

      <form
        className="mt-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const clean = token.trim().split('/').pop() ?? '';
          if (clean) router.push(`/partner/status/${encodeURIComponent(clean)}`);
        }}
      >
        <label className="sr-only" htmlFor="token">
          Application code
        </label>
        <input
          id="token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Application code ya poora link"
          className="flex-1 rounded-xl border px-4 py-3 text-[15px] outline-none"
          style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
        />
        <button className="btn btn-primary shrink-0" type="submit">
          Kholo
        </button>
      </form>

      <a href="/" className="mt-10 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
        ← Home
      </a>
    </main>
  );
}
