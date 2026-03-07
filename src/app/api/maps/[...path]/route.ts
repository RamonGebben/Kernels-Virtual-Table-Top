import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAPS_DIR = path.join(process.cwd(), 'maps');
const SEGMENT_REGEX = /^[\w.\-\s\\]+$/;

const contentTypeFor = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;

  if (!segments || segments.length === 0) {
    return new NextResponse(JSON.stringify({ error: 'Path is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (segments.length > 2) {
    return new NextResponse(JSON.stringify({ error: 'Path too deep' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  for (const seg of segments) {
    if (!SEGMENT_REGEX.test(seg) || seg === '..') {
      return new NextResponse(JSON.stringify({ error: 'Invalid path segment' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const resolved = path.resolve(path.join(MAPS_DIR, ...segments));
  const base = path.resolve(MAPS_DIR);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!existsSync(resolved)) {
    return new NextResponse(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fileStat = await stat(resolved);
  if (!fileStat.isFile()) {
    return new NextResponse(JSON.stringify({ error: 'Not a file' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filename = segments[segments.length - 1];
  const contentType = contentTypeFor(filename);

  const range = request.headers?.get('range');
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileStat.size - 1;
    const stream = createReadStream(resolved, { start, end });
    return new NextResponse(stream as unknown as BodyInit, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
        'Content-Type': contentType,
      },
    });
  }

  const stream = createReadStream(resolved);
  return new NextResponse(stream as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': fileStat.size.toString(),
      'Accept-Ranges': 'bytes',
    },
  });
}
