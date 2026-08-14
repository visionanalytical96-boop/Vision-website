import type { Metadata } from 'next';
import { IMPORT_DEFINITIONS } from '@/lib/import/definitions';
import type { ImportDefinitionInfo } from '@/lib/import/registry';
import { ImportWizard } from '@/components/forms/ImportWizard';

export const metadata: Metadata = { title: 'Bulk Import' };

export default function AdminImportPage() {
  // Build the serialisable shape the client component needs. The full
  // definitions carry Prisma methods the client cannot touch; this extracts
  // only the metadata.
  const definitions: ImportDefinitionInfo[] = IMPORT_DEFINITIONS.map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    duplicateBy: def.duplicateBy,
    columns: def.columns.map((col) => ({
      key: col.key,
      label: col.label,
      required: col.required,
      description: col.description,
      example: col.example,
    })),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Bulk Import</h2>
        <p className="mt-1 text-sm text-muted">
          Upload a CSV or Excel file to add data in bulk — products, customers, companies and more.
          Existing records are updated, new ones are created. Nothing is changed until you confirm.
        </p>
      </div>

      <ImportWizard definitions={definitions} />
    </div>
  );
}
