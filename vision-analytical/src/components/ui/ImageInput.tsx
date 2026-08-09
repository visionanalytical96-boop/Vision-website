'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus } from 'lucide-react';

interface ImageInputProps {
  name: string;
  label: string;
  defaultImageUrl?: string | null;
  error?: string | string[];
  hint?: string;
}

export function ImageInput({ name, label, defaultImageUrl, error, hint }: ImageInputProps) {
  const [preview, setPreview] = useState<string | null>(defaultImageUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorMessage = Array.isArray(error) ? error[0] : error;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-muted">
          {preview ? (
            <Image src={preview} alt="" fill unoptimized={preview.startsWith('blob:')} className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-muted"
          >
            {preview ? 'Change image' : 'Upload image'}
          </button>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPreview(URL.createObjectURL(file));
        }}
      />
      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
    </div>
  );
}
