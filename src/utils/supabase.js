// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';

// Add your Supabase URL and public anon key here
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || 'your-public-anon-key';

// Create the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Track SSL error state to avoid repeated failures
let sslErrorDetected = false;

// Enhance supabase client with additional methods
const enhancedSupabase = {
  ...supabase,
  
  // Check if SSL error has been detected
  hasSslError: () => sslErrorDetected,
  
  // Check if Supabase is available
  isAvailable: async () => {
    try {
      const { data, error } = await supabase.from('health_check').select('*').limit(1);
      return !error;
    } catch (e) {
      return false;
    }
  },
  
  // Storage helper methods
  storage: {
    ...supabase.storage,
    
    // Upload file to storage
    uploadToStorage: async (bucket, filePath, fileData, options = {}) => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, fileData, options);
          
        return { data, error };
      } catch (e) {
        // Check if this is an SSL error
        if (e.message && (
          e.message.includes('SSL') || 
          e.message.includes('certificate') || 
          e.message.includes('CERT_')
        )) {
          sslErrorDetected = true;
        }
        
        return { data: null, error: e };
      }
    },
    
    // Download file from storage
    downloadFromStorage: async (bucket, filePath) => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(filePath);
          
        return { data, error };
      } catch (e) {
        // Check if this is an SSL error
        if (e.message && (
          e.message.includes('SSL') || 
          e.message.includes('certificate') || 
          e.message.includes('CERT_')
        )) {
          sslErrorDetected = true;
        }
        
        return { data: null, error: e };
      }
    }
  }
};

export default enhancedSupabase;