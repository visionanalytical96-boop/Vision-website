'use client';

import { Logo } from '@/components/layout/Logo';

export function VoucherShell({
  title,
  statusLabel,
  children,
  shareText,
}: {
  title: string;
  statusLabel: string;
  children: React.ReactNode;
  shareText: string;
}) {
  return (
    <div className="container-xl py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <h1 className="text-xl font-bold text-royal-900">{title}</h1>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="btn-secondary text-sm">
              🖨️ Print
            </button>
            <button type="button" onClick={() => window.print()} className="btn-secondary text-sm">
              ⬇️ Download PDF
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-sm"
            >
              💬 Share on WhatsApp
            </a>
            <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`} className="btn-secondary text-sm">
              ✉️ Email
            </a>
          </div>
        </div>

        <div className="rounded-xl2 border border-surface-border bg-white p-6 shadow-card print:border-0 print:shadow-none sm:p-8">
          <div className="flex items-start justify-between border-b border-dashed border-surface-border pb-4">
            <Logo />
            <div className="text-right">
              <span className="badge-success">{statusLabel}</span>
            </div>
          </div>
          <div className="mt-6 space-y-6">{children}</div>
          <div className="mt-8 flex items-center justify-between border-t border-dashed border-surface-border pt-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-surface-border text-3xl" aria-label="QR code placeholder for booking verification">
              ▦
            </div>
            <div className="text-right text-xs text-royal-400">
              <p>BharatStay Travels Pvt. Ltd.</p>
              <p>support@bharatstay.example · 1800-123-4567</p>
              <p>GSTIN: 27ABCDE1234F1Z5</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VoucherRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-surface-border py-1.5 text-sm last:border-0">
      <span className="text-royal-500">{label}</span>
      <span className="text-right font-medium text-royal-900">{value}</span>
    </div>
  );
}
