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

  const stream = createReadStream(filePath);
  const headers = new Headers();
  headers.set('Content-Type', contentTypeFor(filename));
  headers.set('Content-Length', fileStat.size.toString());

  return new NextResponse(stream as unknown as BodyInit, {
    status: 200,
    headers,
  });
}
