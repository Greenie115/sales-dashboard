import supabase from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import { handleSupabaseError } from '../utils/retryUtils';

/**
 * Service for managing dashboard sharing with Supabase
 */
const sharingService = {
  /**
   * Create a new shared dashboard.
   * @param {Object} shareConfig - The complete configuration for this shared dashboard.
   * @param {Date|null} expiryDate - Optional expiry date for the shared dashboard.
   * @returns {Promise<Object>} - Object containing the new share ID and URL.
   */
  async createSharedDashboard(shareConfig, expiryDate = null) {
    try {
      console.log('Creating shared dashboard with config:', JSON.stringify(shareConfig, null, 2));

      // Generate a unique share ID
      const shareId = uuidv4();
      console.log('Generated share ID:', shareId);

      // Calculate expiry date (default to 30 days from now if not provided)
      let expiresAt = null;
      if (expiryDate && expiryDate instanceof Date) {
        expiresAt = expiryDate.toISOString();
      } else {
        // Default to 30 days
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        expiresAt = expiresAt.toISOString();
      }
      console.log('Expiry date set to:', expiresAt);

      // Validate shareConfig
      if (!shareConfig) {
        throw new Error('Share configuration is required');
      }

      // Ensure shareConfig has required properties
      if (!shareConfig.allowedTabs || !Array.isArray(shareConfig.allowedTabs) || shareConfig.allowedTabs.length === 0) {
        console.warn('Share config has no allowed tabs, defaulting to summary');
        shareConfig.allowedTabs = ['summary'];
      }

      if (!shareConfig.activeTab || !shareConfig.allowedTabs.includes(shareConfig.activeTab)) {
        console.warn('Active tab not set or not in allowed tabs, defaulting to first allowed tab');
        shareConfig.activeTab = shareConfig.allowedTabs[0];
      }

      // Prepare the data to be stored
      const shareData = {
        share_id: shareId,
        share_config: shareConfig,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      };

      console.log('Inserting data into storage...');

      try {
        // Insert into the shared_dashboards table
        const { data, error } = await supabase
          .from('shared_dashboards')
          .insert(shareData);

        if (error) {
          console.error('Storage insert error:', error);
          const errorInfo = handleSupabaseError(error, 'save dashboard');
          throw new Error(errorInfo.userMessage);
        }

        console.log('Dashboard saved successfully');
      } catch (storageError) {
        console.error('Error saving to storage:', storageError);
        // For demo purposes, we'll continue even if storage fails
        console.log('Continuing with local storage fallback...');

        // Save to localStorage as a fallback
        try {
          const storedDashboards = JSON.parse(localStorage.getItem('shared_dashboards') || '[]');
          storedDashboards.push(shareData);
          localStorage.setItem('shared_dashboards', JSON.stringify(storedDashboards));
          console.log('Saved dashboard to localStorage as fallback');
        } catch (localStorageError) {
          console.error('Error saving to localStorage:', localStorageError);
          // Continue anyway - we'll still return a URL
        }
      }

      // Build the share URL
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/#/shared/${shareId}`;

      console.log('Share URL created:', shareUrl);

      return {
        id: shareId,
        url: shareUrl
      };
    } catch (error) {
      console.error('Error creating shared dashboard:', error);
      // Add more context to the error
      throw new Error(`Failed to create shared dashboard: ${error.message}`);
    }
  },

  /**
   * Get a shared dashboard by its ID.
   * @param {string} shareId - The UUID of the shared dashboard.
   * @returns {Promise<Object>} - Object containing the dashboard configuration or an error/expired status.
   */
  async getSharedDashboard(shareId) {
    try {
      console.log('Fetching shared dashboard with ID:', shareId);

      if (!shareId) {
        throw new Error('Share ID is required');
      }

      let dashboardData = null;

      try {
        // Get the shared dashboard record from Supabase
        const { data, error } = await supabase
          .from('shared_dashboards')
          .select('*')
          .eq('share_id', shareId)
          .single();

        if (error) {
          console.error('Storage select error:', error);
          const errorInfo = handleSupabaseError(error, 'fetch dashboard');
          throw new Error(errorInfo.userMessage);
        }

        if (data) {
          dashboardData = data;
        }
      } catch (storageError) {
        console.error('Error fetching from storage:', storageError);
        console.log('Trying localStorage fallback...');

        // Try to get from localStorage as fallback
        try {
          const storedDashboards = JSON.parse(localStorage.getItem('shared_dashboards') || '[]');
          dashboardData = storedDashboards.find(d => d.share_id === shareId);

          if (dashboardData) {
            console.log('Found dashboard in localStorage fallback');
          }
        } catch (localStorageError) {
          console.error('Error reading from localStorage:', localStorageError);
        }
      }

      if (!dashboardData) {
        console.error('No data found for share ID:', shareId);
        throw new Error('Shared dashboard not found.');
      }

      console.log('Dashboard data retrieved:', dashboardData);

      // Check if the dashboard has expired
      if (dashboardData.expires_at && new Date(dashboardData.expires_at) < new Date()) {
        console.log(`Shared dashboard ${shareId} has expired.`);
        return { expired: true };
      }

      // Validate share_config
      if (!dashboardData.share_config) {
        console.error('Dashboard has no share_config:', dashboardData);
        throw new Error('Invalid dashboard data: missing configuration');
      }

      // Return the dashboard configuration
      return {
        expired: false,
        shareConfig: dashboardData.share_config,
        createdAt: dashboardData.created_at,
        expiresAt: dashboardData.expires_at
      };
    } catch (error) {
      console.error('Error getting shared dashboard:', error);
      throw new Error(`Failed to retrieve shared dashboard: ${error.message}`);
    }
  },

  /**
   * List all shared dashboards created by the current user.
   * @returns {Promise<Array>} - List of shared dashboard records.
   */
  async listSharedDashboards() {
    try {
      let dashboards = [];

      try {
        // Try to get dashboards from Supabase
        const { data, error } = await supabase
          .from('shared_dashboards')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Storage select error:', error);
          const errorInfo = handleSupabaseError(error, 'fetch dashboard');
          throw new Error(errorInfo.userMessage);
        }

        dashboards = data || [];
      } catch (storageError) {
        console.error('Error fetching from storage:', storageError);
        console.log('Trying localStorage fallback...');

        // Try to get from localStorage as fallback
        try {
          const storedDashboards = JSON.parse(localStorage.getItem('shared_dashboards') || '[]');
          dashboards = storedDashboards;
          console.log('Found dashboards in localStorage fallback:', dashboards.length);
        } catch (localStorageError) {
          console.error('Error reading from localStorage:', localStorageError);
        }
      }

      return dashboards;
    } catch (error) {
      console.error('Error listing shared dashboards:', error);
      return []; // Return empty array instead of throwing to avoid breaking the UI
    }
  },

  /**
   * Delete a shared dashboard.
   * @param {string} shareId - The UUID of the shared dashboard to delete.
   * @returns {Promise<boolean>} - Success status.
   */
  async deleteSharedDashboard(shareId) {
    try {
      let success = false;

      try {
        // Try to delete from Supabase
        const { error } = await supabase
          .from('shared_dashboards')
          .delete()
          .eq('share_id', shareId);

        if (error) {
          console.error('Storage delete error:', error);
          throw error;
        }

        success = true;
      } catch (storageError) {
        console.error('Error deleting from storage:', storageError);
        console.log('Trying localStorage fallback...');

        // Try to delete from localStorage as fallback
        try {
          const storedDashboards = JSON.parse(localStorage.getItem('shared_dashboards') || '[]');
          const filteredDashboards = storedDashboards.filter(d => d.share_id !== shareId);
          localStorage.setItem('shared_dashboards', JSON.stringify(filteredDashboards));
          console.log('Deleted dashboard from localStorage fallback');
          success = true;
        } catch (localStorageError) {
          console.error('Error updating localStorage:', localStorageError);
        }
      }

      return success;
    } catch (error) {
      console.error('Error deleting shared dashboard:', error);
      return false; // Return false instead of throwing to avoid breaking the UI
    }
  }
};

export default sharingService;