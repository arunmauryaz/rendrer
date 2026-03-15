import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { jobs } from '../../../lib/jobs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const renderType = formData.get('renderType') as string;

    if (!file || file.type !== 'application/octet-stream' && !file.name.endsWith('.blend')) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }

    const jobId = uuidv4();
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const outputsDir = path.join(process.cwd(), 'outputs');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir);

    const filePath = path.join(uploadsDir, `${jobId}.blend`);
    const outputDir = path.join(outputsDir, jobId);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    jobs.set(jobId, { status: 'processing', progress: 0, output: [] });

    const blenderPath = '/opt/blender/blender'; // adjust path

    let args: string[];
    if (renderType === 'single') {
      const frame = formData.get('frame') as string;
      args = ['-b', filePath, '-f', frame, '-o', path.join(outputDir, 'frame_####.png'), '--cycles-device', 'CUDA'];
    } else {
      const startFrame = formData.get('startFrame') as string;
      const endFrame = formData.get('endFrame') as string;
      if (renderType === 'range') {
        args = ['-b', filePath, '-s', startFrame, '-e', endFrame, '-a', '-o', path.join(outputDir, 'frame_####.png'), '--cycles-device', 'CUDA'];
      } else { // video
        args = ['-b', filePath, '-s', startFrame, '-e', endFrame, '-a', '-F', 'FFMPEG', '-f', 'MPEG4', '-o', path.join(outputDir, 'video.mp4'), '--cycles-device', 'CUDA'];
      }
    }

    const proc = spawn(blenderPath, args);
    proc.stdout.on('data', (data) => {
      const job = jobs.get(jobId);
      if (job) job.output.push(data.toString());
    });
    proc.stderr.on('data', (data) => {
      const job = jobs.get(jobId);
      if (job) job.output.push(data.toString());
    });
    proc.on('close', (code) => {
      const job = jobs.get(jobId);
      if (job) {
        if (code === 0) {
          job.status = 'completed';
          job.progress = 100;
          const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png') || f.endsWith('.mp4'));
          job.files = files;
        } else {
          job.status = 'failed';
        }
      }
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}