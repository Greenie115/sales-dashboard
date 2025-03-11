// src/hooks/useFormattedData.js
import { useCallback } from 'react';

/**
 * Hook for formatting and displaying data values
 * 
 * @returns {Object} Formatting utility methods
 */
export const useFormattedData = () => {
  /**
   * Format number with commas for thousands
   * 
   * @param {number} value - Number to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted number
   */
  const formatNumber = useCallback((value, decimals = 0) => {
    if (value === null || value === undefined) return '-';
    
    try {
      return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } catch (error) {
      console.error('Error formatting number:', error);
      return String(value);
    }
  }, []);

  /**
   * Format percentage value
   * 
   * @param {number} value - Percentage value
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted percentage
   */
  const formatPercentage = useCallback((value, decimals = 1) => {
    if (value === null || value === undefined) return '-';
    
    try {
      return `${Number(value).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}%`;
    } catch (error) {
      console.error('Error formatting percentage:', error);
      return `${value}%`;
    }
  }, []);

  /**
   * Format currency value
   * 
   * @param {number} value - Currency value
   * @param {string} currency - Currency code
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted currency
   */
  const formatCurrency = useCallback((value, currency = 'USD', decimals = 2) => {
    if (value === null || value === undefined) return '-';
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `${currency} ${value}`;
    }
  }, []);

  /**
   * Format date for display
   * 
   * @param {string} dateString - Date string
   * @param {Object} options - Date formatting options
   * @returns {string} Formatted date
   */
  const formatDate = useCallback((dateString, options = {}) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }, []);

  /**
   * Format month string (YYYY-MM)
   * 
   * @param {string} monthStr - Month string in YYYY-MM format
   * @returns {string} Formatted month name
   */
  const formatMonth = useCallback((monthStr) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      if (isNaN(date.getTime())) return monthStr;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
    } catch (error) {
      console.error('Error formatting month:', error);
      return monthStr;
    }
  }, []);

  /**
   * Truncate text with ellipsis
   * 
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  const truncateText = useCallback((text, maxLength = 30) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return `${text.substring(0, maxLength)}...`;
  }, []);

  /**
   * Format display name for product
   * 
   * @param {string} productName - Full product name
   * @param {Object} brandMapping - Brand mapping object
   * @returns {string} Formatted product display name
   */
  const formatProductName = useCallback((productName, brandMapping = {}) => {
    if (!productName) return '';
    
    // Use brand mapping if available
    if (brandMapping[productName]?.displayName) {
      return brandMapping[productName].displayName;
    }
    
    // Otherwise, try to create a display name
    const words = productName.split(' ');
    if (words.length >= 3) {
      // Remove brand name (usually first word or two)
      const wordsToRemove = words.length >= 5 ? 2 : 1;
      return words.slice(wordsToRemove).join(' ');
    }
    
    return productName;
  }, []);

  return {
    formatNumber,
    formatPercentage,
    formatCurrency,
    formatDate,
    formatMonth,
    truncateText,
    formatProductName
  };
};