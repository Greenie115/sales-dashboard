// src/services/dataUploadService.js
import supabase from '../utils/supabase';

/**
 * Service for handling data uploads and storage in Supabase
 */
const dataUploadService = {
  /**
   * Uploads data to Supabase storage and returns the storage ID
   * @param {Array} data - The processed data to upload
   * @param {string} type - The type of data ('sales' or 'offer')
   * @returns {Promise<string>} - The storage ID
   */
  uploadData: async (data, type = 'sales') => {
    try {
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No valid data to upload');
      }

      // Generate a unique ID for the dataset
      const storageId = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // Convert the data to a JSON string
      const jsonData = JSON.stringify(data);
      
      // Create a Blob from the JSON string
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Upload the blob to Supabase storage
      const { data: uploadResult, error } = await supabase.storage
        .from('raw-datasets')
        .upload(storageId, blob);
      
      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Failed to upload data: ${error.message}`);
      }
      
      console.log('Data uploaded successfully:', uploadResult);
      
      // Return the storage ID
      return storageId;
    } catch (error) {
      console.error('Error in dataUploadService.uploadData:', error);
      
      // If this is a Supabase connection error, try local storage as fallback
      if (error.message?.includes('network') || error.message?.includes('connection')) {
        console.warn('Using local storage fallback due to connection issues');
        return dataUploadService.storeDataLocally(data, type);
      }
      
      throw error;
    }
  },
  
  /**
   * Fallback method to store data locally if Supabase is unavailable
   * @param {Array} data - The processed data to store
   * @param {string} type - The type of data ('sales' or 'offer')
   * @returns {string} - The local storage key
   */
  storeDataLocally: (data, type = 'sales') => {
    const storageKey = `local_${type}_${Date.now()}`;
    
    try {
      // Store the data in localStorage (with size limitations)
      localStorage.setItem(storageKey, JSON.stringify(data));
      return storageKey;
    } catch (e) {
      // If localStorage fails (e.g., quota exceeded), return a temporary ID
      console.error('Local storage failed:', e);
      return `temp_${Date.now()}`;
    }
  }
};

export default dataUploadService;