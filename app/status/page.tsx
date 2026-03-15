'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Job {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  output: string[];
  files?: string[];
}

function StatusInner() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('job');
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/status?job=${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // poll every 5s

    return () => clearInterval(interval);
  }, [jobId]);

  if (!jobId) return <div>Invalid job</div>;

  if (loading) return <div>Loading...</div>;

  if (!job) return <div>Job not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Render Status</h1>
        <p><strong>Job ID:</strong> {jobId}</p>
        <p><strong>Status:</strong> {job.status}</p>
        <p><strong>Progress:</strong> {job.progress}%</p>
        {job.status === 'completed' && job.files && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold">Downloads</h2>
            <ul>
              {job.files.map(file => (
                <li key={file}>
                  <a href={`/api/download?job=${jobId}&file=${file}`} className="text-blue-500 underline">
                    {file}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Output</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-96">
            {job.output.join('')}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function Status() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StatusInner />
    </Suspense>
  );
}