import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { useState, useEffect, useRef } from 'react';
import { NoteAttachmentResponse, NoteResponse } from '@/app/api/types';
import { useLocalization } from '@/src/context/localization';
import { ChevronDown, Link2, Paperclip, X, ExternalLink, Download, Plus } from 'lucide-react';

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  babyId: string | undefined;
  initialTime: string;
  activity?: NoteResponse;
  variant?: 'note' | 'default';
}

export default function NoteModal({
  open,
  onClose,
  babyId,
  initialTime,
  activity,
  variant = 'default',
}: NoteModalProps) {
  const { t } = useLocalization();
  const [formData, setFormData] = useState({ time: initialTime, content: '', category: '' });
  const [categories, setCategories] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Links
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<NoteAttachmentResponse[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = categories.filter(category =>
    category.toLowerCase().includes(formData.category.toLowerCase())
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/note?categories=true');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        if (data.success) setCategories(data.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    if (open) fetchCategories();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  useEffect(() => { setSelectedIndex(-1); }, [formData.category]);

  const formatDateForInput = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (open) {
      if (activity) {
        setFormData({ time: formatDateForInput(initialTime), content: activity.content, category: activity.category || '' });
        setLinks(activity.links || []);
        setAttachments(activity.attachments || []);
      } else {
        setFormData(prev => ({ ...prev, time: formatDateForInput(initialTime) }));
        setLinks([]);
        setAttachments([]);
      }
      setSelectedFile(null);
      setLinkInput('');
    }
  }, [open, initialTime, activity]);

  // Links handlers
  const handleAddLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    const normalized = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    if (!links.includes(normalized)) setLinks(prev => [...prev, normalized]);
    setLinkInput('');
  };

  // Attachment handlers
  const handleUploadAttachment = async (noteId: string) => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('noteId', noteId);
      const response = await fetch('/api/note/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: fd,
      });
      if (!response.ok) throw new Error('Failed to upload');
      const data = await response.json();
      if (data.success && data.data) setAttachments(prev => [...prev, data.data]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error uploading attachment:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const authToken = localStorage.getItem('authToken');
      await fetch(`/api/note/file/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, originalName: string) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/note/file/${attachmentId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Failed to download');
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!babyId || !formData.content || !formData.time) return;

    try {
      const payload = {
        babyId,
        time: formData.time,
        content: formData.content,
        category: formData.category || null,
        links,
      };

      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/note${activity ? `?id=${activity.id}` : ''}`, {
        method: activity ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save note');

      const savedNote = await response.json();
      const noteId = savedNote.data?.id;

      if (noteId && selectedFile) {
        await handleUploadAttachment(noteId);
      }

      onClose();
      setFormData({ time: initialTime, content: '', category: '' });
      setLinks([]);
      setAttachments([]);
      setSelectedFile(null);
      setLinkInput('');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="dialog-content !p-4 sm:!p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="dialog-header">
          <DialogTitle className="dialog-title">
            {activity ? 'Edit Note' : 'Add Note'}
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {activity ? 'Update your note about your baby' : 'Record a note about your baby'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">{t('Time')}</label>
                <Input
                  type="datetime-local"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full"
                  required
                  tabIndex={-1}
                />
              </div>
              <div>
                <label className="form-label">{t('Category')}</label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    value={formData.category}
                    onChange={(e) => {
                      setFormData({ ...formData, category: e.target.value });
                      setShowDropdown(true);
                    }}
                    className="w-full"
                    placeholder="Type or select a category"
                    onKeyDown={(e) => {
                      const visible = categories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase()));
                      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, visible.length - 1)); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, -1)); }
                      else if (e.key === 'Enter' && selectedIndex !== -1) { e.preventDefault(); setFormData({ ...formData, category: visible[selectedIndex] }); setShowDropdown(false); }
                      else if (e.key === 'Escape') setShowDropdown(false);
                    }}
                  />
                  {showDropdown && formData.category && categories.length > 0 && (
                    <div ref={dropdownRef} className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-48 overflow-auto">
                      {(filteredCategories.length > 0 ? filteredCategories : categories).map((category, index) => (
                        <div
                          key={category}
                          className={`px-3 py-2 cursor-pointer ${index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                          onClick={() => { setFormData({ ...formData, category }); setShowDropdown(false); }}
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">{t('Note Content')}</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full min-h-[100px] resize-none"
                placeholder="Enter your note here..."
                required
              />
            </div>

            {/* Links */}
            <div>
              <label className="form-label flex items-center gap-1 text-sm">
                <Link2 className="h-3.5 w-3.5" />{t('Links')}
              </label>
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                  placeholder={t("https://example.com")}
                  className="flex-1 text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddLink} disabled={!linkInput.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {links.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {links.map((url) => (
                    <li key={url} className="flex items-center gap-2 text-xs p-1.5 rounded border border-gray-200 bg-gray-50">
                      <ExternalLink className="h-3 w-3 text-blue-500 shrink-0" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-600 hover:underline truncate">{url}</a>
                      <button type="button" onClick={() => setLinks(prev => prev.filter(l => l !== url))} className="text-gray-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Attachments */}
            <div>
              <label className="form-label flex items-center gap-1 text-sm">
                <Paperclip className="h-3.5 w-3.5" />{t('Attachments')}
              </label>
              {attachments.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {attachments.map((att) => (
                    <li key={att.id} className="flex items-center gap-2 text-xs p-1.5 rounded border border-gray-200 bg-gray-50">
                      <Paperclip className="h-3 w-3 text-gray-500 shrink-0" />
                      <span className="flex-1 truncate">{att.originalName}</span>
                      <span className="text-gray-400 shrink-0">{formatFileSize(att.fileSize)}</span>
                      <button type="button" onClick={() => handleDownloadAttachment(att.id, att.originalName)} className="text-gray-400 hover:text-blue-500">
                        <Download className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => handleDeleteAttachment(att.id)} className="text-gray-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
                  onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
                  className="hidden"
                  id="note-modal-file-input"
                  disabled={isUploading}
                />
                <label htmlFor="note-modal-file-input" className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700">
                  <Paperclip className="h-3 w-3" />{t('Choose file')}
                </label>
                {selectedFile && (
                  <>
                    <span className="text-xs text-gray-600 truncate flex-1">{selectedFile.name}</span>
                    <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{t('Max 20MB.')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="hover:bg-slate-50">
              {t('Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isUploading}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700"
            >
              {activity ? 'Update Note' : 'Save Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
