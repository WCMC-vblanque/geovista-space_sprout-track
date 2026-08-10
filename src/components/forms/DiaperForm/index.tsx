'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DiaperType, DiaperSize } from '@prisma/client';
import { DiaperLogResponse } from '@/app/api/types';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { DateTimePicker } from '@/src/components/ui/date-time-picker';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Label } from '@/src/components/ui/label';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  FormPage,
  FormPageContent,
  FormPageFooter
} from '@/src/components/ui/form-page';
import { useTimezone } from '@/app/context/timezone';
import { useToast } from '@/src/components/ui/toast';
import { handleExpirationError } from '@/src/lib/expiration-error-handler';
import { useParams } from 'next/navigation';
import { useLocalization } from '@/src/context/localization';
import { PhotoThumbnail } from '@/src/components/ui/photo-thumbnail';

interface DiaperFormProps {
  isOpen: boolean;
  onClose: () => void;
  babyId: string | undefined;
  initialTime: string;
  activity?: DiaperLogResponse;
  onSuccess?: () => void;
}

export default function DiaperForm({
  isOpen,
  onClose,
  babyId,
  initialTime,
  activity,
  onSuccess,
}: DiaperFormProps) {
  const { t } = useLocalization();
  const { toUTCString } = useTimezone();
  const { showToast } = useToast();
  const params = useParams();
  const familySlug = params?.slug as string;

  const [selectedDateTime, setSelectedDateTime] = useState<Date>(() => {
    try {
      // Try to parse the initialTime
      const date = new Date(initialTime);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return new Date(); // Fallback to current date if invalid
      }
      return date;
    } catch (error) {
      console.error('Error parsing initialTime:', error);
      return new Date(); // Fallback to current date
    }
  });
  const [formData, setFormData] = useState({
    time: initialTime,
    type: '' as DiaperType | '',
    condition: '',
    color: '',
    blowout: false,
    creamApplied: false,
    pumpSize: '' as DiaperSize | '',
    poopSize: '' as DiaperSize | '',
  });
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializedTime, setInitializedTime] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Handle date/time change
  const handleDateTimeChange = (date: Date) => {
    setSelectedDateTime(date);

    // Also update the time in formData for compatibility with existing code
    // Format the date as ISO string for storage in formData
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const formattedTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    setFormData(prev => ({ ...prev, time: formattedTime }));
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveExistingPhoto(false);

    // Allow re-selecting the same file later
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveExistingPhoto(true);
  };

  // Clean up the object URL when it changes or the component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (isOpen && !isInitialized) {
      if (activity) {
        // Editing mode - populate with activity data
        try {
          const activityDate = new Date(activity.time);
          // Check if the date is valid
          if (!isNaN(activityDate.getTime())) {
            setSelectedDateTime(activityDate);
          }
        } catch (error) {
          console.error('Error parsing activity time:', error);
        }

        // Format the date for the time property
        const date = new Date(activity.time);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const formattedTime = `${year}-${month}-${day}T${hours}:${minutes}`;

        setFormData({
          time: formattedTime,
          type: activity.type,
          condition: activity.condition || '',
          color: activity.color || '',
          blowout: activity.blowout || false,
          creamApplied: activity.creamApplied || false,
          pumpSize: activity.pumpSize || '',
          poopSize: activity.poopSize || '',
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        setRemoveExistingPhoto(false);

        // Store the initial time used for editing
        setInitializedTime(activity.time);
      } else {
        // New entry mode - initialize from initialTime prop
        try {
          const date = new Date(initialTime);
          if (!isNaN(date.getTime())) {
            setSelectedDateTime(date);

            // Also update the time in formData
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const formattedTime = `${year}-${month}-${day}T${hours}:${minutes}`;

            setFormData(prev => ({ ...prev, time: formattedTime }));
          }
        } catch (error) {
          console.error('Error parsing initialTime:', error);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setRemoveExistingPhoto(false);

        // Store the initial time used for new entry
        setInitializedTime(initialTime);
      }

      // Mark as initialized
      setIsInitialized(true);
    } else if (!isOpen) {
      // Reset initialization flag and stored time when form closes
      setIsInitialized(false);
      setInitializedTime(null);
    }
  }, [isOpen, activity, initialTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!babyId) return;

    // Validate required fields
    if (!formData.type) {
      console.error('Required fields missing: type');
      return;
    }

    // Validate date time
    if (!selectedDateTime || isNaN(selectedDateTime.getTime())) {
      console.error('Required fields missing: valid date time');
      return;
    }

    setLoading(true);

    try {
      // Convert local time to UTC ISO string using the timezone context
      // We use selectedDateTime instead of formData.time for better accuracy
      const utcTimeString = toUTCString(selectedDateTime);

      const payload = new FormData();
      payload.append('babyId', babyId);
      payload.append('time', utcTimeString || '');
      payload.append('type', formData.type);
      if (formData.condition) payload.append('condition', formData.condition);
      if (formData.color) payload.append('color', formData.color);
      payload.append('blowout', formData.blowout ? 'true' : 'false');
      payload.append('creamApplied', formData.creamApplied ? 'true' : 'false');
      if (formData.pumpSize) payload.append('pumpSize', formData.pumpSize);
      if (formData.poopSize) payload.append('poopSize', formData.poopSize);
      if (selectedFile) {
        payload.append('file', selectedFile);
      } else if (removeExistingPhoto) {
        payload.append('removePhoto', 'true');
      }

      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken');

      const response = await fetch(`/api/diaper-log${activity ? `?id=${activity.id}` : ''}`, {
        method: activity ? 'PUT' : 'POST',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: payload,
      });

      if (!response.ok) {
        // Check if this is an account expiration error
        if (response.status === 403) {
          const { isExpirationError } = await handleExpirationError(
            response,
            showToast,
            'tracking diaper changes'
          );
          if (isExpirationError) {
            // Don't close the form, let user see the error
            return;
          }
        }

        // For other errors, throw as before
        throw new Error(t('Failed to save diaper log'));
      }

      onClose();
      onSuccess?.();

      // Reset form data
      setSelectedDateTime(new Date(initialTime));
      setFormData({
        time: initialTime,
        type: '' as DiaperType | '',
        condition: '',
        color: '',
        blowout: false,
        creamApplied: false,
        pumpSize: '' as DiaperSize | '',
        poopSize: '' as DiaperSize | '',
      });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setRemoveExistingPhoto(false);
    } catch (error) {
      console.error('Error saving diaper log:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPage
      isOpen={isOpen}
      onClose={onClose}
      title={activity ? t('Edit Diaper Change') : t('Log Diaper Change')}
      description={activity ? t('Update details about your baby\'s diaper change') : t('Record details about your baby\'s diaper change')}
    >
        <FormPageContent>
          <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Time Selection - Full width on all screens */}
            <div>
              <label className="form-label">{t('Time')}</label>
              <DateTimePicker
                value={selectedDateTime}
                onChange={handleDateTimeChange}
                disabled={loading}
                placeholder={t("Select diaper change time...")}
              />
            </div>

            {/* Type Selection - Full width on all screens */}
            <div>
              <label className="form-label">{t('Type')}</label>
              <Select
                value={formData.type || ''}
                onValueChange={(value: DiaperType) =>
                  setFormData({ ...formData, type: value })
                }
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WET">{t('Wet')}</SelectItem>
                  <SelectItem value="DIRTY">{t('Dirty')}</SelectItem>
                  <SelectItem value="BOTH">{t('Wet and Dirty')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Blowout/Leakage checkbox - visible for all diaper types */}
            {formData.type && (
              <>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={formData.blowout}
                    onCheckedChange={(checked) => setFormData({ ...formData, blowout: checked })}
                    disabled={loading}
                    variant="success"
                  />
                  <span className="form-label text-sm">
                    {t('Blowout/Leakage')}
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={formData.creamApplied}
                    onCheckedChange={(checked) => setFormData({ ...formData, creamApplied: checked })}
                    disabled={loading}
                    variant="success"
                  />
                  <span className="form-label text-sm">
                    {t('Diaper Cream Applied')}
                  </span>
                </label>
              </>
            )}

            {(formData.type === 'WET' || formData.type === 'BOTH') && (
              <div>
                <label className="form-label">{t('Pee Size')}</label>
                <Select
                  value={formData.pumpSize}
                  onValueChange={(value: DiaperSize) =>
                    setFormData({ ...formData, pumpSize: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Select size")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMALL">{t('Small')}</SelectItem>
                    <SelectItem value="MEDIUM">{t('Medium')}</SelectItem>
                    <SelectItem value="LARGE">{t('Large')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type && formData.type !== 'WET' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">{t('Condition')}</label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value: string) =>
                      setFormData({ ...formData, condition: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("Select condition")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">{t('Normal')}</SelectItem>
                      <SelectItem value="LOOSE">{t('Loose')}</SelectItem>
                      <SelectItem value="FIRM">{t('Firm')}</SelectItem>
                      <SelectItem value="OTHER">{t('Other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="form-label">{t('Color')}</label>
                  <Select
                    value={formData.color}
                    onValueChange={(value: string) =>
                      setFormData({ ...formData, color: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("Select color")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YELLOW">{t('Yellow')}</SelectItem>
                      <SelectItem value="BROWN">{t('Brown')}</SelectItem>
                      <SelectItem value="GREEN">{t('Green')}</SelectItem>
                      <SelectItem value="BLACK">{t('Black')}</SelectItem>
                      <SelectItem value="RED">{t('Red')}</SelectItem>
                      <SelectItem value="OTHER">{t('Other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {formData.type && formData.type !== 'WET' && (
              <div>
                <label className="form-label">{t('Poo Size')}</label>
                <Select
                  value={formData.poopSize}
                  onValueChange={(value: DiaperSize) =>
                    setFormData({ ...formData, poopSize: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Select size")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMALL">{t('Small')}</SelectItem>
                    <SelectItem value="MEDIUM">{t('Medium')}</SelectItem>
                    <SelectItem value="LARGE">{t('Large')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Photo capture/pick */}
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
                    className="w-full max-h-60 object-contain rounded-lg border border-gray-200"
                  />
                </div>
              ) : activity?.hasPhoto && !removeExistingPhoto ? (
                <div className="space-y-2">
                  <PhotoThumbnail
                    src={`/api/diaper-log/file/${activity.id}`}
                    alt={t('Photo preview')}
                    className="w-full max-h-60 object-contain rounded-lg border border-gray-200"
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
                {(previewUrl || (activity?.hasPhoto && !removeExistingPhoto)) && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={handleRemovePhoto}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('Remove image')}
                  </Button>
                )}
              </div>
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
            <Button onClick={handleSubmit} disabled={loading}>
              {activity ? t('Update') : t('Save')}
            </Button>
          </div>
        </FormPageFooter>
    </FormPage>
  );
}
