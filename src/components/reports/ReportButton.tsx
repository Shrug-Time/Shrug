import { useState } from 'react';
import { ReportableContentType } from '@/services/standardized/ReportService';
import { ReportContentDialog } from './ReportContentDialog';
import { useAuth } from '@/contexts/AuthContext';

interface ReportButtonProps {
  contentId: string;
  contentType: ReportableContentType;
  className?: string;
  iconOnly?: boolean;
  parentId?: string;
}

export function ReportButton({
  contentId,
  contentType,
  className = '',
  iconOnly = false,
  parentId
}: ReportButtonProps) {
  const { user } = useAuth();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reported, setReported] = useState(false);
  
  if (!user) {
    return null; // Don't show report button for non-logged in users
  }
  
  const handleReportClick = () => {
    setShowReportDialog(true);
  };
  
  const handleClose = () => {
    setShowReportDialog(false);
  };
  
  const handleSuccess = () => {
    setShowReportDialog(false);
    setReported(true);
    // Could show a toast notification here
  };
  
  if (reported) {
    return (
      <span className={`text-sm text-gray-500 ${className}`}>
        {iconOnly ? (
          <span title="Reported">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
        ) : (
          <span>Reported</span>
        )}
      </span>
    );
  }
  
  return (
    <>
      <button 
        onClick={handleReportClick}
        className={`text-sm text-gray-500 hover:text-red-600 ${className}`}
        title="Report this content"
      >
        {iconOnly ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
            </svg>
            Report
          </span>
        )}
      </button>
      
      {showReportDialog && (
        <ReportContentDialog
          contentId={contentId}
          contentType={contentType}
          parentId={parentId}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
} 