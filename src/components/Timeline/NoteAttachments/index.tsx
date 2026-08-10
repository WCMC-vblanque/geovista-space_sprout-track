'use client';

import { useState, useEffect } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { useLocalization } from '@/src/context/localization';

interface NoteAttachment {
  id: string;
  originalName: string;
  mimeType?: string;
}

interface NoteAttachmentsProps {
  /** A timeline activity; renders nothing unless it is a note with links/attachments. */
  activity: any;
}

/**
 * Read-only view of a note's links and attachments, with inline previews
 * (PDF in an iframe, images shown directly) and download. Shared by the Timeline
 * and Full Log detail panels.
 *
 * The file endpoint requires the auth header, so previewable files are fetched as
 * blobs and shown via object URLs (revoked on unmount).
 */
export default function NoteAttachments({ activity }: NoteAttachmentsProps) {
  const { t } = useLocalization();

  const isNote = !!activity && 'content' in activity;
  const links: string[] = isNote ? (activity.links || []) : [];
  const attachments: NoteAttachment[] = isNote ? (activity.attachments || []) : [];

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const noteId = isNote ? activity.id : null;

  useEffect(() => {
    const previewable = attachments.filter(
      (a) => a.mimeType === 'application/pdf' || (a.mimeType || '').startsWith('image/')
    );
    if (previewable.length === 0) { setPreviews({}); return; }
    let cancelled = false;
    const urls: Record<string, string> = {};
    const token = localStorage.getItem('authToken');
    Promise.all(
      previewable.map(async (a) => {
        try {
          const res = await fetch(`/api/note/file/${a.id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return;
          const blob = await res.blob();
          if (!cancelled) urls[a.id] = URL.createObjectURL(blob);
        } catch {}
      })
    ).then(() => { if (!cancelled) setPreviews(urls); });
    return () => {
      cancelled = true;
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  const handleDownload = async (id: string, name: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/note/file/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to download attachment');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  if (!isNote || (links.length === 0 && attachments.length === 0)) return null;

  return (
    <div className="space-y-3 pt-2">
      {links.length > 0 && (
        <div>
          <span className="text-sm font-medium text-gray-500 timeline-details-label">{t('Links')}:</span>
          <ul className="mt-1 space-y-1">
            {links.map((url, index) => (
              <li key={index}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-teal-600 hover:underline inline-flex items-center gap-1 break-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {attachments.length > 0 && (
        <div>
          <span className="text-sm font-medium text-gray-500 timeline-details-label">{t('Attachments')}:</span>
          <ul className="mt-1 space-y-1">
            {attachments.map((att) => (
              <li key={att.id}>
                <button
                  type="button"
                  onClick={() => handleDownload(att.id, att.originalName)}
                  title={t('Download')}
                  className="text-sm text-teal-600 hover:underline inline-flex items-center gap-1 break-all text-left"
                >
                  <Download className="h-3.5 w-3.5 flex-shrink-0" />
                  {att.originalName}
                </button>
                {previews[att.id] && (
                  att.mimeType === 'application/pdf' ? (
                    <iframe
                      src={previews[att.id]}
                      title={att.originalName}
                      className="mt-2 w-full h-72 rounded border border-slate-200"
                    />
                  ) : (
                    <img
                      src={previews[att.id]}
                      alt={att.originalName}
                      className="mt-2 max-h-72 rounded border border-slate-200"
                    />
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
