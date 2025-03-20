import React, { useState, useEffect } from 'react';
import { Button, Icon, Modal } from '../ui';
import sharingService from '../../services/sharingService';
import { useTheme } from '../../context/ThemeContext';

/**
 * SharedDashboardsManager - Component to list and manage shared dashboards
 */
const SharedDashboardsManager = ({ isOpen, onClose }) => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { darkMode } = useTheme();

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Load shared dashboards
  useEffect(() => {
    const loadDashboards = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await sharingService.listSharedDashboards();
        
        // Transform the data for display
        const processedData = (data || []).map(dash => ({
          id: dash.share_id,
          createdAt: dash.created_at,
          expiresAt: dash.expires_at,
          accessCount: dash.access_count || 0,
          url: `${window.location.origin}${window.location.pathname}#/shared/${dash.share_id}`,
          clientName: dash.config?.metadata?.clientName || dash.config?.precomputedData?.clientName || 'Client Dashboard'
        }));
        
        setDashboards(processedData);
      } catch (err) {
        console.error("Error loading shared dashboards:", err);
        setError("Failed to load shared dashboards. Please try again later.");
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
      await sharingService.deleteSharedDashboard(id);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
    } catch (err) {
      console.error("Error deleting dashboard:", err);
      alert("Failed to delete dashboard");
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      alert("Failed to copy link to clipboard");
    }
  };

  // Open link in new tab
  const openLink = (url) => {
    window.open(url, '_blank');
  };

  // Modal content
  const content = (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div></div> {/* Empty div for flex spacing */}
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => setRefreshTrigger(prev => prev + 1)}
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : dashboards.length === 0 ? (
        <div className="text-center py-8 border rounded-lg dark:border-gray-700">
          <p>No shared dashboards found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 border rounded-lg dark:border-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Views</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {dashboards.map((dashboard) => (
                <tr key={dashboard.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {dashboard.clientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(dashboard.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {dashboard.expiresAt ? formatDate(dashboard.expiresAt) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                      onClick={() => copyToClipboard(dashboard.url)}
                      icon={<Icon name="clipboard" />}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(dashboard.id)}
                      icon={<Icon name="trash" />}
                    >
                      Delete
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