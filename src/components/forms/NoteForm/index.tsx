'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NoteAttachmentResponse, NoteResponse } from '@/app/api/types';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { DateTimePicker } from '@/src/components/ui/date-time-picker';
import {
  FormPage,
  FormPageContent,
  FormPageFooter
} from '@/src/components/ui/form-page';
import { ChevronDown, Paperclip, Link2, X, Download, ExternalLink, Plus } from 'lucide-react';
import { useTimezone } from '@/app/context/timezone';
import { useTheme } from '@/src/context/theme';
import { useToast } from '@/src/components/ui/toast';
import { handleExpirationError } from '@/src/lib/expiration-error-handler';
import { useLocalization } from '@/src/context/localization';

import './note-form.css';

interface NoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  babyId: string | undefined;
  initialTime: string;
  activity?: NoteResponse;
  onSuccess?: () => void;
}

export default function NoteForm({
  isOpen,
  onClose,
  babyId,
  initialTime,
  activity,
  onSuccess,
}: NoteFormProps) {
  const { t } = useLocalization();
  const { formatDate, toUTCString } = useTimezone();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(() => {
    try {
      const date = new Date(initialTime);
      if (isNaN(date.getTime())) return new Date();
      return date;
    } catch {
      return new Date();
    }
  });
  const [formData, setFormData] = useState({
    time: initialTime,
    content: '',
    category: '',
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializedTime, setInitializedTime] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Links state
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState<NoteAttachmentResponse[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  // Fetch existing categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/note?categories=true');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        if (data.success) {
          setCategories(data.data);
          setFilteredCategories(data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    if (isOpen) fetchCategories();
  }, [isOpen]);

  // Filter categories based on input
  useEffect(() => {
    if (formData.category.trim() === '') {
      setFilteredCategories(categories);
      setDropdownOpen(false);
    } else {
      const filtered = categories.filter(category =>
        category.toLowerCase().includes(formData.category.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [formData.category, categories]);

  const handleDateTimeChange = (date: Date) => {
    setSelectedDateTime(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setFormData(prev => ({ ...prev, time: `${year}-${month}-${day}T${hours}:${minutes}` }));
  };

  useEffect(() => {
    if (isOpen && !isInitialized) {
      if (activity) {
        try {
          const activityDate = new Date(activity.time);
          if (!isNaN(activityDate.getTime())) setSelectedDateTime(activityDate);
        } catch { /* ignore */ }

        const date = new Date(activity.time);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        setFormData({
          time: `${year}-${month}-${day}T${hours}:${minutes}`,
          content: activity.content,
          category: activity.category || '',
        });
        setLinks(activity.links || []);
        setAttachments(activity.attachments || []);
      } else {
        try {
          const date = new Date(initialTime);
          if (!isNaN(date.getTime())) {
            setSelectedDateTime(date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            setFormData(prev => ({ ...prev, time: `${year}-${month}-${day}T${hours}:${minutes}` }));
          }
        } catch { /* ignore */ }
        setInitializedTime(initialTime);
        setLinks([]);
        setAttachments([]);
      }
      setIsInitialized(true);
    } else if (!isOpen) {
      setIsInitialized(false);
      setInitializedTime(null);
      setSelectedFile(null);
      setLinkInput('');
    }
  }, [isOpen, activity, initialTime]);

  // Links handlers
  const handleAddLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    const normalized = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    if (!links.includes(normalized)) {
      setLinks(prev => [...prev, normalized]);
    }
    setLinkInput('');
  };

  const handleLinkInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); }
  };

  const handleRemoveLink = (url: string) => {
    setLinks(prev => prev.filter(l => l !== url));
  };

  // Attachment handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadAttachment = async (noteId: string) => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('noteId', noteId);

      const response = await fetch('/api/note/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData,
      });

      if (!response.ok) throw new Error(t('Failed to upload attachment'));

      const data = await response.json();
      if (data.success && data.data) {
        setAttachments(prev => [...prev, data.data]);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        showToast({ variant: 'success', title: t('Success'), message: t('Attachment uploaded successfully'), duration: 3000 });
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
      showToast({ variant: 'error', title: t('Error'), message: t('Failed to upload attachment'), duration: 5000 });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/note/file/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error(t('Failed to delete attachment'));
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      showToast({ variant: 'success', title: t('Success'), message: t('Attachment deleted'), duration: 3000 });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      showToast({ variant: 'error', title: t('Error'), message: t('Failed to delete attachment'), duration: 5000 });
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, originalName: string) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/note/file/${attachmentId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error(t('Failed to download attachment'));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      showToast({ variant: 'error', title: t('Error'), message: t('Failed to download attachment'), duration: 5000 });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!babyId) return;

    if (!formData.content) {
      console.error('Required fields missing: content');
      return;
    }
    if (!selectedDateTime || isNaN(selectedDateTime.getTime())) {
      console.error('Required fields missing: valid date time');
      return;
    }

    setLoading(true);
    try {
      const utcTimeString = toUTCString(selectedDateTime);
      const payload = {
        babyId,
        time: utcTimeString,
        content: formData.content,
        category: formData.category || null,
        links,
      };

      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/note${activity ? `?id=${activity.id}` : ''}`, {
        method: activity ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const { isExpirationError, errorData } = await handleExpirationError(response, showToast, 'saving notes');
          if (isExpirationError) return;
          if (errorData) {
            showToast({ variant: 'error', title: 'Error', message: errorData.error || 'Failed to save note', duration: 5000 });
            throw new Error(errorData.error || 'Failed to save note');
          }
        }
        const errorData = await response.json();
        showToast({ variant: 'error', title: 'Error', message: errorData.error || 'Failed to save note', duration: 5000 });
        throw new Error(errorData.error || 'Failed to save note');
      }

      const savedNote = await response.json();
      const noteId = savedNote.data?.id;

      // Upload pending file if any
      if (noteId && selectedFile) {
        await handleUploadAttachment(noteId);
      }

      onClose();
      onSuccess?.();

      setSelectedDateTime(new Date(initialTime));
      setFormData({ time: initialTime, content: '', category: '' });
      setLinks([]);
      setAttachments([]);
      setSelectedFile(null);
      setLinkInput('');
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
    setDropdownOpen(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, category: value }));
    setHighlightedIndex(-1);
    if (value.trim() !== '') setDropdownOpen(true);
  };

  const handleCategoryInputFocus = () => {
    if (formData.category.trim() !== '') setDropdownOpen(true);
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { setDropdownOpen(true); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < filteredCategories.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredCategories.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredCategories.length) {
          handleCategorySelect(filteredCategories[highlightedIndex]);
        } else if (formData.category.trim() !== '') {
          handleCategorySelect(formData.category.trim());
        }
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        break;
      case 'Escape':
        e.preventDefault();
        setDropdownOpen(false);
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        break;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <FormPage
      isOpen={isOpen}
      onClose={onClose}
      title={activity ? t('Edit Note') : t('Add Note')}
      description={activity ? t('Update your note about your baby') : t('Record a note about your baby')}
    >
      <FormPageContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Time */}
            <div>
              <label className="form-label">{t('Time')}</label>
              <DateTimePicker
                value={selectedDateTime}
                onChange={handleDateTimeChange}
                disabled={loading}
                placeholder={t("Select note time...")}
              />
            </div>

            {/* Category */}
            <div>
              <label className="form-label">{t('Category')}</label>
              <div className="relative">
                <div className="relative w-full">
                  <div className="flex items-center w-full">
                    <Input
                      ref={inputRef}
                      value={formData.category}
                      onChange={handleCategoryInputChange}
                      onFocus={handleCategoryInputFocus}
                      onKeyDown={handleCategoryKeyDown}
                      className="w-full pr-10 note-form-dropdown-trigger"
                      placeholder={t("Enter or select a category")}
                      disabled={loading}
                    />
                    <ChevronDown
                      className="absolute right-3 h-4 w-4 text-gray-500 note-form-dropdown-icon"
                      onClick={() => {
                        setDropdownOpen(!dropdownOpen);
                        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                      }}
                    />
                  </div>
                  {dropdownOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto category-dropdown-container"
                      style={{ width: inputRef.current?.offsetWidth }}
                    >
                      {filteredCategories.length > 0 ? (
                        <div className="py-1">
                          {filteredCategories.map((category, index) => (
                            <div
                              key={category}
                              className={`px-3 py-2 text-sm cursor-pointer category-dropdown-item ${
                                highlightedIndex === index ? 'bg-gray-100 category-dropdown-item-highlighted' : 'hover:bg-gray-100'
                              }`}
                              onClick={() => handleCategorySelect(category)}
                              onMouseEnter={() => setHighlightedIndex(index)}
                            >
                              {category}
                            </div>
                          ))}
                        </div>
                      ) : (
                        formData.category.trim() !== '' ? (
                          <div className="px-3 py-2 text-sm text-gray-500 category-dropdown-no-match">
                            {t('No matching categories. Press Enter to create "')}{formData.category}".
                          </div>
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 category-dropdown-no-categories">
                            {t('No categories found')}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Note content */}
            <div>
              <label className="form-label">{t('Note')}</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full min-h-[150px]"
                placeholder={t("Enter your note")}
                required
                disabled={loading}
              />
            </div>

            {/* Links */}
            <div>
              <label className="form-label flex items-center gap-1">
                <Link2 className="h-4 w-4" />
                {t('Links')}
              </label>
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={handleLinkInputKeyDown}
                  placeholder={t("https://example.com")}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLink}
                  disabled={loading || !linkInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {links.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {links.map((url) => (
                    <li key={url} className="flex items-center gap-2 text-sm p-2 rounded-md border border-gray-200 bg-gray-50">
                      <ExternalLink className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-blue-600 hover:underline truncate"
                      >
                        {url}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(url)}
                        className="text-gray-400 hover:text-red-500 shrink-0"
                        disabled={loading}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Attachments */}
            <div>
              <label className="form-label flex items-center gap-1">
                <Paperclip className="h-4 w-4" />
                {t('Attachments')}
              </label>

              {/* Existing attachments */}
              {attachments.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {attachments.map((att) => (
                    <li key={att.id} className="flex items-center gap-2 text-sm p-2 rounded-md border border-gray-200 bg-gray-50">
                      <Paperclip className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span className="flex-1 truncate">{att.originalName}</span>
                      <span className="text-gray-400 text-xs shrink-0">{formatFileSize(att.fileSize)}</span>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att.id, att.originalName)}
                        className="text-gray-400 hover:text-blue-500 shrink-0"
                        title={t('Download')}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="text-gray-400 hover:text-red-500 shrink-0"
                        title={t('Delete')}
                        disabled={loading}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* File picker */}
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="note-file-input"
                  disabled={loading || isUploading}
                />
                <label
                  htmlFor="note-file-input"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                >
                  <Paperclip className="h-4 w-4" />
                  {t('Choose file')}
                </label>
                {selectedFile && (
                  <span className="text-sm text-gray-600 truncate flex-1">
                    {selectedFile.name} <span className="text-gray-400">({formatFileSize(selectedFile.size)})</span>
                  </span>
                )}
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{t('Max 20MB. Images, PDF, Word, Excel, CSV, text files.')}</p>
            </div>
          </div>
        </form>
      </FormPageContent>
      <FormPageFooter>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || isUploading}>
            {activity ? t('Update') : t('Save')}
          </Button>
        </div>
      </FormPageFooter>
    </FormPage>
  );
}
