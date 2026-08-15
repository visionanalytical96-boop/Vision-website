'use client';

import { useRef, useState, useTransition, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { previewImport, commitImport } from '@/app/admin/import/actions';
import type { PreviewResult, CommitResult } from '@/app/admin/import/actions';
import type { ImportDefinitionInfo } from '@/lib/import/registry';

type Step = 'select' | 'upload' | 'preview' | 'done';

interface ImportWizardProps {
  definitions: ImportDefinitionInfo[];
}

export function ImportWizard({ definitions }: ImportWizardProps) {
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<ImportDefinitionInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const definition = selected;

  const handleSelect = useCallback((def: ImportDefinitionInfo) => {
    setSelected(def);
    setFile(null);
    setPreview(null);
    setResult(null);
    setStep('upload');
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setFile(chosen);
    setPreview(null);
  }, []);

  const handlePreview = useCallback(() => {
    if (!file || !definition) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('definition', definition.key);
      formData.set('file', file);
      const result = await previewImport(formData);
      setPreview(result);
      if (result.ok) setStep('preview');
    });
  }, [file, definition]);

  const handleCommit = useCallback(() => {
    if (!file || !definition) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('definition', definition.key);
      formData.set('file', file);
      const commitResult = await commitImport(formData);
      setResult(commitResult);
      setStep('done');
    });
  }, [file, definition]);

  const handleDownloadTemplate = useCallback(() => {
    if (!definition) return;
    const escape = (v: string) =>
      v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    const headers = definition.columns.map((c) => escape(c.label));
    const examples = definition.columns.map((c) => escape(c.example));
    const csv = [headers.join(','), examples.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${definition.key}-template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [definition]);

  const reset = useCallback(() => {
    setStep('select');
    setSelected(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['select', 'upload', 'preview', 'done'] as Step[]).map((s, i) => {
          const labels = ['Choose type', 'Upload file', 'Review', 'Done'];
          const isCurrent = step === s;
          const isPast = (['select', 'upload', 'preview', 'done'] as Step[]).indexOf(step) > i;
          return (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted">/</span>}
              <span
                className={
                  isCurrent
                    ? 'font-semibold text-primary'
                    : isPast
                      ? 'text-foreground'
                      : 'text-muted'
                }
              >
                {labels[i]}
              </span>
            </span>
          );
        })}
      </div>

      {/* STEP 1: Select entity type */}
      {step === 'select' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {definitions.map((def) => (
            <button
              key={def.key}
              type="button"
              onClick={() => handleSelect(def)}
              className="group rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-primary hover:shadow-md va-press"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{def.label}</p>
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">{def.description}</p>
                  <p className="mt-1.5 text-[11px] text-muted">
                    Duplicates matched by <span className="font-medium text-foreground">{def.duplicateBy}</span>
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* STEP 2: Upload file */}
      {step === 'upload' && definition && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep('select')} className="text-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Import {definition.label}
              </h3>
              <p className="text-sm text-muted">{definition.description}</p>
            </div>
          </div>

          {/* Column reference */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground">Expected columns</p>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-3.5 w-3.5" />
                  Download template
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 text-left font-medium text-foreground">Column</th>
                      <th className="py-2 pr-4 text-left font-medium text-foreground">Required</th>
                      <th className="py-2 pr-4 text-left font-medium text-foreground">Description</th>
                      <th className="py-2 text-left font-medium text-foreground">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {definition.columns.map((col) => (
                      <tr key={col.key} className="border-b border-border/50">
                        <td className="py-1.5 pr-4 font-mono text-xs text-foreground">{col.label}</td>
                        <td className="py-1.5 pr-4">
                          {col.required ? (
                            <span className="text-xs font-medium text-primary">Required</span>
                          ) : (
                            <span className="text-xs text-muted">Optional</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-4 text-xs text-muted">{col.description}</td>
                        <td className="py-1.5 font-mono text-xs text-muted">{col.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* File picker */}
          <Card>
            <CardContent>
              <label
                htmlFor="import-file"
                className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-surface-muted"
              >
                <Upload className="h-8 w-8 text-muted" />
                <div>
                  <p className="font-medium text-foreground">
                    {file ? file.name : 'Choose a .csv or .xlsx file'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : 'Drop your spreadsheet here, or click to browse'}
                  </p>
                </div>
                <input
                  ref={fileRef}
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx,.xlsm,.txt"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>

              {/* Preview error (from file reading) */}
              {preview && !preview.ok && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{preview.error}</span>
                </div>
              )}

              {file && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handlePreview} disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validating…
                      </>
                    ) : (
                      <>
                        Validate & preview
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: Preview */}
      {step === 'preview' && definition && preview && preview.ok && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep('upload')} className="text-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Review — {definition.label}
              </h3>
              <p className="text-sm text-muted">{file?.name}</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Total rows" value={preview.totalRows} />
            <SummaryCard label="Will create" value={preview.createRows} variant="success" />
            <SummaryCard label="Will update" value={preview.updateRows} variant="info" />
            <SummaryCard label="Errors" value={preview.errorRows} variant={preview.errorRows > 0 ? 'danger' : 'default'} />
          </div>

          {/* Warnings */}
          {preview.missingRequired.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Missing required columns: <strong>{preview.missingRequired.join(', ')}</strong>.
                Rows using these will fail validation.
              </span>
            </div>
          )}
          {preview.unknownHeaders.length > 0 && (
            <p className="text-xs text-muted">
              Columns ignored (not in the template): {preview.unknownHeaders.join(', ')}
            </p>
          )}

          {/* Row table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted">
                      <th className="px-3 py-2 text-left font-medium text-foreground">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
                      {definition.columns.slice(0, 4).map((col) => (
                        <th key={col.key} className="px-3 py-2 text-left font-medium text-foreground">
                          {col.label}
                        </th>
                      ))}
                      {definition.columns.length > 4 && (
                        <th className="px-3 py-2 text-left font-medium text-muted">
                          +{definition.columns.length - 4} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 50).map((row, index) => (
                      <tr
                        key={index}
                        className={`border-b border-border/50 ${
                          row.status === 'error' ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                        }`}
                      >
                        <td className="px-3 py-1.5 font-mono text-xs text-muted">{row.rowNumber}</td>
                        <td className="px-3 py-1.5">
                          <StatusPill status={row.status} />
                        </td>
                        {definition.columns.slice(0, 4).map((col) => (
                          <td key={col.key} className="max-w-[200px] truncate px-3 py-1.5 text-xs text-foreground">
                            {row.values[col.key] || <span className="text-muted">—</span>}
                          </td>
                        ))}
                        {definition.columns.length > 4 && (
                          <td className="px-3 py-1.5 text-xs text-muted">…</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 50 && (
                <p className="border-t border-border px-3 py-2 text-xs text-muted">
                  Showing first 50 of {preview.rows.length} rows
                </p>
              )}
            </CardContent>
          </Card>

          {/* Error details */}
          {preview.errorRows > 0 && (
            <Card>
              <CardContent>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Rows with errors ({preview.errorRows})
                </p>
                <p className="mb-3 text-xs text-muted">
                  These rows will be skipped. Fix them in the file and re-upload, or import what is valid now and fix the rest later.
                </p>
                <div className="space-y-2">
                  {preview.rows
                    .filter((r) => r.status === 'error')
                    .slice(0, 20)
                    .map((row, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <span className="shrink-0 font-mono text-muted">Row {row.rowNumber}:</span>
                        <ul className="list-disc pl-4 text-red-600 dark:text-red-400">
                          {row.errors.map((error, errorIndex) => (
                            <li key={errorIndex}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  {preview.errorRows > 20 && (
                    <p className="text-xs text-muted">… and {preview.errorRows - 20} more rows with errors.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              <ArrowLeft className="h-4 w-4" />
              Change file
            </Button>
            <Button onClick={handleCommit} disabled={isPending || preview.validRows === 0}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Import {preview.validRows} {preview.validRows === 1 ? 'row' : 'rows'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === 'done' && result && (
        <div className="space-y-5">
          {result.ok ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950/30">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600 dark:text-green-400" />
              <h3 className="mt-3 font-display text-lg font-semibold text-foreground">Import complete</h3>
              <div className="mt-3 flex items-center justify-center gap-6 text-sm">
                <span className="text-green-700 dark:text-green-300">
                  <strong>{result.created}</strong> created
                </span>
                <span className="text-blue-700 dark:text-blue-300">
                  <strong>{result.updated}</strong> updated
                </span>
                {result.skipped > 0 && (
                  <span className="text-amber-700 dark:text-amber-300">
                    <strong>{result.skipped}</strong> skipped (errors)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/30">
              <AlertCircle className="mx-auto h-10 w-10 text-red-600 dark:text-red-400" />
              <h3 className="mt-3 font-display text-lg font-semibold text-foreground">Import failed</h3>
              <p className="mt-2 text-sm text-muted">{result.error}</p>
            </div>
          )}

          <div className="flex justify-center">
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              Import more data
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Small helpers -----------------------------------------------------------

function SummaryCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'info' | 'danger';
}) {
  const colors = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    info: 'text-blue-600 dark:text-blue-400',
    danger: 'text-red-600 dark:text-red-400',
  };
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-center">
      <p className={`font-display text-2xl font-bold tabular-nums ${colors[variant]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: 'create' | 'update' | 'error' }) {
  const styles = {
    create: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  const labels = { create: 'New', update: 'Update', error: 'Error' };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
