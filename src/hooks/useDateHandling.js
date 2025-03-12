// src/hooks/useDateHandling.js
import { useCallback } from 'react';
import _ from 'lodash';

/**
 * Hook for date handling, formatting, and processing functions
 * 
 * @returns {Object} Date utility methods
 */
export const useDateHandling = () => {
  /**
   * Format date string to localized display format
   * 
   * @param {string} dateString - ISO date string or valid date string
   * @param {string} format - Format style: 'short', 'medium', 'long'
   * @returns {string} Formatted date string
   */
  const formatDate = useCallback((dateString, format = 'medium') => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      switch (format) {
        case 'short':
          return date.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short'
          });
        case 'long':
          return date.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric'
          });
        case 'medium':
        default:
          return date.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric'
          });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }, []);

  /**
   * Format month string (YYYY-MM) to display format
   * 
   * @param {string} monthStr - Month in YYYY-MM format
   * @returns {string} Formatted month display string
   */
  const formatMonth = useCallback((monthStr) => {
    try {
      if (!monthStr || !monthStr.includes('-')) return monthStr;
      
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      
      if (isNaN(date.getTime())) return monthStr;
      
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting month:', error);
      return monthStr;
    }
  }, []);

  /**
   * Get distinct months from data with dates
   * 
   * @param {Array} data - Array of objects with date properties
   * @param {string} dateField - Name of the date field (default: 'receipt_date')
   * @returns {Array} Array of month strings in YYYY-MM format
   */
  const getAvailableMonths = useCallback((data, dateField = 'receipt_date') => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    try {
      // Extract months from valid dates
      const months = data
        .filter(item => item && item[dateField])
        .map(item => {
          try {
            const date = new Date(item[dateField]);
            if (isNaN(date.getTime())) return null;
            
            // Format as YYYY-MM
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
      
      // Return unique, sorted months
      return _.uniq(months).sort();
    } catch (error) {
      console.error('Error getting available months:', error);
      return [];
    }
  }, []);

  /**
   * Check if a date is within a specified range
   * 
   * @param {string} date - Date to check
   * @param {string} startDate - Start date of range
   * @param {string} endDate - End date of range
   * @returns {boolean} True if date is in range
   */
  const isDateInRange = useCallback((date, startDate, endDate) => {
    if (!date || !startDate || !endDate) return false;
    
    try {
      return date >= startDate && date <= endDate;
    } catch (error) {
      console.error('Error checking date range:', error);
      return false;
    }
  }, []);

  /**
   * Get date range from array of dates
   * 
   * @param {Array} dates - Array of date strings
   * @returns {Object} Object with start and end dates
   */
  const getDateRange = useCallback((dates) => {
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return { startDate: '', endDate: '' };
    }
    
    try {
      const validDates = dates
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()))
        .map(d => d.toISOString().split('T')[0]);
      
      if (validDates.length === 0) {
        return { startDate: '', endDate: '' };
      }
      
      validDates.sort();
      return {
        startDate: validDates[0],
        endDate: validDates[validDates.length - 1]
      };
    } catch (error) {
      console.error('Error getting date range:', error);
      return { startDate: '', endDate: '' };
    }
  }, []);

  /**
   * Calculate number of days between two dates
   * 
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {number} Number of days
   */
  const getDaysDifference = useCallback((startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
      }
      
      // Calculate difference in days
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculating days difference:', error);
      return 0;
    }
  }, []);

  /**
   * Get the previous period comparable to a given date range
   * 
   * @param {string} startDate - Start date of current period
   * @param {string} endDate - End date of current period
   * @returns {Object} Previous period start and end dates
   */
  const getPreviousPeriod = useCallback((startDate, endDate) => {
    if (!startDate || !endDate) {
      return { startDate: '', endDate: '' };
    }
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { startDate: '', endDate: '' };
      }
      
      // Calculate period length in milliseconds
      const periodLength = end.getTime() - start.getTime();
      
      // Calculate previous period
      const previousEnd = new Date(start);
      previousEnd.setDate(previousEnd.getDate() - 1);
      
      const previousStart = new Date(previousEnd);
      previousStart.setTime(previousEnd.getTime() - periodLength);
      
      return {
        startDate: previousStart.toISOString().split('T')[0],
        endDate: previousEnd.toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error calculating previous period:', error);
      return { startDate: '', endDate: '' };
    }
  }, []);

  /**
   * Get the same period from the previous year
   * 
   * @param {string} startDate - Start date of current period
   * @param {string} endDate - End date of current period
   * @returns {Object} Previous year period start and end dates
   */
  const getPreviousYearPeriod = useCallback((startDate, endDate) => {
    if (!startDate || !endDate) {
      return { startDate: '', endDate: '' };
    }
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { startDate: '', endDate: '' };
      }
      
      // Calculate previous year period
      const prevYearStart = new Date(start);
      prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
      
      const prevYearEnd = new Date(end);
      prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);
      
      return {
        startDate: prevYearStart.toISOString().split('T')[0],
        endDate: prevYearEnd.toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error calculating previous year period:', error);
      return { startDate: '', endDate: '' };
    }
  }, []);

  return {
    formatDate,
    formatMonth,
    getAvailableMonths,
    isDateInRange,
    getDateRange,
    getDaysDifference,
    getPreviousPeriod,
    getPreviousYearPeriod
  };
};