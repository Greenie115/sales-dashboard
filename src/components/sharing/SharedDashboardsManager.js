import React, { useState, useEffect } from 'react';
import { useSharing } from '../../context/SharingContext';
import { useTheme } from '../../context/ThemeContext';

const SharedDashboardsManager = () => {
  const { darkMode } = useTheme();
  const { 
    sharedDashboards, 
    loadingSharedDashboards, 
    deleteSharedDashboard,
    shareError
  } = useSharing();
  
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calculate if a dashboard is expired
  const isDashboardExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };
  
  // Calculate days remaining until expiry
  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Handle dashboard deletion
  const handleDeleteDashboard = async () => {
    if (!selectedDashboard) return;
    
    try {
      setDeleteInProgress(true);
      
      // Call the delete function from SharingContext
      const success = await deleteSharedDashboard(selectedDashboard.share_id);
      
      if (success) {
        setIsDeleteModalOpen(false);
        setSelectedDashboard(null);
      }
    } catch (error) {
      console.error('Error deleting dashboard:', error);
    } finally {
      setDeleteInProgress(false);
    }
  };
  
  // Open the delete confirmation modal
  const openDeleteModal = (dashboard) => {
    setSelectedDashboard(dashboard);
    setIsDeleteModalOpen(true);
  };
  
  // Close the delete confirmation modal
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedDashboard(null);
  };
  
  // Copy the share URL to clipboard
  const copyShareUrl = (shareId) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/#/shared/${shareId}`;
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        // Show a temporary copy success message
        const row = document.getElementById(`dashboard-${shareId}`);
        if (row) {
          const originalBg = row.style.backgroundColor;
          row.style.backgroundColor = darkMode ? '#064e3b' : '#d1fae5';
          setTimeout(() => {
            row.style.backgroundColor = originalBg;
          }, 1000);
        }
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
      });
  };

  const openDashboardLink = (shareId) => {
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/#/shared/${shareId}`;
  window.open(shareUrl, '_blank');
};
  
  return (
    <div className="mt-6">
      <h2 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Your Shared Dashboards
      </h2>
      
      {/* Error message */}
      {shareError && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md">
          {shareError}
        </div>
      )}
      
      {/* Loading state */}
      {loadingSharedDashboards && (
        <div className="flex justify-center items-center h-32">
          <div className="inline-block w-6 h-6 border-t-2 border-b-2 border-pink-600 rounded-full animate-spin"></div>
          <p className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading shared dashboards...
          </p>
        </div>
      )}
      
      {/* Empty state */}
      {!loadingSharedDashboards && sharedDashboards.length === 0 && (
        <div className={`p-6 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} text-center`}>
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            You haven't shared any dashboards yet. Create a new share to get started.
          </p>
        </div>
      )}
      
      {/* Dashboard list */}
      {!loadingSharedDashboards && sharedDashboards.length > 0 && (
        <div className={`overflow-x-auto rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Client
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Created
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Expiry
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Views
                </th>
                <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? 'bg-gray-900 divide-y divide-gray-800' : 'bg-white divide-y divide-gray-200'}`}>
              {sharedDashboards.map((dashboard) => {
                const isExpired = isDashboardExpired(dashboard.expires_at);
                const daysRemaining = getDaysRemaining(dashboard.expires_at);
                const clientName = dashboard.config?.metadata?.clientName || 'Client';
                
                return (
                  <tr 
                    key={dashboard.share_id} 
                    id={`dashboard-${dashboard.share_id}`}
                    className={`transition-colors duration-150 ${
                      isExpired ? 
                        (darkMode ? 'text-gray-500' : 'text-gray-400') : 
                        (darkMode ? 'text-white' : 'text-gray-900')
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium">{clientName}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ID: {dashboard.share_id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(dashboard.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {dashboard.expires_at ? (
                        <div>
                          <div>{formatDate(dashboard.expires_at)}</div>
                          <div className={`text-xs ${
                            isExpired ? 'text-red-500 dark:text-red-400' :
                            daysRemaining <= 3 ? 'text-amber-500 dark:text-amber-400' :
                            'text-green-500 dark:text-green-400'
                          }`}>
                            {isExpired ? 'Expired' : `${daysRemaining} days remaining`}
                          </div>
                        </div>
                      ) : (
                        <span className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          No expiration
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {dashboard.access_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => copyShareUrl(dashboard.share_id)}
                          className={`p-1 rounded-md ${
                            darkMode ? 
                              'text-blue-400 hover:bg-blue-900/30' : 
                              'text-blue-600 hover:bg-blue-100'
                          }`}
                          title="Copy share link"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        title="View dashboard"
                        <button
                          onClick={() => openDeleteModal(dashboard)}
                          className={`p-1 rounded-md ${
                            darkMode ? 
                              'text-red-400 hover:bg-red-900/30' : 
                              'text-red-600 hover:bg-red-100'
                          }`}
                          title="Delete dashboard"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`w-full max-w-md p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Delete Shared Dashboard
            </h3>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              Are you sure you want to delete the dashboard shared with {selectedDashboard?.config?.metadata?.clientName || 'the client'}? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className={`px-4 py-2 rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={deleteInProgress}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDashboard}
                className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center ${
                  deleteInProgress ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={deleteInProgress}
              >
                {deleteInProgress && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {deleteInProgress ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedDashboardsManager;