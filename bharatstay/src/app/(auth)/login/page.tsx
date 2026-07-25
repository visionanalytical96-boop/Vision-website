'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';

export default function LoginPage() {
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage your bookings and travel faster."
      footer={
        <>
          New to BharatStay?{' '}
          <Link href="/register" className="font-semibold text-royal-700 hover:text-saffron-600">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-5 flex rounded-lg bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${mode === 'password' ? 'bg-white shadow-card text-royal-900' : 'text-royal-500'}`}
        >
          Email &amp; Password
        </button>
        <button
          type="button"
          onClick={() => setMode('otp')}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${mode === 'otp' ? 'bg-white shadow-card text-royal-900' : 'text-royal-500'}`}
        >
          Mobile OTP
        </button>
      </div>

      {mode === 'password' ? (
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="field-label" htmlFor="email">Email address</label>
            <input id="email" type="email" required className="input-field" placeholder="you@example.com" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="field-label" htmlFor="password">Password</label>
              <Link href="/forgot-password" className="text-xs font-medium text-royal-500 hover:text-saffron-600">
                Forgot password?
              </Link>
            </div>
            <input id="password" type="password" required className="input-field" placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-primary w-full">Log In</button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setOtpSent(true); }}>
          <div>
            <label className="field-label" htmlFor="phone">Mobile number</label>
            <div className="flex gap-2">
              <span className="input-field w-16 text-center">+91</span>
              <input id="phone" type="tel" required className="input-field flex-1" placeholder="98765 43210" />
            </div>
          </div>
          {otpSent ? (
            <div>
              <label className="field-label" htmlFor="otp">Enter OTP</label>
              <input id="otp" inputMode="numeric" maxLength={6} required className="input-field tracking-[0.5em]" placeholder="••••••" />
              <p className="mt-1 text-xs text-royal-400">OTP sent — valid for 5 minutes.</p>
            </div>
          ) : null}
          <button type="submit" className="btn-primary w-full">{otpSent ? 'Verify & Log In' : 'Send OTP'}</button>
        </form>
      )}

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-surface-border" />
        <span className="text-xs text-royal-400">or continue with</span>
        <div className="h-px flex-1 bg-surface-border" />
      </div>
      <SocialLoginButtons />
    </AuthShell>
  );
}
