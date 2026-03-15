# Blender Render Service

A cloud-based rendering service for Blender projects, allowing users to upload packed .blend files and render images or videos with GPU acceleration.

## Features

- Upload Blender packed project files (.blend)
- Render single frames, frame ranges (images), or videos
- Monitor rendering progress in real-time
- Download rendered outputs
- GPU acceleration using OPTIX

## Backend Options

This project provides two backend implementations:

1. **Node.js Backend** (Next.js API routes)
2. **Python Backend** (Flask API server)

## Setup on Cloud VPS

### Prerequisites

- Linux VPS with NVIDIA GPU (e.g., AWS P3, Google Cloud with GPU)
- Ubuntu 20.04 or later
- Python 3.8+ (for Python backend) or Node.js 18+ (for Node.js backend)
- NVIDIA drivers and CUDA toolkit

### Install System Dependencies

1. Update system:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Install NVIDIA drivers and CUDA:
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

### Python Backend Setup

1. Install Python and pip:
   ```bash
   sudo apt install -y python3 python3-pip
   ```

2. Install Python dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```

3. Run the Python backend:
   ```bash
   python3 server.py
   ```

The Python backend will automatically download and extract Blender 5.0.1 if not present.

### Node.js Backend Setup (Alternative)

1. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run the Node.js backend:
   ```bash
   npm start
   ```

## Frontend

The frontend is built with Next.js and works with both backend options. To run the frontend:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the web interface.

## API Endpoints

Both backends provide the same API:

- `POST /api/upload`: Upload .blend file and start render
- `GET /api/status?job=<id>`: Get job status and logs
- `GET /api/download?job=<id>&file=<name>`: Download output file

## Usage

1. Start the backend (Python or Node.js)
2. Start the frontend
3. Upload a .blend file
4. Select render type and parameters
5. Monitor progress and download results

## Technologies

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Python Backend**: Flask, Blender Python API
- **Node.js Backend**: Next.js API routes
- **Rendering**: Blender 5.0 with OPTIX GPU acceleration
