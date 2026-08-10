'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/dal';
import { deleteMediaFile } from '@/lib/media';
import { saveUploadedImage } from '@/lib/upload-image';
import { Role } from '@/generated/prisma/client';
import type { CmsFormState } from '@/lib/actions/admin-cms';

export async function deleteMedia(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const url = String(formData.get('url') ?? '');
  if (!url) return;

  await deleteMediaFile(url);
  revalidatePath('/admin/website/media');
}

export async function uploadMedia(_prevState: CmsFormState | undefined, formData: FormData): Promise<CmsFormState> {
  await requireRole(Role.ADMIN);

  const file = formData.get('image');
  const upload = await saveUploadedImage(file instanceof File ? file : null, 'site');
  if (upload.error) {
    return { formError: upload.error };
  }
  if (!upload.url) {
    return { formError: 'Choose an image to upload.' };
  }

  revalidatePath('/admin/website/media');
  return { success: true };
}
