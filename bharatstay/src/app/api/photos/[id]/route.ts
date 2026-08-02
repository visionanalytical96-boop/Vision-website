import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const photo = await db.photo.findUnique({
    where: { id: params.id },
    select: { data: true, mimeType: true },
  });
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      'Content-Type': photo.mimeType,
      // Bytes for a given id never change — a replaced photo gets a new id.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
