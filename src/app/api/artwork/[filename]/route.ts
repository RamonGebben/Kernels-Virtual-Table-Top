import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const ARTWORK_DIR = path.join(process.cwd(), 'artwork');

const mimeMap: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  if (!rawFilename) {
    return new Response('Missing filename', { status: 400 });
  }
  const filename = path.basename(rawFilename);
  const target = path.join(ARTWORK_DIR, filename);

  try {
    const stats = await stat(target);
    if (!stats.isFile()) {
      return new Response('Not found', { status: 404 });
    }
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return new Response('Not found', { status: 404 });
    }
    throw error;
  }

  const stream = createReadStream(target);
  const ext = path.extname(filename).toLowerCase();
  const contentType = mimeMap[ext] ?? 'application/octet-stream';
  return new Response(stream as unknown as BodyInit, {
    headers: { 'Content-Type': contentType },
  });
}
