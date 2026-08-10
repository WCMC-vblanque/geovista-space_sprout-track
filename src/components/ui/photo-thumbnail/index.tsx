'use client';

import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface PhotoThumbnailProps {
  /** Authenticated file-serving endpoint to fetch the image from, e.g. `/api/diaper-log/file/{id}` */
  src: string;
  /** Additional CSS classes for the <img>/placeholder element */
  className?: string;
  alt?: string;
}

/**
 * Fetches an encrypted photo via an authenticated request (the API requires a
 * Bearer token, which a plain <img src="..."> cannot send) and renders it as
 * an object URL. Used anywhere an activity log needs a visual thumbnail.
 */
export function PhotoThumbnail({ src, className, alt }: PhotoThumbnailProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    setFailed(false);
    setObjectUrl(null);

    const load = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(src, {
          headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
        });
        if (!response.ok) throw new Error('Failed to load photo');
        const blob = await response.blob();
        if (cancelled) return;
        currentUrl = URL.createObjectURL(blob);
        setObjectUrl(currentUrl);
      } catch (error) {
        console.error('Error loading photo thumbnail:', error);
        if (!cancelled) setFailed(true);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [src]);

  if (failed || !objectUrl) {
    return (
      <div className={cn('flex items-center justify-center bg-cyan-100', className)}>
        <Camera className="h-1/2 w-1/2 text-cyan-600" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={objectUrl} alt={alt || 'Photo'} className={className} />
  );
}
