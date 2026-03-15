#!/usr/bin/env python3
"""
Blender Cloud Render Web API

Features
- Downloads Blender automatically if not present
- Handles file uploads via web API
- GPU-enabled rendering with OPTIX
- Supports single frame, frame range, and video rendering
- Real-time job status and logs
- File download for completed renders

Designed for cloud machines / VPS.
"""

import os
import subprocess
import tarfile
import urllib.request
import threading
import time
from flask import Flask, request, jsonify, send_file

BLENDER_URL = "https://download.blender.org/release/Blender5.0/blender-5.0.1-linux-x64.tar.xz"
BLENDER_ARCHIVE = "blender.tar.xz"
BLENDER_DIR = "blender-5.0.1-linux-x64"
BLENDER_BIN = os.path.join(BLENDER_DIR, "blender")

GPU_SCRIPT = """
import bpy
bpy.context.scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.get_devices()
prefs.compute_device_type = 'OPTIX'
for d in prefs.devices:
    if d.type == 'OPTIX':
        d.use = True
bpy.context.scene.cycles.device = 'GPU'
bpy.context.scene.cycles.samples = 128
bpy.context.scene.cycles.use_adaptive_sampling = True
bpy.context.scene.cycles.use_denoising = True
"""

def download_blender():
    if os.path.exists(BLENDER_BIN):
        return

    print("Downloading Blender...")
    urllib.request.urlretrieve(BLENDER_URL, BLENDER_ARCHIVE)

    print("Extracting Blender...")
    with tarfile.open(BLENDER_ARCHIVE) as tar:
        tar.extractall()

    print("Blender ready.")

download_blender()

app = Flask(__name__)

jobs = {}

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    render_type = request.form.get('renderType')

    if not render_type:
        return jsonify({'error': 'No render type specified'}), 400

    # Create directories
    uploads_dir = 'uploads'
    outputs_dir = 'outputs'
    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(outputs_dir, exist_ok=True)

    # Generate job ID
    job_id = str(int(time.time() * 1000))

    # Save uploaded file
    file_path = os.path.join(uploads_dir, f'{job_id}.blend')
    file.save(file_path)

    # Initialize job
    jobs[job_id] = {
        'status': 'processing',
        'progress': 0,
        'output': [],
        'files': []
    }

    # Start render in background thread
    threading.Thread(
        target=run_render,
        args=(file_path, render_type, request.form, job_id)
    ).start()

    return jsonify({'jobId': job_id})

def run_render(file_path, render_type, form, job_id):
    output_folder = f'outputs/{job_id}'
    os.makedirs(output_folder, exist_ok=True)

    # Create GPU enable script
    script_file = f'{output_folder}/enable_gpu.py'
    with open(script_file, 'w') as f:
        f.write(GPU_SCRIPT)

    # Build Blender command
    cmd = [BLENDER_BIN, '-b', file_path, '--python', script_file]

    if render_type == 'single':
        frame = form.get('frame')
        cmd += ['-o', os.path.join(output_folder, 'frame_#####'), '-f', frame]
    else:
        start_frame = form.get('startFrame')
        end_frame = form.get('endFrame')
        if render_type == 'range':
            cmd += [
                '-o', os.path.join(output_folder, 'frame_#####'),
                '-s', start_frame, '-e', end_frame, '-a'
            ]
        elif render_type == 'video':
            cmd += [
                '-o', os.path.join(output_folder, 'video'),
                '-s', start_frame, '-e', end_frame, '-a',
                '-F', 'FFMPEG', '-f', 'MPEG4'
            ]

    # Run Blender process
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env=dict(os.environ, LD_LIBRARY_PATH='/usr/local/cuda/lib64:/usr/lib/nvidia:/usr/lib/x86_64-linux-gnu:' + os.environ.get('LD_LIBRARY_PATH', ''))
    )

    # Stream output
    for line in process.stdout:
        jobs[job_id]['output'].append(line.strip())

    process.wait()

    # Update job status
    if process.returncode == 0:
        jobs[job_id]['status'] = 'completed'
        jobs[job_id]['progress'] = 100
        # List output files
        files = [f for f in os.listdir(output_folder) if f.endswith(('.png', '.mp4'))]
        jobs[job_id]['files'] = files
    else:
        jobs[job_id]['status'] = 'failed'

@app.route('/api/status')
def status():
    job_id = request.args.get('job')
    if not job_id or job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404

    return jsonify(jobs[job_id])

@app.route('/api/download')
def download():
    job_id = request.args.get('job')
    file_name = request.args.get('file')

    if not job_id or not file_name:
        return jsonify({'error': 'Invalid parameters'}), 400

    file_path = f'outputs/{job_id}/{file_name}'
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    return send_file(file_path, as_attachment=True, download_name=file_name)

if __name__ == '__main__':
    print("Starting Blender Render API server...")
    app.run(host='0.0.0.0', port=5000, debug=True)