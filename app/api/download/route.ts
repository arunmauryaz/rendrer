import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('job');
  const file = searchParams.get('file');

  if (!jobId || !file) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'outputs', jobId, file);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const contentType = file.endsWith('.png') ? 'image/png' : file.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream';

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${file}"`,
    },
  });
}