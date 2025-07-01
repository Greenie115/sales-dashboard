import { createClient } from '@supabase/supabase-js';
import { retryWithBackoff, handleSupabaseError, supabaseCircuitBreaker } from './retryUtils';

/**
 * Supabase client configuration with automatic fallback to localStorage
 * Includes retry logic and error handling for better reliability
 *
 * This file initializes the Supabase client with environment variables
 * and provides graceful fallback behavior for development and testing.
 */

// Get environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Track connection status
let isSupabaseAvailable = false;
let realSupabaseClient = null;

// Try to create real Supabase client if credentials are available
if (supabaseUrl && supabaseAnonKey) {
  try {
    realSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    isSupabaseAvailable = true;
    console.log('Supabase client initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
    isSupabaseAvailable = false;
  }
} else {
  console.warn('Missing Supabase environment variables. Using localStorage fallback.');
  console.warn('Create a .env file based on .env.example with your Supabase credentials.');
}

// Test Supabase connection with timeout
const testSupabaseConnection = async () => {
  if (!realSupabaseClient) return false;
  
  try {
    // Test with a simple auth check with timeout
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    const authCheck = realSupabaseClient.auth.getUser();
    await Promise.race([authCheck, timeout]);
    
    return true;
  } catch (error) {
    console.warn('Supabase connection test failed:', error.message);
    return false;
  }
};

// Initialize connection status
(async () => {
  if (realSupabaseClient) {
    isSupabaseAvailable = await testSupabaseConnection();
    if (!isSupabaseAvailable) {
      console.warn('Supabase unavailable, falling back to localStorage');
    }
  }
})();

// LocalStorage operations for fallback
const localStorageOps = {
  async get(table, conditions = {}) {
    try {
      const data = JSON.parse(localStorage.getItem(table) || '[]');
      if (conditions.eq) {
        const [column, value] = conditions.eq;
        return data.filter(item => item[column] === value);
      }
      return data;
    } catch (error) {
      console.error('localStorage get error:', error);
      return [];
    }
  },
  
  async insert(table, newData) {
    try {
      const data = JSON.parse(localStorage.getItem(table) || '[]');
      data.push(newData);
      localStorage.setItem(table, JSON.stringify(data));
      return { data: newData, error: null };
    } catch (error) {
      console.error('localStorage insert error:', error);
      return { data: null, error: { message: error.message } };
    }
  },
  
  async delete(table, conditions) {
    try {
      const data = JSON.parse(localStorage.getItem(table) || '[]');
      if (conditions.eq) {
        const [column, value] = conditions.eq;
        const filteredData = data.filter(item => item[column] !== value);
        localStorage.setItem(table, JSON.stringify(filteredData));
      }
      return { error: null };
    } catch (error) {
      console.error('localStorage delete error:', error);
      return { error: { message: error.message } };
    }
  }
};

// Hybrid client that tries Supabase first, falls back to localStorage
const hybridSupabaseClient = {
  from: (table) => ({
    select: (columns) => ({
      eq: (column, value) => ({
        single: async () => {
          // Try Supabase first if available
          if (isSupabaseAvailable && realSupabaseClient) {
            try {
              const result = await retryWithBackoff(async () => {
                return await supabaseCircuitBreaker.execute(async () => {
                  const { data, error } = await realSupabaseClient
                    .from(table)
                    .select(columns)
                    .eq(column, value)
                    .single();
                  
                  if (error) {
                    const errorInfo = handleSupabaseError(error, 'fetch data');
                    if (errorInfo.shouldRetry) {
                      throw new Error(errorInfo.userMessage);
                    }
                    console.warn('Non-retryable Supabase error, falling back to localStorage:', error);
                    return null; // Signal to use fallback
                  }
                  
                  return { data, error: null };
                });
              });
              
              if (result) {
                return result;
              }
            } catch (supabaseError) {
              console.warn('Supabase error after retries, falling back to localStorage:', supabaseError);
            }
          }
          
          // Fallback to localStorage
          const results = await localStorageOps.get(table, { eq: [column, value] });
          const data = results.length > 0 ? results[0] : null;
          return { data, error: null };
        }
      }),
      order: (column, { ascending = true } = {}) => {
        return {
          async then(resolve) {
            // Try Supabase first if available
            if (isSupabaseAvailable && realSupabaseClient) {
              try {
                const { data, error } = await realSupabaseClient
                  .from(table)
                  .select(columns)
                  .order(column, { ascending });
                
                if (!error) {
                  resolve({ data: data || [], error: null });
                  return;
                }
                console.warn('Supabase query failed, falling back to localStorage:', error);
              } catch (supabaseError) {
                console.warn('Supabase error, falling back to localStorage:', supabaseError);
              }
            }
            
            // Fallback to localStorage
            const data = await localStorageOps.get(table);
            resolve({ data: data || [], error: null });
          }
        };
      }
    }),
    insert: async (data) => {
      // Try Supabase first if available
      if (isSupabaseAvailable && realSupabaseClient) {
        try {
          const result = await retryWithBackoff(async () => {
            return await supabaseCircuitBreaker.execute(async () => {
              const supabaseResult = await realSupabaseClient
                .from(table)
                .insert(data);
              
              if (supabaseResult.error) {
                const errorInfo = handleSupabaseError(supabaseResult.error, 'insert data');
                if (errorInfo.shouldRetry) {
                  throw new Error(errorInfo.userMessage);
                }
                console.warn('Non-retryable Supabase insert error, falling back to localStorage:', supabaseResult.error);
                return null; // Signal to use fallback
              }
              
              return supabaseResult;
            });
          });
          
          if (result) {
            return result;
          }
        } catch (supabaseError) {
          console.warn('Supabase insert error after retries, falling back to localStorage:', supabaseError);
        }
      }
      
      // Fallback to localStorage
      return await localStorageOps.insert(table, data);
    },
    delete: () => ({
      eq: (column, value) => {
        return {
          async then(resolve) {
            // Try Supabase first if available
            if (isSupabaseAvailable && realSupabaseClient) {
              try {
                const { error } = await realSupabaseClient
                  .from(table)
                  .delete()
                  .eq(column, value);
                
                if (!error) {
                  resolve({ error: null });
                  return;
                }
                console.warn('Supabase delete failed, falling back to localStorage:', error);
              } catch (supabaseError) {
                console.warn('Supabase error, falling back to localStorage:', supabaseError);
              }
            }
            
            // Fallback to localStorage
            const result = await localStorageOps.delete(table, { eq: [column, value] });
            resolve(result);
          }
        };
      }
    })
  }),
  storage: {
    from: (bucket) => ({
      upload: async (path, file) => {
        if (isSupabaseAvailable && realSupabaseClient) {
          try {
            return await realSupabaseClient.storage.from(bucket).upload(path, file);
          } catch (error) {
            console.warn('Supabase storage error:', error);
          }
        }
        // Fallback for storage operations
        return { data: { path: 'localStorage-fallback' }, error: null };
      },
      getPublicUrl: (path) => {
        if (isSupabaseAvailable && realSupabaseClient) {
          try {
            return realSupabaseClient.storage.from(bucket).getPublicUrl(path);
          } catch (error) {
            console.warn('Supabase storage error:', error);
          }
        }
        return { publicURL: `localStorage://fallback/${path}` };
      }
    })
  },
  auth: {
    getUser: async () => {
      if (isSupabaseAvailable && realSupabaseClient) {
        try {
          return await realSupabaseClient.auth.getUser();
        } catch (error) {
          console.warn('Supabase auth error:', error);
        }
      }
      return { data: { user: null }, error: null };
    }
  }
};

// Log the client type being used
if (isSupabaseAvailable) {
  console.log('Using hybrid Supabase client with real Supabase connection and localStorage fallback');
} else {
  console.log('Using hybrid client with localStorage fallback only');
}

export default hybridSupabaseClient;