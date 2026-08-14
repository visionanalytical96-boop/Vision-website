'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Opens the browser's print dialog, where "Save as PDF" is the destination.
 *
 * No PDF library: the print stylesheet already lays the sheet out on A4, and a
 * renderer bundled into the server would be a second layout to keep in step
 * with this one. What the customer signs and what downloads are the same DOM.
 */
export function PrintButton({ label = 'Download PDF' }: { label?: string }) {
  return (
    <Button type="button" onClick={() => window.print()} className="print-hide">
      <Download className="h-4 w-4" aria-hidden /> {label}
    </Button>
  );
}
