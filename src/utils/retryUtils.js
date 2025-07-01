// src/utils/retryUtils.js
/**
 * Retry utilities for handling network failures and transient errors
 */

/**
 * Retry an async operation with exponential backoff
 */
export const retryWithBackoff = async (
  operation,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000
) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      console.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
      
      await sleep(delay);
    }
  }
  
  throw lastError;
};

/**
 * Determine if an error is retryable
 */
const isRetryableError = (error) => {
  // Network errors
  if (error.name === 'NetworkError' || error.message.includes('network')) {
    return true;
  }
  
  // Timeout errors
  if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
    return true;
  }
  
  // HTTP status codes that are retryable
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }
  
  // Supabase specific errors that are retryable
  if (error.message.includes('connection') || error.message.includes('Connection')) {
    return true;
  }
  
  return false;
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Error handler with user-friendly messages
 */
export const handleSupabaseError = (error, operation = 'operation') => {
  console.error(`Supabase ${operation} error:`, error);
  
  // Create user-friendly error messages
  let userMessage = `Failed to ${operation}.`;
  
  if (error.message.includes('network') || error.message.includes('timeout')) {
    userMessage = `Network error during ${operation}. Please check your connection and try again.`;
  } else if (error.message.includes('unauthorized') || error.status === 401) {
    userMessage = `Authentication error during ${operation}. Please refresh the page.`;
  } else if (error.message.includes('not found') || error.status === 404) {
    userMessage = `Data not found during ${operation}.`;
  } else if (error.status >= 500) {
    userMessage = `Server error during ${operation}. Please try again later.`;
  }
  
  return {
    userMessage,
    originalError: error,
    shouldRetry: isRetryableError(error)
  };
};

/**
 * Circuit breaker pattern for Supabase operations
 */
export class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN - operation not allowed');
      } else {
        this.state = 'HALF_OPEN';
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
  
  getState() {
    return this.state;
  }
}

// Global circuit breaker for Supabase operations
export const supabaseCircuitBreaker = new CircuitBreaker();