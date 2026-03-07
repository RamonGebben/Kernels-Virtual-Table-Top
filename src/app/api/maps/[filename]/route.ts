import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

const MAPS_DIR = path.join(process.cwd(), 'maps');

const sanitizeFilename = (filename: string) => path.basename(filename);

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
  _request: NextRequest,
  context: { params: Promise<{ filename?: string }> },
) {
  const { filename: rawFilename } = await context.params;
  if (!rawFilename) {
    return new NextResponse(JSON.stringify({ error: 'Filename is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filename = sanitizeFilename(rawFilename);
  const filePath = path.join(MAPS_DIR, filename);

  if (!existsSync(filePath)) {
    return new NextResponse(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    return new NextResponse(JSON.stringify({ error: 'Not a file' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = contentTypeFor(filename);

  const range = _request.headers?.get('range');
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileStat.size - 1;
    const stream = createReadStream(filePath, { start, end });
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

  const stream = createReadStream(filePath);
  return new NextResponse(stream as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': fileStat.size.toString(),
      'Accept-Ranges': 'bytes',
    },
  });
}
