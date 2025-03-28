import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create client with error handling
let supabaseClient;
let sslError = false;

try {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured - sharing will use client-side fallback');
  } else {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  
  // Check for SSL certificate errors
  if (error.message && (
    error.message.includes('SSL') || 
    error.message.includes('certificate') ||
    error.message.includes('CERT_') ||
    error.message.includes('ERR_CERT'))) {
    console.error('SSL certificate error detected during Supabase initialization');
    sslError = true;
  }
}

/**
 * Enhanced Supabase client wrapper with SSL error detection and fallback support
 */
const supabase = {
  /**
   * Execute a Supabase query with fallback handling
   * @param {Function} queryFn - Function to execute the Supabase query
   * @param {Function} fallbackFn - Function to execute if the query fails
   * @returns {Promise<any>} - Result of the query or fallback
   */
  async safeQuery(queryFn, fallbackFn) {
    if (this.hasSslError()) {
      console.log('Using fallback due to known SSL error');
      return fallbackFn ? fallbackFn(new Error('SSL_ERROR')) : null;
    }
    
    if (!supabaseClient) {
      console.warn('Supabase client not available, using fallback');
      return fallbackFn ? fallbackFn(new Error('CLIENT_NOT_AVAILABLE')) : null;
    }
    
    try {
      const result = await queryFn(supabaseClient);
      return result;
    } catch (error) {
      console.error('Supabase query error:', error);
      
      // Detect SSL errors
      if (error.message && (
        error.message.includes('SSL') || 
        error.message.includes('certificate') ||
        error.message.includes('CERT_') ||
        error.message.includes('ERR_CERT'))) {
        console.error('SSL certificate error detected during query');
        sslError = true;
      }
      
      if (fallbackFn) {
        return fallbackFn(error);
      }
      
      throw error;
    }
  },
  
  /**
   * Check if SSL error has been detected
   * @returns {boolean} - True if SSL error has been detected
   */
  hasSslError() {
    return sslError;
  },
  
  /**
   * Force SSL error flag (for testing)
   */
  forceSSLError() {
    sslError = true;
    console.warn('SSL error flag has been forced');
  },
  
  /**
   * Clear SSL error flag
   */
  clearSSLError() {
    sslError = false;
    console.log('SSL error flag has been cleared');
  },
  
  /**
   * Check if Supabase client is available
   * @returns {boolean} - True if Supabase client is available
   */
  isAvailable() {
    return !!supabaseClient && !sslError;
  },
  
  /**
   * Direct access to Supabase client (use with caution)
   * @returns {Object} - Supabase client or null
   */
  getClient() {
    if (!supabaseClient) {
      console.warn('Attempted to access Supabase client directly, but it is not available');
      return null;
    }
    return supabaseClient;
  },
  
  /**
   * Raw insert to shared_dashboards table
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} - Result of the insert
   */
  async insertSharedDashboard(data) {
    return this.safeQuery(
      async (client) => {
        const result = await client.from('shared_dashboards').insert(data).select();
        return result;
      },
      async (error) => {
        console.error('Failed to insert shared dashboard:', error);
        throw error;
      }
    );
  },
  
  /**
   * Raw fetch from shared_dashboards table
   * @param {string} shareId - Share ID to fetch
   * @returns {Promise<Object>} - Result of the fetch
   */
  async getSharedDashboard(shareId) {
    return this.safeQuery(
      async (client) => {
        const result = await client.from('shared_dashboards').select('*').eq('share_id', shareId).single();
        return result;
      },
      async (error) => {
        console.error('Failed to get shared dashboard:', error);
        throw error;
      }
    );
  },

  /**
   * Uploads a file to Supabase Storage.
   * @param {string} bucketName - The name of the storage bucket.
   * @param {string} filePath - The path (including filename) within the bucket.
   * @param {File|Blob} fileBody - The file content to upload.
   * @param {object} [options] - Optional upload options (e.g., { upsert: true }).
   * @returns {Promise<{ data: { path: string } | null, error: Error | null }>} - Result of the upload.
   */
  async uploadToStorage(bucketName, filePath, fileBody, options = {}) {
    if (!this.isAvailable()) {
      const error = new Error('Supabase client not available for storage upload.');
      console.error(error.message);
      return { data: null, error };
    }
    try {
      const client = this.getClient();
      const { data, error } = await client.storage
        .from(bucketName)
        .upload(filePath, fileBody, options);

      if (error) {
        console.error('Supabase storage upload error:', error);
      }
      return { data, error };
    } catch (error) {
      console.error('Exception during Supabase storage upload:', error);
      // Check for SSL errors specifically if needed, similar to safeQuery
      if (error.message && (error.message.includes('SSL') || error.message.includes('certificate'))) {
        sslError = true;
      }
      return { data: null, error };
    }
  },

  /**
   * Gets the public URL for a file in Supabase Storage.
   * Assumes the bucket/file has appropriate public access policies.
   * @param {string} bucketName - The name of the storage bucket.
   * @param {string} filePath - The path of the file within the bucket.
   * @returns {{ data: { publicUrl: string } | null, error: Error | null }} - Object containing the public URL or an error.
   */
  getStoragePublicUrl(bucketName, filePath) {
     if (!this.isAvailable()) {
      // Even if client isn't fully available for queries due to SSL, URL generation might work
      // But let's be consistent and require availability.
      const error = new Error('Supabase client not available for getting public URL.');
      console.error(error.message);
      // Return structure consistent with Supabase client methods
      return { data: null, error };
    }
     try {
      const client = this.getClient();
      const { data } = client.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
         // This case might indicate the file doesn't exist or path is wrong,
         // but the client itself doesn't throw an error here.
         console.warn(`Could not get public URL for ${bucketName}/${filePath}. File might not exist or bucket policies incorrect.`);
         return { data: null, error: new Error('Public URL not found or not accessible.') };
      }
      return { data, error: null };
    } catch (error) {
      // Catch potential errors during client interaction, though getPublicUrl is typically synchronous
      console.error('Exception during Supabase getPublicUrl:', error);
      return { data: null, error };
    }
  },

   /**
   * Downloads a file from Supabase Storage.
   * @param {string} bucketName - The name of the storage bucket.
   * @param {string} filePath - The path of the file within the bucket.
   * @returns {Promise<{ data: Blob | null, error: Error | null }>} - Result of the download.
   */
  async downloadFromStorage(bucketName, filePath) {
    if (!this.isAvailable()) {
      const error = new Error('Supabase client not available for storage download.');
      console.error(error.message);
      return { data: null, error };
    }
    try {
      const client = this.getClient();
      const { data, error } = await client.storage
        .from(bucketName)
        .download(filePath);

      if (error) {
        console.error('Supabase storage download error:', error);
      }
      return { data, error };
    } catch (error) {
      console.error('Exception during Supabase storage download:', error);
      if (error.message && (error.message.includes('SSL') || error.message.includes('certificate'))) {
        sslError = true;
      }
      return { data: null, error };
    }
  }
};

export default supabase;
