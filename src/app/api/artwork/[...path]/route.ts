import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const ARTWORK_DIR = path.join(process.cwd(), 'artwork');
const SEGMENT_REGEX = /^[\w.\-\s\\]+$/;

const mimeMap: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await params;

  if (!segments || segments.length === 0) {
    return new Response('Missing path', { status: 400 });
  }

  if (segments.length > 2) {
    return new Response('Path too deep', { status: 400 });
  }

  for (const seg of segments) {
    if (!SEGMENT_REGEX.test(seg) || seg === '..') {
      return new Response('Invalid path segment', { status: 400 });
    }
  }

  const resolved = path.resolve(path.join(ARTWORK_DIR, ...segments));
  const base = path.resolve(ARTWORK_DIR);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const stats = await stat(resolved);
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

  const filename = segments[segments.length - 1];
  const ext = path.extname(filename).toLowerCase();
  const contentType = mimeMap[ext] ?? 'application/octet-stream';
  const stream = createReadStream(resolved);
  return new Response(stream as unknown as BodyInit, {
    headers: { 'Content-Type': contentType },
  });
}
