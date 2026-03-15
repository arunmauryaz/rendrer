import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '../../../lib/jobs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('job');

  if (!jobId || !jobs.has(jobId)) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(jobs.get(jobId));
}