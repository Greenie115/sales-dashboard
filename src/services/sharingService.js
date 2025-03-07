import supabase from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing dashboard sharing with Supabase
 */
const sharingService = {
  /**
   * Create a new shared dashboard
   * @param {Object} config - The dashboard configuration to share
   * @param {Date} expiryDate - Optional expiry date
   * @returns {Promise<Object>} - The created share with ID and URL
   */
  async createSharedDashboard(config, expiryDate = null) {
    try {
      // Generate a unique share ID
      const shareId = uuidv4();
      
      // Create the dashboard record in Supabase
      const { data, error } = await supabase
        .from('shared_dashboards')
        .insert({
          share_id: shareId,
          config: config,
          expires_at: expiryDate,
          metadata: {
            created_at: new Date().toISOString(),
            brand_names: config.brandNames || [],
            client_name: config.clientName || 'Client',
            dataset_size: config.datasetSize || 0,
          },
          access_count: 0
        });
      
      if (error) throw error;
      
      // Build the share URL
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/#/shared/${shareId}`;
      
      return {
        id: shareId,
        url: shareUrl,
        data
      };
    } catch (error) {
      console.error('Error creating shared dashboard:', error);
      throw error;
    }
  },
  
  /**
   * Get a shared dashboard by its share ID
   * @param {string} shareId - The unique share ID
   * @returns {Promise<Object>} - The dashboard configuration
   */
  async getSharedDashboard(shareId) {
    try {
      // Get the dashboard configuration
      const { data, error } = await supabase
        .from('shared_dashboards')
        .select('*')
        .eq('share_id', shareId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('Shared dashboard not found');
      }
      
      // Check if the dashboard has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { expired: true, config: data.config };
      }
      
      // Increment access count
      await supabase
        .from('shared_dashboards')
        .update({ access_count: (data.access_count || 0) + 1 })
        .eq('share_id', shareId);
      
      return {
        expired: false,
        config: data.config,
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Error getting shared dashboard:', error);
      throw error;
    }
  },
  
  /**
   * List all shared dashboards created by the user
   * @returns {Promise<Array>} - List of shared dashboards
   */
  async listSharedDashboards() {
    try {
      const { data, error } = await supabase
        .from('shared_dashboards')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error listing shared dashboards:', error);
      throw error;
    }
  },
  
  /**
   * Delete a shared dashboard
   * @param {string} shareId - The unique share ID to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteSharedDashboard(shareId) {
    try {
      const { error } = await supabase
        .from('shared_dashboards')
        .delete()
        .eq('share_id', shareId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting shared dashboard:', error);
      throw error;
    }
  },
  
  /**
   * Update a shared dashboard configuration
   * @param {string} shareId - The unique share ID to update
   * @param {Object} updates - The properties to update
   * @returns {Promise<Object>} - The updated dashboard
   */
  async updateSharedDashboard(shareId, updates) {
    try {
      const { data, error } = await supabase
        .from('shared_dashboards')
        .update(updates)
        .eq('share_id', shareId)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating shared dashboard:', error);
      throw error;
    }
  }
};

export default sharingService;