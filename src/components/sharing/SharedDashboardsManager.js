import React, { useState, useEffect } from 'react';
import { Button, Icon, Modal } from '../ui';
import sharingService from '../../services/sharingService';
import { useTheme } from '../../context/ThemeContext';

/**
 * SharedDashboardsManager - Component to list and manage shared dashboards
 * Improved with better error handling
 */
const SharedDashboardsManager = ({ isOpen, onClose }) => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const { darkMode } = useTheme();

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Load shared dashboards
  useEffect(() => {
    const loadDashboards = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Check if we've already detected SSL issues
        const hasSSLIssues = sharingService.hasSSLErrors?.() || false;
        if (hasSSLIssues) {
          console.warn("SSL issues detected, shared dashboards may not be available");
          setError("Cannot connect to the sharing service due to SSL certificate issues. Recent shares may not be available.");
          setDashboards([]);
          setLoading(false);
          return;
        }
        
        const data = await sharingService.listSharedDashboards();
        
        // Check if we got a valid array back
        if (!Array.isArray(data)) {
          console.warn("Invalid data returned from listSharedDashboards:", data);
          setError("Received invalid data from sharing service");
          setDashboards([]);
          setLoading(false);
          return;
        }
        
        // Transform the data for display
        const processedData = data.map(dash => ({
          id: dash.share_id || dash.id,
          createdAt: dash.created_at,
          expiresAt: dash.expires_at,
          accessCount: dash.access_count || 0,
          url: `${window.location.origin}${window.location.pathname}#/shared/${dash.share_id || dash.id}`,
          clientName: dash.config?.metadata?.clientName || 
                     dash.config?.precomputedData?.clientName || 
                     dash.config?.clientName || 
                     'Client Dashboard'
        }));
        
        setDashboards(processedData);
      } catch (err) {
        console.error("Error loading shared dashboards:", err);
        
        // Check if this is an SSL error
        const isSSLError = err.message && (
          err.message.includes("SSL") || 
          err.message.includes("certificate") ||
          err.message.includes("CERT_") ||
          err.message.includes("ERR_CERT")
        );
        
        if (isSSLError) {
          setError("Cannot connect to the sharing service due to SSL certificate issues. Recent shares may not be available.");
        } else {
          setError("Failed to load shared dashboards. Please try again later.");
        }
        
        setDashboards([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadDashboards();
    }
  }, [isOpen, refreshTrigger]);

  // Handle dashboard deletion
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shared dashboard?")) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeletingId(id);
      
      const success = await sharingService.deleteSharedDashboard(id);
      
      if (success) {
        // Filter out the deleted dashboard locally without refetching
        setDashboards(prev => prev.filter(d => d.id !== id));
      } else {
        // Show a temporary error message on failure
        alert("Failed to delete dashboard - it may have already been deleted.");
      }
    } catch (err) {
      console.error("Error deleting dashboard:", err);
      alert("Failed to delete dashboard");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (url, id) => {
    try {
      setIsCopying(true);
      setCopiedId(id);
      
      await navigator.clipboard.writeText(url);
      
      // Show success indicator for 2 seconds
      setTimeout(() => {
        setCopiedId(null);
        setIsCopying(false);
      }, 2000);
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      alert("Failed to copy link to clipboard");
      setCopiedId(null);
      setIsCopying(false);
    }
  };

  // Open link in new tab
  const openLink = (url) => {
    window.open(url, '_blank');
  };

  // Retry loading with fresh data
  const handleRetry = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Modal content
  const content = (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          {error && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              icon={<Icon name="refresh" />}
            >
              Retry
            </Button>
          )}
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleRetry}
          disabled={loading}
          icon={<Icon name="refresh" />}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center p-6">
          <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-pink-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading shared dashboards...</p>
        </div>
      ) : error ? (
        <div className={`${darkMode ? 'bg-red-900/30 text-red-300 border-red-800/50' : 'bg-red-100 text-red-700 border-red-400'} px-4 py-3 rounded relative border mb-4`}>
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-1">{error}</span>
          <p className="mt-2 text-sm">
            {error.includes('SSL') ? (
              <span>
                This is likely due to an SSL certificate issue. The sharing service requires HTTPS to work correctly.
                You can still create new shared links which will work in fallback mode.
              </span>
            ) : (
              <span>
                Please try refreshing or try again later.
              </span>
            )}
          </p>
        </div>
      ) : dashboards.length === 0 ? (
        <div className={`text-center py-8 border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>No shared dashboards found.</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            When you share dashboards, they will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full bg-white border rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-gray-200'}`}>
            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Client</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Created</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Expires</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Views</th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {dashboards.map((dashboard) => (
                <tr key={dashboard.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboard.clientName}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatDate(dashboard.createdAt)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${dashboard.expiresAt && new Date(dashboard.expiresAt) < new Date() 
                    ? (darkMode ? 'text-red-300' : 'text-red-600') 
                    : (darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                    {dashboard.expiresAt 
                      ? (new Date(dashboard.expiresAt) < new Date() 
                          ? 'Expired: ' + formatDate(dashboard.expiresAt) 
                          : formatDate(dashboard.expiresAt))
                      : 'Never'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {dashboard.accessCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openLink(dashboard.url)}
                      icon={<Icon name="share" />}
                    >
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(dashboard.url, dashboard.id)}
                      icon={<Icon name="clipboard" />}
                      disabled={isCopying && copiedId === dashboard.id}
                    >
                      {isCopying && copiedId === dashboard.id ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(dashboard.id)}
                      icon={<Icon name="trash" />}
                      disabled={isDeleting && deletingId === dashboard.id}
                    >
                      {isDeleting && deletingId === dashboard.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render the modal
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Manage Shared Dashboards"
      size="6xl"
      footer={<Button variant="primary" onClick={onClose}>Close</Button>}
    >
      {content}
    </Modal>
  );
};

export default SharedDashboardsManager;