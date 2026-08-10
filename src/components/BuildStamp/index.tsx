'use client';

import { useEffect, useState } from 'react';
import './build-stamp.css';

interface BuildInfo {
  branch: string;
  commit: string;
  builtAt?: string;
}

/**
 * Small fixed monospace badge showing branch@commit of the running build.
 * Only rendered on staging deployments (set NEXT_PUBLIC_APP_ENV=staging in the
 * staging .env). Data comes from public/build-info.json (generated at build time).
 */
export default function BuildStamp() {
  const isStaging = process.env.NEXT_PUBLIC_APP_ENV === 'staging';
  const [info, setInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    if (!isStaging) return;
    fetch('/build-info.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => {});
  }, [isStaging]);

  if (!isStaging || !info) return null;

  return (
    <div className="build-stamp fixed bottom-1 right-1 z-[9999] pointer-events-none select-none rounded bg-black/60 px-1.5 py-0.5 text-[10px] leading-none text-amber-300">
      staging · {info.branch}@{info.commit}
    </div>
  );
}
