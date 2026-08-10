'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2, Pause, Play } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useBaby } from '@/app/context/baby';
import { styles } from './reports.styles';
import { PhotoLogResponse } from '@/app/api/types';
import { useLocalization } from '@/src/context/localization';
import { useTimezone } from '@/app/context/timezone';
import { formatDateLong } from '@/src/utils/dateFormat';

// How many frames ahead of the current one to keep pre-loaded, and how many
// behind to keep cached before evicting - bounds memory usage for babies with
// a long history of daily photos instead of loading every photo up front.
const PREFETCH_AHEAD = 2;
const CACHE_WINDOW_BEHIND = 2;

/**
 * PhotoTimelapseTab Component
 *
 * Plays all of a baby's daily photos (since birth) back-to-back as a simple
 * client-side slideshow, with a date/age overlay per frame. Ignores the
 * Reports date range - always shows the full history.
 */
const PhotoTimelapseTab: React.FC = () => {
  const { t } = useLocalization();
  const { dateFormat } = useTimezone();
  const { selectedBaby } = useBaby();

  const [photos, setPhotos] = useState<PhotoLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(1000);

  const imageCache = useRef<Map<string, string>>(new Map());
  const loadingIds = useRef<Set<string>>(new Set());
  const [, forceRerender] = useState(0);

  // Fetch all photos for the selected baby (ignores the Reports date range)
  useEffect(() => {
    if (!selectedBaby) {
      setPhotos([]);
      return;
    }

    const fetchPhotos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`/api/photo-log?babyId=${selectedBaby.id}`, {
          cache: 'no-store',
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const sorted = [...(data.data || [])].sort(
              (a: PhotoLogResponse, b: PhotoLogResponse) => new Date(a.time).getTime() - new Date(b.time).getTime()
            );
            setPhotos(sorted);
          } else {
            setError(data.error || 'Failed to fetch photos');
          }
        } else {
          setError('Failed to fetch photos');
        }
      } catch (err) {
        console.error('Error fetching photos for timelapse:', err);
        setError('Error fetching photos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, [selectedBaby]);

  // Reset playback whenever the photo list itself changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [photos.length]);

  const ensureLoaded = useCallback((index: number) => {
    const photo = photos[index];
    if (!photo || imageCache.current.has(photo.id) || loadingIds.current.has(photo.id)) return;

    loadingIds.current.add(photo.id);
    const authToken = localStorage.getItem('authToken');
    fetch(`/api/photo-log/file/${photo.id}`, {
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load photo');
        return res.blob();
      })
      .then((blob) => {
        imageCache.current.set(photo.id, URL.createObjectURL(blob));
        loadingIds.current.delete(photo.id);
        forceRerender((n) => n + 1);
      })
      .catch((err) => {
        console.error('Error loading timelapse frame:', err);
        loadingIds.current.delete(photo.id);
      });
  }, [photos]);

  // Prefetch the current frame plus a few ahead; evict frames well behind
  // the current index so memory use stays bounded over a long history.
  useEffect(() => {
    if (!photos.length) return;

    for (let i = currentIndex; i <= Math.min(currentIndex + PREFETCH_AHEAD, photos.length - 1); i++) {
      ensureLoaded(i);
    }

    const keepIds = new Set(
      photos
        .slice(Math.max(0, currentIndex - CACHE_WINDOW_BEHIND), currentIndex + PREFETCH_AHEAD + 1)
        .map((p) => p.id)
    );
    imageCache.current.forEach((url, id) => {
      if (!keepIds.has(id)) {
        URL.revokeObjectURL(url);
        imageCache.current.delete(id);
      }
    });
  }, [currentIndex, photos, ensureLoaded]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    if (currentIndex >= photos.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, photos.length - 1));
    }, speedMs);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, photos.length, speedMs]);

  // Release all cached object URLs on unmount
  useEffect(() => {
    return () => {
      imageCache.current.forEach((url) => URL.revokeObjectURL(url));
      imageCache.current.clear();
    };
  }, []);

  const currentPhoto = photos[currentIndex];
  const currentUrl = currentPhoto ? imageCache.current.get(currentPhoto.id) : undefined;

  const ageLabel = useMemo(() => {
    if (!currentPhoto || !selectedBaby?.birthDate) return '';
    const birth = new Date(selectedBaby.birthDate);
    const photoDate = new Date(currentPhoto.time);
    const dayNumber = Math.max(
      1,
      Math.floor((photoDate.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    return `${t('Day')} ${dayNumber}`;
  }, [currentPhoto, selectedBaby, t]);

  const handlePlayPause = () => {
    if (!isPlaying && currentIndex >= photos.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying((p) => !p);
  };

  if (isLoading) {
    return (
      <div className={cn(styles.loadingContainer, "reports-loading-container")}>
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className={cn(styles.loadingText, "reports-loading-text")}>{t('Loading photos...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(styles.errorContainer, "reports-error-container")}>
        <p className={cn(styles.errorText, "reports-error-text")}>{error}</p>
      </div>
    );
  }

  if (!photos.length) {
    return (
      <div className={cn(styles.loadingContainer, "reports-loading-container")}>
        <Camera className="h-8 w-8 text-cyan-600" />
        <p className={cn(styles.loadingText, "reports-loading-text")}>
          {t('No daily photos yet. Add one from the home screen to start your growth timelapse.')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="relative w-full max-w-md aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt={ageLabel} className="w-full h-full object-contain" />
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        )}

        {currentPhoto && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white px-3 py-2">
            <p className="text-sm font-medium">{ageLabel}</p>
            <p className="text-xs opacity-90">{formatDateLong(new Date(currentPhoto.time), dateFormat)}</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-md flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlayPause}
          className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          aria-label={isPlaying ? t('Pause') : t('Play')}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(0, photos.length - 1)}
          value={currentIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentIndex(Number(e.target.value));
          }}
          className="flex-1"
        />

        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 w-14 text-right">
          {currentIndex + 1} / {photos.length}
        </span>
      </div>

      <div className="w-full max-w-md flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('Speed:')}</span>
        <input
          type="range"
          min={200}
          max={2000}
          step={100}
          value={speedMs}
          onChange={(e) => setSpeedMs(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 w-12 text-right">
          {(speedMs / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  );
};

export default PhotoTimelapseTab;
