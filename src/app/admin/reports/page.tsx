'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ReportService, Report, ReportStatus } from '@/services/standardized/ReportService';

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  
  useEffect(() => {
    loadReports();
  }, [statusFilter]);
  
  const loadReports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedReports = await ReportService.getReports(
        statusFilter === 'all' ? undefined : statusFilter
      );
      setReports(fetchedReports);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateStatus = async (reportId: string, status: ReportStatus, notes?: string, action?: string) => {
    if (!user?.uid) return;
    
    try {
      // Get the report details first
      const report = reports.find(r => r.id === reportId);
      if (!report) {
        console.error('Report not found:', reportId);
        return;
      }
      
      // If action is "Content removed", actually remove the content
      if (status === 'action_taken' && action === 'Content removed') {
        const success = await ReportService.removeReportedContent(
          report.contentType,
          report.contentId,
          report.parentId
        );
        
        if (!success) {
          setError(`Failed to remove ${report.contentType}. Report status updated, but content removal failed.`);
          console.error(`Failed to remove ${report.contentType} with ID ${report.contentId}`);
          // Continue to update report status even if removal fails
        }
      }
      
      // Update the report status
      await ReportService.updateReportStatus(reportId, status, user.uid, notes, action);
      
      // Update the local state
      setReports(currentReports => 
        currentReports.map(r => 
          r.id === reportId 
            ? { 
                ...r, 
                status, 
                reviewedBy: user.uid, 
                reviewedAt: Date.now(),
                reviewNotes: notes || r.reviewNotes,
                actionTaken: action || r.actionTaken
              } 
            : r
        )
      );
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error('Error updating report status:', err);
      setError('Failed to update report status. Please try again.');
    }
  };
  
  // Function to generate the correct URL based on content type
  const getViewUrl = (report: Report) => {
    if (report.contentType === 'post') {
      // For posts, go to the post page
      return `/post/${report.contentId}`;
    } else if (report.contentType === 'answer') {
      if (report.parentId) {
        // If we have the parentId, go to the dedicated answer page
        return `/post/${report.parentId}/answers/${report.contentId}`;
      } else {
        // For older reports without parentId, just show the content ID
        return `/admin/reports?view=answer&id=${report.contentId}`;
      }
    }
    return '/';
  };
  
  // Check query params for highlighted report or answer view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const reportId = urlParams.get('id');
      const viewType = urlParams.get('view');
      
      if (reportId && viewType === 'answer') {
        // This is an older answer report without parentId
        // Show information that will help admin find this answer
        alert(`Answer Details:\n\nID: ${reportId}\n\nTo find this answer:\n1. Go to the database\n2. Look in the posts collection\n3. Find a post containing this answer ID`);
      } else if (reportId) {
        // Find the report in our list and show details
        const report = reports.find(r => r.id === reportId);
        if (report) {
          console.log('Report details:', report);
        }
      }
    }
  }, [reports, reports.length]);
  
  // Check if user is admin - simplified for demo
  if (!user) {
    return (
      <div className="p-8 bg-white rounded-lg shadow">
        <p className="text-center text-lg">Please log in to access admin features.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Content Reports</h1>
      
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Filters</h2>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
                className="w-full p-2 border rounded-lg"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="action_taken">Action Taken</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={loadReports}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-lg text-gray-600">No reports found.</p>
          {statusFilter !== 'all' && (
            <p className="mt-2 text-gray-500">Try changing your filters or check again later.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reported
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {report.contentType === 'post' ? 'Question' : 'Answer'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.reason.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">
                        {report.description || <em className="text-gray-400">No details provided</em>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          report.status === 'action_taken' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'}`}>
                        {report.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'dismissed', 'No action required')}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'action_taken', 'Content removed', 'Content removed')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </>
                        )}
                        {report.status !== 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(report.id, 'pending')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const url = getViewUrl(report);
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 