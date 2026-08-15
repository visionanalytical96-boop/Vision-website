import { DownloadKind } from '@/generated/prisma/enums';

export const DOWNLOAD_KINDS = Object.values(DownloadKind);

export const DOWNLOAD_KIND_LABELS: Record<DownloadKind, string> = {
  DATASHEET: 'Datasheet',
  MANUAL: 'Manual',
  BROCHURE: 'Brochure',
  CATALOGUE: 'Catalogue',
  APPLICATION_NOTE: 'Application note',
  CERTIFICATE: 'Certificate',
  SOFTWARE: 'Software',
};

export function isDownloadKind(value: string | undefined): value is DownloadKind {
  return DOWNLOAD_KINDS.some((kind) => kind === value);
}
