import supabase from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing dashboard sharing with Supabase
 * With SSL error handling and fallbacks
 */
const sharingService = {
  /**
   * Create a new shared dashboard
   * @param {Object} config - The dashboard configuration to share
   * @returns {Promise<Object>} - The created share with ID and URL
   */
  async createSharedDashboard(config) {
    return supabase.safeQuery(
      // The main Supabase operation
      async (client) => {
        console.log("Starting share dashboard creation");
        
        // Step 1: Optimize config data before sending to Supabase
        const optimizedConfig = this.optimizeConfigForDatabase(config);
        
        console.log("Sending optimized config to Supabase");
        
        // Step 2: Use a simpler insert with fewer fields to improve performance
        // Only include fields that exist in your database schema
        const { data, error } = await client
          .from('shared_dashboards')
          .insert({
            share_id: uuidv4(),
            config: optimizedConfig,
            created_at: new Date().toISOString(),
            expires_at: config.expiryDate ? new Date(config.expiryDate).toISOString() : null
          })
          .select('share_id, created_at');
        
        if (error) {
          console.error('Error creating shared dashboard:', error);
          
          // Step 3: If the error is a timeout or any other issue, switch to fallback
          if (error.code === '57014' || error.message.includes('timeout')) {
            console.log("Database timeout detected, switching to fallback mode");
            throw new Error("TIMEOUT_SWITCH_TO_FALLBACK");
          }
          
          throw error;
        }
        
        console.log("Successfully created shared dashboard in Supabase");
        return data[0];
      },
      
      // The fallback function if Supabase fails
      async () => {
        // Just throw a special error to signal that we need to use the base64 fallback
        // The SharingContext will handle this by using the Base64 encoding fallback
        throw new Error("TIMEOUT_SWITCH_TO_FALLBACK");
      }
    );
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
    return supabase.safeQuery(
      // The main Supabase operation
      async (client) => {
        // Get the dashboard configuration
        const { data, error } = await client
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
        
        // Increment access count if that column exists in your schema
        try {
          await client
            .from('shared_dashboards')
            .update({ access_count: (data.access_count || 0) + 1 })
            .eq('share_id', shareId);
        } catch (err) {
          // Ignore errors with updating access count
          console.warn("Could not update access count:", err.message);
        }
        
        return {
          expired: false,
          config: data.config
        };
      },
      
      // The fallback function if Supabase fails
      async () => {
        // For non-Supabase share IDs, try to decode the Base64 content
        try {
          // This is a placeholder for the fallback system in SharingContext
          // The actual implementation is in SharedDashboardView component
          throw new Error("Use SharedDashboardView fallback");
        } catch (err) {
          console.error("Error in sharingService fallback:", err);
          throw err;
        }
      }
    );
  },
  
  /**
   * List all shared dashboards created by the user
   * @returns {Promise<Array>} - List of shared dashboards
   */
  async listSharedDashboards() {
    return supabase.safeQuery(
      async (client) => {
        const { data, error } = await client
          .from('shared_dashboards')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data || [];
      },
      
      // Fallback returns empty array if Supabase is unavailable
      async () => {
        return { data: [], error: null };
      }
    );
  },
  
  /**
   * Delete a shared dashboard
   * @param {string} shareId - The unique share ID to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteSharedDashboard(shareId) {
    return supabase.safeQuery(
      async (client) => {
        const { error } = await client
          .from('shared_dashboards')
          .delete()
          .eq('share_id', shareId);
        
        if (error) throw error;
        
        return true;
      },
      
      // Fallback returns false if Supabase is unavailable
      async () => {
        return { data: false, error: new Error("Cannot delete - Supabase unavailable") };
      }
    );
  }
};

export default sharingService;