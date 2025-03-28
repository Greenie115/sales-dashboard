import supabase from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import { compressData, decompressData } from '../utils/compressionUtils'; // Import compression utils

/**
 * Service for managing dashboard sharing with Supabase.
 * Stores compressed configuration (storageId, initialFilters) and metadata.
 */
const sharingService = {
  /**
   * Create a new shared dashboard entry in Supabase.
   * @param {Object} shareDetails - Object containing storageId, initialFilters, metadata, expiryDate.
   * @param {string} shareDetails.storageId - The ID/path of the raw data file in Supabase Storage.
   * @param {Object} [shareDetails.initialFilters] - Optional initial filters for the shared view.
   * @param {Object} [shareDetails.metadata] - Optional metadata (clientName, brandNames, etc.).
   * @param {string|Date} [shareDetails.expiryDate] - Optional expiry date.
   * @returns {Promise<Object>} - The created share record containing at least the share_id.
   */
  async createSharedDashboard({ storageId, initialFilters = {}, metadata = {}, expiryDate = null }) {
    // Use safeQuery to handle potential Supabase connection errors
    return supabase.safeQuery(
      async (client) => {
        console.log("Attempting to save share configuration to Supabase...");
        
        if (!storageId) {
          throw new Error("storageId is required to create a shared dashboard.");
        }

        const shareId = uuidv4(); // Generate UUID here
        
        // Prepare the core configuration to be compressed
        const configToStore = { storageId, initialFilters };
        const compressedConfigData = compressData(configToStore);

        // Prepare the record for insertion
        const recordToInsert = {
          share_id: shareId,
          config_data: compressedConfigData, // Store compressed config string
          metadata: metadata, // Store metadata object (assuming JSONB column)
          created_at: new Date().toISOString(),
          expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
          access_count: 0
          // Add user_id here later when authentication is implemented
        };

        console.log("Inserting record:", { ...recordToInsert, config_data: '...' }); // Don't log large compressed string

        const { data, error } = await client
          .from('shared_dashboards') // Ensure this table name is correct
          .insert(recordToInsert)
          .select('share_id, created_at'); // Select minimal data to confirm success

        if (error) {
          console.error('Supabase error creating shared dashboard:', error);
          throw error; 
        }

        if (!data || data.length === 0) {
           console.error('Supabase insert succeeded but returned no data.');
           throw new Error('Failed to create shared dashboard record.');
        }
        
        console.log("Successfully saved share configuration to Supabase with ID:", data[0].share_id);
        // Return the essential info, primarily the ID
        return data[0]; 
      },
      // Fallback for safeQuery
      async (error) => {
        console.error("Supabase query failed:", error);
        throw error; 
      }
    );
  },

  /**
   * Get a shared dashboard configuration from Supabase by its share ID.
   * @param {string} shareId - The unique share ID (UUID).
   * @returns {Promise<Object>} - An object containing { expired: boolean, storageId: string, initialFilters: Object, metadata: Object }.
   */
  async getSharedDashboard(shareId) {
    // Use safeQuery for potential connection errors
    return supabase.safeQuery(
      async (client) => {
        console.log("Attempting to fetch dashboard from Supabase with ID:", shareId);

        const { data, error } = await client
          .from('shared_dashboards')
          .select('config_data, metadata, expires_at, access_count') // Select needed fields
          .eq('share_id', shareId)
          .single(); // Expect only one record

        if (error) {
          if (error.code === 'PGRST116') { 
             console.error('Shared dashboard not found in Supabase:', shareId);
             throw new Error('Shared dashboard not found');
          }
          console.error("Supabase error retrieving dashboard:", error);
          throw error; 
        }

        if (!data) {
           console.error('Shared dashboard not found (no data returned):', shareId);
           throw new Error('Shared dashboard not found');
        }

        console.log("Successfully retrieved dashboard record from Supabase");

        // Check if the dashboard has expired
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        
        if (isExpired) {
           console.log("Shared dashboard link has expired:", shareId);
           return { expired: true, storageId: null, initialFilters: {}, metadata: data.metadata || {} };
        }

        // Decompress the configuration data
        let decompressedConfig;
        try {
          decompressedConfig = decompressData(data.config_data);
          if (!decompressedConfig || typeof decompressedConfig.storageId !== 'string') {
             throw new Error("Decompressed data is invalid or missing storageId.");
          }
        } catch (decompressionError) {
          console.error("Failed to decompress or validate config_data:", decompressionError);
          throw new Error("Invalid shared data format.");
        }
        
        // Increment access count asynchronously (fire and forget)
        client
          .from('shared_dashboards')
          .update({ access_count: (data.access_count || 0) + 1 })
          .eq('share_id', shareId)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.warn("Could not update access count:", updateError.message);
            }
          });

        return {
          expired: false,
          storageId: decompressedConfig.storageId,
          initialFilters: decompressedConfig.initialFilters || {},
          metadata: data.metadata || {}
        };
      },
      // Fallback for safeQuery
      async (error) => {
        console.error("Supabase query failed:", error);
        throw error; // Re-throw
      }
    );
  },

  /**
   * List all shared dashboards (metadata only).
   * Assumes a 'shared_dashboards' table with 'metadata' JSONB column.
   * @returns {Promise<Array>} - List of shared dashboard metadata.
   */
  async listSharedDashboards() {
    return supabase.safeQuery(
      async (client) => {
        const { data, error } = await client
          .from('shared_dashboards')
          .select(`
            share_id, 
            created_at, 
            expires_at, 
            access_count,
            metadata->>clientName, 
            metadata->>brandNames
          `) // Access metadata fields directly
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Supabase error listing shared dashboards:", error);
          throw error;
        }

        console.log(`Retrieved ${data ? data.length : 0} shared dashboards from Supabase`);
        // Format data slightly if needed for consistency
        return (data || []).map(item => ({
           share_id: item.share_id,
           created_at: item.created_at,
           expires_at: item.expires_at,
           access_count: item.access_count || 0,
           clientName: item.clientName || 'N/A', // Handle potential nulls from JSON access
           brandNames: item.brandNames || [],   // Handle potential nulls from JSON access
           isLocal: false // Indicate it's from Supabase
        }));
      },
      // Fallback returns empty array if Supabase is unavailable
      async (error) => {
        console.warn("Could not list shared dashboards from Supabase:", error);
        return []; // Return empty array on failure
      }
    );
  },

  /**
   * Delete a shared dashboard from Supabase.
   * @param {string} shareId - The unique share ID (UUID) to delete.
   * @returns {Promise<boolean>} - Success status.
   */
  async deleteSharedDashboard(shareId) {
    return supabase.safeQuery(
      async (client) => {
        const { error } = await client
          .from('shared_dashboards')
          .delete()
          .eq('share_id', shareId);

        if (error) {
          console.error("Supabase error deleting shared dashboard:", error);
          throw error;
        }

        console.log(`Successfully deleted dashboard from Supabase with ID: ${shareId}`);
        return true;
      },
      // Fallback returns false if Supabase is unavailable
      async (error) => {
        console.warn("Could not delete shared dashboard from Supabase:", error);
        return false; // Return failure on error
      }
    );
  }
};

export default sharingService;
