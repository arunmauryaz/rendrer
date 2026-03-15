'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [renderType, setRenderType] = useState<'single' | 'range' | 'video'>('single');
  const [frame, setFrame] = useState('');
  const [startFrame, setStartFrame] = useState('');
  const [endFrame, setEndFrame] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('renderType', renderType);
    if (renderType === 'single') {
      formData.append('frame', frame);
    } else {
      formData.append('startFrame', startFrame);
      formData.append('endFrame', endFrame);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = `/status?job=${data.jobId}`;
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Upload failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Blender Render Service</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Upload Blender File (.blend)</label>
            <input
              type="file"
              accept=".blend"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Render Type</label>
            <div className="mt-2">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="single"
                  checked={renderType === 'single'}
                  onChange={() => setRenderType('single')}
                  className="mr-2"
                />
                Single Frame
              </label>
              <label className="inline-flex items-center ml-4">
                <input
                  type="radio"
                  value="range"
                  checked={renderType === 'range'}
                  onChange={() => setRenderType('range')}
                  className="mr-2"
                />
                Frame Range (Images)
              </label>
              <label className="inline-flex items-center ml-4">
                <input
                  type="radio"
                  value="video"
                  checked={renderType === 'video'}
                  onChange={() => setRenderType('video')}
                  className="mr-2"
                />
                Video
              </label>
            </div>
          </div>
          {renderType === 'single' && (
            <div className="mb-4">
              <label className="block text-gray-700">Frame Number</label>
              <input
                type="number"
                value={frame}
                onChange={(e) => setFrame(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded mt-1"
                required
              />
            </div>
          )}
          {(renderType === 'range' || renderType === 'video') && (
            <>
              <div className="mb-4">
                <label className="block text-gray-700">Start Frame</label>
                <input
                  type="number"
                  value={startFrame}
                  onChange={(e) => setStartFrame(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">End Frame</label>
                <input
                  type="number"
                  value={endFrame}
                  onChange={(e) => setEndFrame(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                  required
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Uploading...' : 'Start Render'}
          </button>
        </form>
      </div>
    </div>
  );
}
