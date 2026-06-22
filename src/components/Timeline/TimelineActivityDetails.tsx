import { Button } from '@/src/components/ui/button';
import { Trash2, Pencil, Download, ExternalLink } from 'lucide-react';
import {
  FormPage,
  FormPageContent,
  FormPageFooter
} from '@/src/components/ui/form-page';
import { TimelineActivityDetailsProps } from './types';
import { getActivityDetails, formatTime } from './utils';
import { useLocalization } from '@/src/context/localization';
import { useUnit } from '@/src/hooks/useUnit';

import './timeline-activity-details.css';

const TimelineActivityDetails = ({
  activity,
  settings,
  isOpen,
  onClose,
  onDelete,
  onEdit,
}: TimelineActivityDetailsProps) => {
  
  const { t } = useLocalization();
  const { unitSymbol } = useUnit();

  if (!activity) return null;

  // Special medicine details rendering
  let medicineDetails: { label: string; value: string }[] | null = null;
  if ('doseAmount' in activity && 'medicineId' in activity) {
    let medName = t('Medicine');
    if ('medicine' in activity && activity.medicine && typeof activity.medicine === 'object' && 'name' in activity.medicine) {
      medName = (activity.medicine as { name?: string }).name || medName;
    }
    const dose = activity.doseAmount ? `${activity.doseAmount} ${unitSymbol(activity.unitAbbr)}`.trim() : '';
    const medTime = activity.time ? formatTime(activity.time, settings, true, t) : '';
    let notes = activity.notes ? activity.notes : '';
    if (notes.length > 50) notes = notes.substring(0, 50) + '...';
    medicineDetails = [
      { label: t('Medicine'), value: medName },
      { label: t('Amount'), value: dose },
      { label: t('Time'), value: medTime },
      ...(notes ? [{ label: t('Notes'), value: notes }] : []),
      ...(activity.caretakerName ? [{ label: t('Caretaker'), value: activity.caretakerName }] : [])
    ];
  }
  const activityDetails = getActivityDetails(activity, settings, t);

  // Note-specific extras (links + attachments) shown read-only below the details
  const isNote = 'content' in activity;
  const noteLinks: string[] = isNote ? ((activity as any).links || []) : [];
  const noteAttachments: { id: string; originalName: string }[] = isNote ? ((activity as any).attachments || []) : [];

  // The file endpoint requires the auth header, so download via fetch -> blob
  const handleDownloadAttachment = async (attachmentId: string, originalName: string) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/note/file/${attachmentId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Failed to download attachment');
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

  const handleEdit = () => {
    if (activity) {
      // Check play activity before sleep since both have duration and type
      if ('activities' in activity && 'type' in activity && ['TUMMY_TIME', 'INDOOR_PLAY', 'OUTDOOR_PLAY', 'WALK', 'CUSTOM'].includes((activity as any).type)) {
        onEdit(activity, 'play');
      }
      // Check for breast milk adjustment before pump
      else if ('reason' in activity && 'amount' in activity && !('type' in activity) && !('leftAmount' in activity)) {
        onEdit(activity, 'breast-milk-adjustment');
      }
      // Check for pump activity first since it can also have duration
      else if ('leftAmount' in activity || 'rightAmount' in activity) {
        onEdit(activity, 'pump');
      }
      else if ('duration' in activity) onEdit(activity, 'sleep');
      else if ('amount' in activity) onEdit(activity, 'feed');
      else if ('condition' in activity) onEdit(activity, 'diaper');
      else if ('doseAmount' in activity && 'medicineId' in activity) onEdit(activity, 'medicine');
      else if ('content' in activity) onEdit(activity, 'note');
      else if ('soapUsed' in activity) onEdit(activity, 'bath');
      else if ('vaccineName' in activity) onEdit(activity, 'vaccine');
      else if ('title' in activity && 'category' in activity) onEdit(activity, 'milestone');
      else if ('value' in activity && 'unit' in activity) onEdit(activity, 'measurement');
    }
  };

  const handleDelete = () => {
    if (activity) {
      // For pump logs, we need to ensure the activity is properly identified
      if ('leftAmount' in activity || 'rightAmount' in activity || 
          (activity.id && activity.id.length > 0 && 'startTime' in activity)) {
        // Just pass the original activity - the key is to ensure we're using the correct endpoint
        // The getActivityEndpoint function in utils.tsx will check for leftAmount or rightAmount properties
        onDelete(activity);
      } else {
        onDelete(activity);
      }
    }
  };

  return (
    <FormPage 
      isOpen={isOpen} 
      onClose={onClose}
      title={activityDetails.title}
    >
      <FormPageContent>
        <div className="space-y-4 p-4">
          {medicineDetails ? (
            medicineDetails.map((detail, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 timeline-details-label">{detail.label}:</span>
                <span className="text-sm text-gray-900 timeline-details-value">{detail.value}</span>
              </div>
            ))
          ) : (
            activityDetails.details.map((detail, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 timeline-details-label">{detail.label}:</span>
                <span className="text-sm text-gray-900 timeline-details-value">{detail.value}</span>
              </div>
            ))
          )}

          {isNote && (noteLinks.length > 0 || noteAttachments.length > 0) && (
            <div className="space-y-3 pt-2">
              {noteLinks.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500 timeline-details-label">{t('Links')}:</span>
                  <ul className="mt-1 space-y-1">
                    {noteLinks.map((url, index) => (
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
              {noteAttachments.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500 timeline-details-label">{t('Attachments')}:</span>
                  <ul className="mt-1 space-y-1">
                    {noteAttachments.map((att) => (
                      <li key={att.id}>
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(att.id, att.originalName)}
                          title={t('Download')}
                          className="text-sm text-teal-600 hover:underline inline-flex items-center gap-1 break-all text-left"
                        >
                          <Download className="h-3.5 w-3.5 flex-shrink-0" />
                          {att.originalName}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </FormPageContent>
      <FormPageFooter>
        <div className="flex justify-between w-full px-4 py-2">
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('Delete')}
            </Button>
            <Button
              variant="outline"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {t('Edit')}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
          >
            {t('Close')}
          </Button>
        </div>
      </FormPageFooter>
    </FormPage>
  );
};

export default TimelineActivityDetails;
