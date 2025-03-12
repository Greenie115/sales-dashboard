// src/hooks/useLocalStorage.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for persistent local storage state
 * 
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value if no stored value exists
 * @returns {Array} [storedValue, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // Get stored value from localStorage or use initialValue
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  /**
   * Update stored value and persist to localStorage
   * 
   * @param {any} value - New value or function to update previous value
   */
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function for useState-like API
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Update state
      setStoredValue(valueToStore);
      
      // Update localStorage if window is available
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);
  
  /**
   * Remove the item from localStorage
   */
  const removeValue = useCallback(() => {
    try {
      // Remove from localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      
      // Set state to initialValue
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);
  
  /**
   * Sync state with localStorage when key changes
   */
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Handler for storage events (when localStorage changes in other tabs)
    const handleStorageChange = (event) => {
      if (event.key === key) {
        try {
          // Update state if the key changed in another tab
          const newValue = event.newValue ? JSON.parse(event.newValue) : initialValue;
          setStoredValue(newValue);
        } catch (e) {
          console.error('Error parsing storage change:', e);
        }
      }
    };
    
    // Add event listener for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);
  
  return [storedValue, setValue, removeValue];
};