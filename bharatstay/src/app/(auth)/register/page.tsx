'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';

export default function RegisterPage() {
  const [agreed, setAgreed] = useState(false);

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join BharatStay for faster checkout and exclusive deals."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-royal-700 hover:text-saffron-600">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="firstName">First name</label>
            <input id="firstName" required className="input-field" placeholder="Ananya" />
          </div>
          <div>
            <label className="field-label" htmlFor="lastName">Last name</label>
            <input id="lastName" required className="input-field" placeholder="Sharma" />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="reg-email">Email address</label>
          <input id="reg-email" type="email" required className="input-field" placeholder="you@example.com" />
        </div>
        <div>
          <label className="field-label" htmlFor="reg-phone">Mobile number</label>
          <div className="flex gap-2">
            <span className="input-field w-16 text-center">+91</span>
            <input id="reg-phone" type="tel" required className="input-field flex-1" placeholder="98765 43210" />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="reg-password">Password</label>
          <input id="reg-password" type="password" required minLength={8} className="input-field" placeholder="Minimum 8 characters" />
        </div>
        <label className="flex items-start gap-2 text-xs text-royal-500">
          <input
            type="checkbox"
            required
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-surface-border text-royal-700"
          />
          I agree to BharatStay&rsquo;s{' '}
          <Link href="/legal/terms" className="font-medium text-royal-700 hover:text-saffron-600">Terms &amp; Conditions</Link>{' '}
          and{' '}
          <Link href="/legal/privacy-policy" className="font-medium text-royal-700 hover:text-saffron-600">Privacy Policy</Link>.
        </label>
        <button type="submit" className="btn-primary w-full" disabled={!agreed}>
          Create Account
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-surface-border" />
        <span className="text-xs text-royal-400">or sign up with</span>
        <div className="h-px flex-1 bg-surface-border" />
      </div>
      <SocialLoginButtons />
    </AuthShell>
  );
}
