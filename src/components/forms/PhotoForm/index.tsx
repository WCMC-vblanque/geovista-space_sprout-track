'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/src/components/ui/button';
import { DateTimePicker } from '@/src/components/ui/date-time-picker';
import {
  FormPage,
  FormPageContent,
  FormPageFooter
} from '@/src/components/ui/form-page';
import { Label } from '@/src/components/ui/label';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { useTimezone } from '@/app/context/timezone';
import { useToast } from '@/src/components/ui/toast';
import { handleExpirationError } from '@/src/lib/expiration-error-handler';
import { useLocalization } from '@/src/context/localization';
import { PhotoLogResponse } from '@/app/api/types';
import { PhotoThumbnail } from '@/src/components/ui/photo-thumbnail';

interface PhotoFormProps {
  isOpen: boolean;
  onClose: () => void;
  babyId: string | undefined;
  initialTime: string;
  activity?: PhotoLogResponse;
  onSuccess?: () => void;
}

export default function PhotoForm({
  isOpen,
  onClose,
  babyId,
  initialTime,
  activity,
  onSuccess,
}: PhotoFormProps) {
  const { t } = useLocalization();
  const { toUTCString } = useTimezone();
  const { showToast } = useToast();
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(() => {
    try {
      const date = new Date(initialTime);
      if (isNaN(date.getTime())) return new Date();
      return date;
    } catch (error) {
      console.error('Error parsing initialTime:', error);
      return new Date();
    }
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingPhotoToday, setExistingPhotoToday] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Reset form state whenever it opens, and check whether today already has a photo
  useEffect(() => {
    if (!isOpen) return;

    setSelectedFile(null);
    setPreviewUrl(null);
    setExistingPhotoToday(false);

    if (activity) {
      // Editing mode - populate the date/time from the existing photo log
      try {
        const activityDate = new Date(activity.time);
        if (!isNaN(activityDate.getTime())) {
          setSelectedDateTime(activityDate);
        }
      } catch (error) {
        console.error('Error parsing activity time:', error);
      }
      return;
    }

    try {
      const initialDate = new Date(initialTime);
      if (!isNaN(initialDate.getTime())) {
        setSelectedDateTime(initialDate);
      }
    } catch (error) {
      console.error('Error parsing initialTime:', error);
    }

    if (!babyId) return;

    const checkExistingPhoto = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`/api/baby-last-activities?babyId=${babyId}`, {
          headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
        });
        if (!response.ok) return;
        const data = await response.json();
        const lastPhoto = data?.data?.lastPhoto;
        if (lastPhoto?.time) {
          const lastPhotoDate = new Date(lastPhoto.time);
          const isToday = lastPhotoDate.toDateString() === new Date().toDateString();
          setExistingPhotoToday(isToday);
        }
      } catch (error) {
        console.error('Error checking for existing photo:', error);
      }
    };

    checkExistingPhoto();
  }, [isOpen, babyId, initialTime, activity]);

  // Clean up the object URL when it changes or the component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDateTimeChange = (date: Date) => {
    setSelectedDateTime(date);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Try to prefill the date/time from the photo's EXIF capture date (falls
    // back silently to whatever was already selected if there's no EXIF data,
    // e.g. screenshots or camera-captured files with metadata stripped).
    import('exifr').then(({ default: exifr }) =>
      exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])
    ).then((tags) => {
      const captured = tags?.DateTimeOriginal || tags?.CreateDate;
      if (captured instanceof Date && !isNaN(captured.getTime())) {
        setSelectedDateTime(captured);
      }
    }).catch((error) => {
      console.error('Error reading photo EXIF data:', error);
    });

    // Allow re-selecting the same file later
    e.target.value = '';
  };

  // Update only the timestamp of an existing photo log (no new file selected while editing)
  const submitTimeOnly = async () => {
    if (!activity) return;

    setLoading(true);

    try {
      const utcTimeString = toUTCString(selectedDateTime) || selectedDateTime.toISOString();
      const authToken = localStorage.getItem('authToken');

      const response = await fetch(`/api/photo-log?id=${activity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify({ time: utcTimeString }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const { isExpirationError, errorData } = await handleExpirationError(
            response,
            showToast,
            'tracking photos'
          );
          if (isExpirationError) return;
          if (errorData) {
            showToast({ variant: 'error', title: 'Error', message: errorData.error || 'Failed to update photo', duration: 5000 });
            return;
          }
        }
        const errorData = await response.json();
        showToast({ variant: 'error', title: 'Error', message: errorData.error || 'Failed to update photo', duration: 5000 });
        return;
      }

      const data = await response.json();
      if (data.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        showToast({ variant: 'error', title: 'Error', message: data.error || 'Failed to update photo', duration: 5000 });
      }
    } catch (error) {
      console.error('Error updating photo time:', error);
      showToast({ variant: 'error', title: 'Error', message: 'An unexpected error occurred. Please try again.', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const submitPhoto = async (replace: boolean) => {
    if (!babyId || !selectedFile) return;

    setLoading(true);

    try {
      const utcTimeString = toUTCString(selectedDateTime) || selectedDateTime.toISOString();

      const formData = new FormData();
      formData.append('babyId', babyId);
      formData.append('time', utcTimeString);
      formData.append('file', selectedFile);
      formData.append('replace', replace ? 'true' : 'false');

      const authToken = localStorage.getItem('authToken');

      const response = await fetch('/api/photo-log', {
        method: 'POST',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 403) {
          const { isExpirationError, errorData } = await handleExpirationError(
            response,
            showToast,
            'tracking photos'
          );
          if (isExpirationError) {
            return;
          }
          if (errorData) {
            showToast({
              variant: 'error',
              title: 'Error',
              message: errorData.error || 'Failed to save photo',
              duration: 5000,
            });
            return;
          }
        }

        // The server enforces "one photo per day" too - if we somehow raced past
        // the client-side check, ask for confirmation and retry with replace=true.
        if (response.status === 409 && !replace) {
          const confirmed = window.confirm(t("Replace today's photo? This will delete the existing photo."));
          if (confirmed) {
            setLoading(false);
            await submitPhoto(true);
            return;
          }
          setLoading(false);
          return;
        }

        const errorData = await response.json();
        console.error('Error saving photo:', errorData.error);
        showToast({
          variant: 'error',
          title: 'Error',
          message: errorData.error || 'Failed to save photo',
          duration: 5000,
        });
        return;
      }

      const data = await response.json();

      if (data.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        console.error('Error saving photo:', data.error);
        showToast({
          variant: 'error',
          title: 'Error',
          message: data.error || 'Failed to save photo',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      showToast({
        variant: 'error',
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!babyId) {
      console.error('No baby selected');
      return;
    }

    // Editing an existing photo log: if no new file was picked, just update the time
    if (activity && !selectedFile) {
      await submitTimeOnly();
      return;
    }

    if (!selectedFile) {
      showToast({
        variant: 'error',
        title: 'Error',
        message: t('Please select or take a photo first'),
        duration: 5000,
      });
      return;
    }

    // Editing with a newly picked file: replace the stored image (and time) directly
    if (activity) {
      await submitPhoto(true);
      return;
    }

    if (existingPhotoToday) {
      const confirmed = window.confirm(t("Replace today's photo? This will delete the existing photo."));
      if (!confirmed) return;
      await submitPhoto(true);
      return;
    }

    await submitPhoto(false);
  };

  return (
    <FormPage
      isOpen={isOpen}
      onClose={onClose}
      title={t(activity ? 'Edit Photo' : 'New Photo')}
    >
      <FormPageContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Date/Time Input */}
            <div className="space-y-2">
              <Label>{t('Date & Time')}</Label>
              <DateTimePicker
                value={selectedDateTime}
                onChange={handleDateTimeChange}
                disabled={loading}
                placeholder={t('Select photo time...')}
              />
            </div>

            {/* Image capture/pick */}
            <div className="space-y-2">
              <Label>{t('Photo')}</Label>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelected}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelected}
              />

              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt={t('Photo preview')}
                    className="w-full max-h-80 object-contain rounded-lg border border-gray-200"
                  />
                </div>
              ) : activity ? (
                <div className="space-y-2">
                  <PhotoThumbnail
                    src={`/api/photo-log/file/${activity.id}`}
                    alt={t('Photo preview')}
                    className="w-full max-h-80 object-contain rounded-lg border border-gray-200"
                  />
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {t('Take Photo')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {t('Choose from Gallery')}
                </Button>
              </div>

              {existingPhotoToday && (
                <p className="text-sm text-amber-600">
                  {t("A photo already exists for today. Saving will replace it.")}
                </p>
              )}
            </div>
          </div>
        </form>
      </FormPageContent>

      <FormPageFooter>
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || (!selectedFile && !activity)}
          >
            {loading ? t('Saving...') : t('Save')}
          </Button>
        </div>
      </FormPageFooter>
    </FormPage>
  );
}
