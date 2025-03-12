// src/hooks/useChartData.js
import { useMemo } from 'react';
import _ from 'lodash';

/**
 * Hook for processing data for charts and visualizations
 * 
 * @param {Array} data - The dataset to process
 * @param {Object} brandMapping - Optional brand mapping for display names
 * @returns {Object} Chart data and processing methods
 */
export const useChartData = (data = [], brandMapping = {}) => {
  /**
   * Calculate retailer distribution for pie/bar charts
   */
  const retailerDistribution = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    try {
      const groupedByRetailer = _.groupBy(data, 'chain');
      const totalUnits = data.length;
      
      return Object.entries(groupedByRetailer)
        .map(([chain, items]) => ({
          name: chain || 'Unknown',
          value: items.length,
          percentage: (items.length / totalUnits) * 100
        }))
        .sort((a, b) => b.value - a.value);
    } catch (e) {
      console.error("Error calculating retailer distribution:", e);
      return [];
    }
  }, [data]);
  
  /**
   * Calculate product distribution for pie/bar charts
   */
  const productDistribution = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    try {
      const groupedByProduct = _.groupBy(data, 'product_name');
      const totalUnits = data.length;
      
      return Object.entries(groupedByProduct)
        .map(([product, items]) => {
          // Use the mapping to get display name if available
          const productInfo = brandMapping[product] || { displayName: product };
          let displayName = productInfo.displayName || product;
          
          // Fallback: If display name is still the full name, trim it
          if (displayName === product) {
            const words = displayName.split(' ');
            if (words.length >= 3) {
              const wordsToRemove = words.length >= 5 ? 2 : 1;
              displayName = words.slice(wordsToRemove).join(' ');
            }
          }
          
          return {
            name: product,
            displayName,
            brandName: productInfo.brandName || '',
            count: items.length,
            percentage: (items.length / totalUnits) * 100,
            value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0)
          };
        })
        .sort((a, b) => b.count - a.count);
    } catch (e) {
      console.error("Error calculating product distribution:", e);
      return [];
    }
  }, [data, brandMapping]);
  
  /**
   * Get data grouped by time period (hourly, daily, weekly, monthly)
   * 
   * @param {string} timeframe - The timeframe to group by ('hourly', 'daily', 'weekly', 'monthly')
   * @returns {Array} Time series data for charts
   */
  const getTimeSeriesData = (timeframe = 'daily') => {
    if (!data || data.length === 0) return [];
    
    try {
      let groupedData;
      let format;
      
      switch(timeframe) {
        case 'hourly':
          // Group by hour of day
          groupedData = _.groupBy(data, 'hour_of_day');
          format = hour => `${hour}:00`;
          break;
        case 'daily':
          // Group by date
          groupedData = _.groupBy(data, 'receipt_date');
          format = date => date;
          break;
        case 'weekly':
          // Group by week (using the first day of the week)
          groupedData = _.groupBy(data, item => {
            const date = new Date(item.receipt_date);
            const dayOfWeek = date.getDay();
            const diff = date.getDate() - dayOfWeek; // Adjust to get first day of week (Sunday)
            const firstDay = new Date(date.setDate(diff));
            return firstDay.toISOString().split('T')[0];
          });
          format = date => {
            const startDate = new Date(date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          };
          break;
        case 'monthly':
        default:
          // Group by month
          groupedData = _.groupBy(data, 'month');
          format = month => month;
      }
      
      // Convert grouped data to array format for chart
      let result = Object.entries(groupedData)
        .map(([key, items]) => {
          // Calculate average value per receipt if available
          const avgValue = items.reduce((sum, item) => sum + (item.receipt_total || 0), 0) / items.length;
          
          return {
            name: format(key),
            date: key, // Keep original date for reference
            count: items.length,
            value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0),
            avgValue: isNaN(avgValue) ? 0 : avgValue.toFixed(2)
          };
        });
      
      // Sort appropriately based on timeframe
      if (timeframe === 'hourly') {
        // For hourly, sort by hour number
        result = result.sort((a, b) => parseInt(a.date) - parseInt(b.date));
      } else {
        // For other timeframes, sort by date/time
        result = result.sort((a, b) => a.date.localeCompare(b.date));
      }
      
      return result;
    } catch (e) {
      console.error(`Error generating ${timeframe} time series data:`, e);
      return [];
    }
  };
  
  /**
   * Calculate trend line data (using simple moving average)
   * 
   * @param {Array} timeSeriesData - Time series data to calculate trend for
   * @param {number} window - Window size for moving average (default: 7)
   * @returns {Array} Trend line data for charts
   */
  const calculateTrendLine = (timeSeriesData, window = 7) => {
    if (!timeSeriesData || timeSeriesData.length < window) return [];
    
    try {
      const result = [];
      
      for (let i = 0; i < timeSeriesData.length; i++) {
        if (i < window - 1) {
          // Not enough data points yet for the window
          result.push({
            name: timeSeriesData[i].name,
            trend: null
          });
        } else {
          // Calculate average of last 'window' points
          let sum = 0;
          for (let j = 0; j < window; j++) {
            sum += timeSeriesData[i - j].count;
          }
          result.push({
            name: timeSeriesData[i].name,
            trend: sum / window
          });
        }
      }
      
      return result;
    } catch (e) {
      console.error("Error calculating trend line:", e);
      return [];
    }
  };
  
  /**
   * Get day of week distribution
   * 
   * @returns {Array} Day of week distribution data
   */
  const getDayOfWeekDistribution = () => {
    if (!data || data.length === 0) return [];
    
    try {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayGroups = _.groupBy(data, 'day_of_week');
      
      return dayNames.map((name, index) => {
        const count = (dayGroups[index] || []).length;
        return {
          name: name,
          shortName: name.substring(0, 3),
          value: count,
          percentage: data.length > 0 ? (count / data.length) * 100 : 0
        };
      });
    } catch (e) {
      console.error("Error calculating day of week distribution:", e);
      return [];
    }
  };
  
  /**
   * Get hour of day distribution
   * 
   * @returns {Array} Hour of day distribution data
   */
  const getHourOfDayDistribution = () => {
    if (!data || data.length === 0) return [];
    
    try {
      const hourGroups = _.groupBy(data, 'hour_of_day');
      
      return Array.from({ length: 24 }, (_, hour) => {
        const count = (hourGroups[hour] || []).length;
        return {
          hour,
          name: `${hour}:00`,
          value: count,
          percentage: data.length > 0 ? (count / data.length) * 100 : 0
        };
      });
    } catch (e) {
      console.error("Error calculating hour of day distribution:", e);
      return [];
    }
  };
  
  /**
   * Apply date exclusions to time series data
   * 
   * @param {Array} timeSeriesData - Time series data to filter
   * @param {Array} excludedDates - Array of dates to exclude
   * @returns {Array} Filtered time series data
   */
  const applyDateExclusions = (timeSeriesData, excludedDates = []) => {
    if (!timeSeriesData || !Array.isArray(timeSeriesData) || timeSeriesData.length === 0) {
      return [];
    }
    
    if (!excludedDates || !Array.isArray(excludedDates) || excludedDates.length === 0) {
      return timeSeriesData;
    }
    
    try {
      // Create a Set for efficient lookups
      const excludeSet = new Set(excludedDates);
      
      // Filter out excluded dates
      return timeSeriesData.filter(item => {
        return !excludeSet.has(item.date);
      });
    } catch (e) {
      console.error("Error applying date exclusions:", e);
      return timeSeriesData;
    }
  };
  
  return {
    retailerDistribution,
    productDistribution,
    getTimeSeriesData,
    calculateTrendLine,
    getDayOfWeekDistribution,
    getHourOfDayDistribution,
    applyDateExclusions
  };
};