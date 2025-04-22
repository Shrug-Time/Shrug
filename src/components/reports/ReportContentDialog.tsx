import { useState } from 'react';
import { ReportService, ReportReason, ReportableContentType } from '@/services/standardized/ReportService';
import { useAuth } from '@/contexts/AuthContext';

interface ReportContentDialogProps {
  contentId: string;
  contentType: ReportableContentType;
  parentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReportContentDialog({
  contentId,
  contentType,
  parentId,
  onClose,
  onSuccess
}: ReportContentDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason>('other');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const reasonOptions: { value: ReportReason; label: string }[] = [
    { value: 'harassment_bullying', label: 'Harassment or bullying' },
    { value: 'threatening_content', label: 'Threatening content' },
    { value: 'hate_speech', label: 'Hate speech or discrimination' },
    { value: 'explicit_content', label: 'Explicit or inappropriate content' },
    { value: 'spam_scam', label: 'Spam or scam' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'other', label: 'Other' }
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      setError('You must be logged in to report content');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await ReportService.createReport(
        contentType,
        contentId,
        user.uid,
        reason,
        description,
        parentId
      );
      
      onSuccess();
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Report Content</h2>
        
        <p className="text-gray-600 mb-4">
          Thank you for helping keep our community safe. Please select a reason for your report.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Reason for report
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full p-2 border rounded-lg"
              required
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Additional details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-lg"
              rows={4}
              placeholder="Please provide any additional context that might help us understand the issue..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 