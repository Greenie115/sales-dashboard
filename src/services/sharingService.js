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
  async createSharedDashboard(config) {
    try {
      console.log("Starting share dashboard creation");
      
      // Step 1: Optimize config data before sending to Supabase
      const optimizedConfig = this.optimizeConfigForDatabase(config);
      
      // Step 2: Set a longer timeout for the request (if supported by your Supabase client)
      const timeoutOption = { requestTimeout: 60000 }; // 60 seconds
      
      console.log("Sending optimized config to Supabase");
      
      // Step 3: Use a simpler insert with fewer fields to improve performance
      const { data, error } = await supabase
        .from('shared_dashboards')
        .insert({
          // Only store essential data
          share_id: uuidv4(), // Generate a unique ID
          config: optimizedConfig,
          client_name: config.metadata?.clientName || 'Client',
          created_at: new Date().toISOString(),
          expires_at: config.expiryDate ? new Date(config.expiryDate).toISOString() : null,
          data_size: JSON.stringify(optimizedConfig).length
        })
        .select('share_id, created_at');
      
      if (error) {
        console.error('Error creating shared dashboard:', error);
        
        // Step 4: If the error is a timeout, fall back to the client-side method
        if (error.code === '57014' || error.message.includes('timeout')) {
          console.log("Database timeout detected, switching to fallback mode");
          throw new Error("TIMEOUT_SWITCH_TO_FALLBACK");
        }
        
        throw error;
      }
      
      console.log("Successfully created shared dashboard in Supabase");
      return data[0];
    } catch (error) {
      console.error('Error creating shared dashboard:', error);
      
      // If we specifically triggered a fallback, return a special signal
      if (error.message === "TIMEOUT_SWITCH_TO_FALLBACK") {
        throw new Error("TIMEOUT_SWITCH_TO_FALLBACK");
      }
      
      throw error;
    }
  },

  /**
   * Optimize the configuration data for database storage
   * @param {Object} config - The dashboard configuration to optimize
   * @returns {Object} - The optimized configuration
   */
  optimizeConfigForDatabase(config) {
    console.log("Optimizing config for database storage");
    
    // Create a deep copy to avoid modifying the original
    const optimizedConfig = JSON.parse(JSON.stringify(config));
    
    // 1. Check if we have precomputed data
    if (optimizedConfig.precomputedData) {
      // 2. Keep only essential metadata
      const datasetMetadata = {
        totalCount: optimizedConfig.precomputedData.salesData?.length || 0,
        timeRange: optimizedConfig.precomputedData.metrics?.uniqueDates || [],
        brandNames: optimizedConfig.precomputedData.brandNames || [], 
        clientName: optimizedConfig.precomputedData.clientName || 'Client'
      };
      
      // 3. Keep pre-aggregated data but limit raw data
      // Completely remove raw sales data - it's too large
      delete optimizedConfig.precomputedData.salesData;
      
      // For filtered data, only keep a maximum of 100 records as a sample
      if (optimizedConfig.precomputedData.filteredData && 
          Array.isArray(optimizedConfig.precomputedData.filteredData) && 
          optimizedConfig.precomputedData.filteredData.length > 100) {
        // Take only the first 100 records
        optimizedConfig.precomputedData.filteredData = 
          optimizedConfig.precomputedData.filteredData.slice(0, 100);
        
        // Flag that we've reduced the dataset
        optimizedConfig.precomputedData.dataReduced = true;
      }
      
      // 4. Add the metadata
      optimizedConfig.precomputedData.datasetMetadata = datasetMetadata;
    }
    
    // Return the optimized config
    console.log("Config optimized for database storage");
    return optimizedConfig;
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