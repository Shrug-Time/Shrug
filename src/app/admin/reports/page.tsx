"use client";

import { Sidebar } from '@/components/layout/Sidebar';
import { useUser } from '@/hooks/useUser';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Mock report data based on the screenshot
const mockReports = [
  {
    id: '1',
    type: 'Answer',
    reason: 'other',
    details: "It's gotta go",
    reported: '4/21/2025',
    status: 'action taken'
  },
  {
    id: '2',
    type: 'Answer',
    reason: 'other',
    details: "It's rude",
    reported: '4/21/2025',
    status: 'action taken'
  },
  {
    id: '3',
    type: 'Answer',
    reason: 'other',
    details: "This is rude.",
    reported: '4/21/2025',
    status: 'dismissed'
  },
  {
    id: '4',
    type: 'Post',
    reason: 'inappropriate',
    details: "Contains offensive language",
    reported: '4/20/2025',
    status: 'pending'
  },
  {
    id: '5',
    type: 'Post',
    reason: 'spam',
    details: "Promotional content",
    reported: '4/19/2025',
    status: 'pending'
  }
];

export default function AdminReportsPage() {
  const { profile, isLoading } = useUser();
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [reports, setReports] = useState(mockReports);
  
  // Filter options
  const filterOptions = ['All', 'Pending', 'Action taken', 'Dismissed'];

  // Redirect non-admin users
  useEffect(() => {
    if (profile && profile.membershipTier !== 'admin') {
      router.push('/');
    }
  }, [profile, router]);
  
  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
    
    if (e.target.value === 'All') {
      setReports(mockReports);
    } else {
      // Convert to lowercase and remove spaces for comparison
      const statusFilter = e.target.value.toLowerCase().replace(' ', ' ');
      setReports(mockReports.filter(report => 
        report.status.toLowerCase().replace(' ', ' ') === statusFilter
      ));
    }
  };
  
  // Handle report action
  const handleReportAction = (reportId: string, action: 'reopen' | 'dismiss' | 'take_action') => {
    setReports(reports.map(report => {
      if (report.id === reportId) {
        let newStatus = report.status;
        
        if (action === 'reopen') {
          newStatus = 'pending';
        } else if (action === 'dismiss') {
          newStatus = 'dismissed';
        } else if (action === 'take_action') {
          newStatus = 'action taken';
        }
        
        return { ...report, status: newStatus };
      }
      return report;
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activePage="reports" />
        <div className="flex-1 p-8 flex justify-center items-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // If not admin, show access denied
  if (profile && profile.membershipTier !== 'admin') {
    return (
      <div className="flex min-h-screen">
        <Sidebar activePage="reports" />
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold text-red-700 mb-2">Access Denied</h2>
              <p className="text-gray-700 mb-4">
                You don't have permission to access this page.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="reports" />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Content Reports</h1>
          
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4">Filters</h2>
              
              <div className="flex items-center gap-4">
                <div className="w-1/3">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    value={filter}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {filterOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => setReports(mockReports)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reported
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map(report => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${
                        report.type === 'Answer' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.reason}
                    </td>
                    <td className="px-6 py-4">
                      {report.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.reported}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${
                        report.status === 'action taken' ? 'bg-red-100 text-red-800' : 
                        report.status === 'dismissed' ? 'bg-green-100 text-green-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {report.status !== 'pending' && (
                        <button
                          onClick={() => handleReportAction(report.id, 'reopen')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Reopen
                        </button>
                      )}
                      
                      <button
                        onClick={() => router.push(`/post/${report.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 