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

    // Generate Python script for GPU setup and rendering
    let scriptContent = `
import bpy

print("---- Blender GPU Render Script ----")

# Set render engine to Cycles
bpy.context.scene.render.engine = "CYCLES"

# Detect devices
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.get_devices()

# Use OPTIX
prefs.compute_device_type = "OPTIX"

for device in prefs.devices:
    print("Device found:", device.name, device.type)
    if device.type == "OPTIX":
        device.use = True

# Enable GPU rendering
bpy.context.scene.cycles.device = "GPU"

# Performance settings
bpy.context.scene.cycles.samples = 128
bpy.context.scene.cycles.use_adaptive_sampling = True
bpy.context.scene.cycles.use_denoising = True
`;

    const scriptPath = path.join(outputDir, 'render.py');

    if (renderType === 'single') {
      const frame = formData.get('frame') as string;
      scriptContent += `
# Single frame render
bpy.context.scene.frame_current = ${parseInt(frame)}
bpy.context.scene.render.filepath = "${outputDir}/frame_"
print("GPU enabled. Starting render...")
bpy.ops.render.render(write_still=True)
`;
    } else {
      const startFrame = formData.get('startFrame') as string;
      const endFrame = formData.get('endFrame') as string;
      if (renderType === 'range') {
        scriptContent += `
# Frame range render
bpy.context.scene.frame_start = ${parseInt(startFrame)}
bpy.context.scene.frame_end = ${parseInt(endFrame)}
bpy.context.scene.render.filepath = "${outputDir}/frame_"
print("GPU enabled. Starting animation render...")
bpy.ops.render.render(animation=True)
`;
      } else { // video
        scriptContent += `
# Video render
bpy.context.scene.frame_start = ${parseInt(startFrame)}
bpy.context.scene.frame_end = ${parseInt(endFrame)}
bpy.context.scene.render.filepath = "${outputDir}/video"
bpy.context.scene.render.image_settings.file_format = 'FFMPEG'
bpy.context.scene.render.ffmpeg.format = 'MPEG4'
bpy.context.scene.render.ffmpeg.codec = 'H264'
bpy.context.scene.render.ffmpeg.constant_rate_factor = 'HIGH'
print("GPU enabled. Starting video render...")
bpy.ops.render.render(animation=True)
`;
      }
    }

    scriptContent += `
print("Render finished.")
`;

    fs.writeFileSync(scriptPath, scriptContent);

    const args = ['-b', filePath, '-P', scriptPath];

    const env = {
      ...process.env,
      LD_LIBRARY_PATH: '/usr/local/cuda/lib64:/usr/lib/nvidia:/usr/lib/x86_64-linux-gnu:' + (process.env.LD_LIBRARY_PATH || ''),
      PATH: '/usr/local/cuda/bin:' + (process.env.PATH || '')
    };

    // Check available devices
    const checkProc = spawn(blenderPath, ['--cycles-print-devices'], { env });
    checkProc.stdout.on('data', (data) => {
      const job = jobs.get(jobId);
      if (job) job.output.push('Available devices:\n' + data.toString());
    });
    checkProc.on('close', (checkCode) => {
      if (checkCode !== 0) {
        const job = jobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.output.push('Failed to check GPU devices');
        }
        return;
      }

      // Start rendering
      const proc = spawn(blenderPath, args, { env });
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
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}