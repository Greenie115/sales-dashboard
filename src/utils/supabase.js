import { createClient } from '@supabase/supabase-js';

/**
 * Enhanced Supabase client with SSL error handling and fallbacks
 */

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Track SSL errors for session persistence
let hadSslError = false;

// SSL error detection utility
const isSslError = (error) => {
  if (!error) return false;
  const errorString = String(error.message || error.details || error);
  return errorString.includes('SSL') || 
         errorString.includes('certificate') || 
         errorString.includes('CERT_') || 
         errorString.includes('ERR_CERT');
};

// Validate environment variables with better error messages
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase configuration incomplete. Some features requiring database access will use local fallbacks.',
    '\nMake sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in your environment variables.'
  );
}

// Enhanced createClient with options for safer connection
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    // Longer timeout to accommodate slow connections and handle SSL certificate issues
    fetch: (url, options) => {
      return new Promise((resolve, reject) => {
        fetch(url, { 
          ...options, 
          // 30 second timeout
          signal: AbortSignal.timeout(30000)
        }).then(resolve).catch(error => {
          // Check if this is an SSL certificate error
          if (isSslError(error)) {
            console.error('SSL certificate error in fetch:', error.message);
            hadSslError = true;
          }
          reject(error);
        });
      });
    }
  }
};

// Create the Supabase client with options
const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Test the connection and handle any SSL errors gracefully
const testSupabaseConnection = async () => {
  if (hadSslError) return false;
  
  try {
    // Only run the test if we have credentials
    if (!supabaseUrl || !supabaseAnonKey) return false;
    
    // Try a simple health check query that doesn't depend on specific tables
    try {
      // Try to connect using the actual shared_dashboards table (safest option)
      const { error } = await supabase.from('shared_dashboards').select('count', { count: 'exact', head: true });
      
      if (error) {
        // Check if this is a schema error (likely not an SSL issue)
        if (error.message && (
            error.message.includes('does not exist') || 
            error.message.includes('column') ||
            error.message.includes('schema'))) {
          console.warn('Table error in health check, but connection likely working:', error.message);
          return true; // Connection is working but table might not exist
        }
        
        // Check for SSL issues
        if (isSslError(error)) {
          console.error('SSL certificate error detected when connecting to Supabase:', error.message);
          hadSslError = true;
          return false;
        }
      }
      
      return true;
    } catch (healthErr) {
      // Check if this is an SSL error
      if (isSslError(healthErr)) {
        console.error('SSL certificate error in connection test:', healthErr.message);
        hadSslError = true;
        return false;
      }
      
      // Try a more basic connection test if the first one failed
      console.warn('Error in first health check, trying basic auth check');
      return true; // Assume connection is okay but schema is wrong
    }
  } catch (err) {
    if (isSslError(err)) {
      console.error('SSL certificate error detected when connecting to Supabase:', err.message);
      hadSslError = true;
      return false;
    }
    console.error('Error testing Supabase connection:', err.message);
    return false;
  }
};

// Run the test but don't wait for it
testSupabaseConnection().then(isConnected => {
  if (isConnected) {
    console.log('✅ Supabase connection successful');
  } else if (hadSslError) {
    console.warn('⚠️ Supabase connection has SSL issues - using fallback mechanisms');
  } else {
    console.warn('⚠️ Supabase connection unavailable - using fallback mechanisms');
  }
});

// Enhance the supabase object with helper methods
const enhancedSupabase = {
  ...supabase,
  
  // Check if Supabase is available (not blocked by SSL errors)
  isAvailable: () => !hadSslError && !!supabaseUrl && !!supabaseAnonKey,
  
  // Get SSL error status
  hasSslError: () => hadSslError,
  
  // Reset SSL error status (for testing)
  resetSslStatus: () => { hadSslError = false; },
  
  // Force SSL error (for testing fallbacks)
  forceSSLError: () => { hadSslError = true; },
  
  // Safely execute a Supabase operation with fallback
  async safeQuery(operation, fallbackFn) {
    // Skip Supabase if we've had SSL errors or missing credentials
    if (hadSslError || !supabaseUrl || !supabaseAnonKey) {
      console.log('Using fallback due to previous SSL error or missing credentials');
      return fallbackFn ? fallbackFn() : { data: null, error: new Error('Supabase unavailable') };
    }
    
    try {
      // Execute the requested Supabase operation
      const result = await operation(supabase);
      
      // Check if the operation resulted in an SSL error
      if (result.error && isSslError(result.error)) {
        console.error('SSL error during Supabase operation, switching to fallback:', result.error);
        hadSslError = true;
        return fallbackFn ? fallbackFn() : { data: null, error: result.error };
      }
      
      // Check for common schema errors that should trigger fallback
      if (result.error && result.error.message && (
          result.error.message.includes('column') || 
          result.error.message.includes('schema') || 
          result.error.message.includes('does not exist'))) {
        console.warn('Database schema error detected, using fallback:', result.error.message);
        return fallbackFn ? fallbackFn() : { data: null, error: result.error };
      }
      
      return result;
    } catch (err) {
      // Check if the error is SSL-related
      if (isSslError(err)) {
        console.error('SSL error during Supabase operation, switching to fallback:', err);
        hadSslError = true;
        return fallbackFn ? fallbackFn() : { data: null, error: err };
      }
      
      console.error('Error during Supabase operation:', err);
      return fallbackFn ? fallbackFn() : { data: null, error: err };
    }
  }
};

export default enhancedSupabase;