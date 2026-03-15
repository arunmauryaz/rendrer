# Blender Render Service

A cloud-based rendering service for Blender projects, allowing users to upload packed .blend files and render images or videos with GPU acceleration.

## Features

- Upload Blender packed project files (.blend)
- Render single frames, frame ranges (images), or videos
- Monitor rendering progress in real-time
- Download rendered outputs
- GPU acceleration using CUDA

## Setup on Cloud VPS

### Prerequisites

- Linux VPS with NVIDIA GPU (e.g., AWS P3, Google Cloud with GPU)
- Ubuntu 20.04 or later
- Node.js 18+
- NVIDIA drivers and CUDA toolkit

### Install Dependencies

1. Update system:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Install NVIDIA drivers and CUDA:
   ```bash
   # Add NVIDIA repository
   sudo apt install -y ubuntu-drivers-common
   sudo ubuntu-drivers autoinstall

   # Install CUDA toolkit
   wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/cuda-ubuntu2004.pin
   sudo mv cuda-ubuntu2004.pin /etc/apt/preferences.d/cuda-repository-pin-600
   wget https://developer.download.nvidia.com/compute/cuda/12.4.0/local_installers/cuda_12.4.0_550.54.14_linux.run
   sudo sh cuda_12.4.0_550.54.14_linux.run --no-opengl-libs --no-man-page --noexec
   sudo apt-key add /var/cuda-repo-ubuntu2004-12-4-local/7fa2af80.pub
   sudo apt update
   sudo apt install -y cuda-toolkit-12-4
   ```

4. Install FFmpeg (for video processing):
   ```bash
   sudo apt install -y ffmpeg
   ```

5. Download and install Blender:
   ```bash
   wget https://download.blender.org/release/Blender5.0/blender-5.0.1-linux-x64.tar.xz
   tar -xf blender-5.0.1-linux-x64.tar.xz
   sudo mv blender-5.0.1-linux-x64 /opt/blender
   ```

6. Verify GPU:
   ```bash
   nvidia-smi
   /opt/blender/blender --version
   ```

### Deploy the Application

1. Clone or upload the project to your VPS.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Start the server:
   ```bash
   npm start
   ```

The app will run on port 3000. Use a reverse proxy like Nginx for production.

## Usage

1. Open the web interface.
2. Upload your packed .blend file.
3. Select render type: single frame, frame range, or video.
4. Enter frame numbers as required.
5. Submit to start rendering.
6. Monitor progress on the status page.
7. Download results when complete.

## API Endpoints

- `POST /api/upload`: Upload file and start render
- `GET /api/status?job=<id>`: Get job status
- `GET /api/download?job=<id>&file=<name>`: Download output file

## Development

Run development server:
```bash
npm run dev
```

## Technologies

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Blender 5.0
- CUDA for GPU rendering
