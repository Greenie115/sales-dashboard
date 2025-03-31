// src/utils/dataProcessingUtils.js

import _ from 'lodash';
import { identifyBrandPrefixes, extractBrandNames } from './brandDetection';

/**
 * Process raw data to add derived fields and structure
 * @param {Array} rawData - Raw sales data
 * @returns {Array} - Processed data with derived fields
 */
export const processData = (rawData) => {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return [];
  
  try {
    // Process dates and add derived fields
    return rawData.map(item => {
      if (!item || !item.receipt_date) return item;
      
      try {
        const date = new Date(item.receipt_date);
        if (isNaN(date.getTime())) return item;
        
        return {
          ...item,
          receipt_date: date.toISOString().split('T')[0],
          month: date.toISOString().slice(0, 7), // YYYY-MM format
          day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
          hour_of_day: date.getHours() // 0-23
        };
      } catch (e) {
        return item;
      }
    });
  } catch (error) {
    console.error('Error processing data:', error);
    return rawData;
  }
};

/**
 * Calculate metrics from sales data
 * @param {Array} data - Sales data
 * @param {boolean} isComparison - Whether this is for comparison
 * @returns {Object} - Calculated metrics
 */
export const calculateMetrics = (data, isComparison = false) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      totalUnits: 0,
      avgRedemptionsPerDay: 0,
      uniqueDates: [],
      daysInRange: 0,
      totalValue: 0
    };
  }
  
  try {
    // Get unique dates for date range and averages
    const datesWithValues = data
      .map(item => item.receipt_date)
      .filter(Boolean);
    const uniqueDates = _.uniq(datesWithValues).sort();
    const daysInRange = uniqueDates.length;
    
    // Calculate total monetary value if available
    const totalValue = data.reduce((sum, item) => {
      return sum + (item.receipt_total || 0);
    }, 0);
    
    // Calculate average per day
    const avgPerDay = daysInRange > 0 ? data.length / daysInRange : 0;
    
    return {
      totalUnits: data.length,
      uniqueDates: uniqueDates,
      daysInRange: daysInRange,
      totalValue: totalValue,
      avgRedemptionsPerDay: parseFloat(avgPerDay.toFixed(1))
    };
  } catch (error) {
    console.error('Error calculating metrics:', error);
    return {
      totalUnits: data?.length || 0,
      avgRedemptionsPerDay: 0,
      uniqueDates: [],
      daysInRange: 0,
      totalValue: 0
    };
  }
};

/**
 * Get retailer distribution from data
 * @param {Array} data - Sales data
 * @returns {Array} - Retailer distribution
 */
export const getRetailerDistribution = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  
  try {
    const groupedByRetailer = _.groupBy(
      data.filter(item => item && item.chain),
      'chain'
    );
    
    const totalUnits = data.length;
    
    return Object.entries(groupedByRetailer)
      .map(([chain, items]) => ({
        name: chain || 'Unknown',
        value: items.length,
        percentage: (items.length / totalUnits) * 100
      }))
      .sort((a, b) => b.value - a.value);
  } catch (error) {
    console.error('Error getting retailer distribution:', error);
    return [];
  }
};

/**
 * Get product distribution from data with brand detection
 * @param {Array} data - Sales data
 * @param {Object} brandMapping - Brand mapping object
 * @returns {Array} - Product distribution
 */
export const getProductDistribution = (data, brandMapping = {}) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  
  try {
    const groupedByProduct = _.groupBy(
      data.filter(item => item && item.product_name),
      'product_name'
    );
    
    const totalUnits = data.length;
    
    return Object.entries(groupedByProduct)
      .map(([product, items]) => {
        // Use the mapping to get display name
        const productInfo = brandMapping[product] || { displayName: product };
        
        let displayName = productInfo.displayName || product;
        
        // Fallback: If the display name is still the full product name
        // and has 3+ words, remove the first word(s)
        if (displayName === product) {
          const words = displayName.split(' ');
          if (words.length >= 3) {
            const wordsToRemove = words.length >= 5 ? 2 : 1;
            displayName = words.slice(wordsToRemove).join(' ');
          }
        }
        
        return {
          name: product, // Keep original name for data integrity
          displayName: displayName, // Use formatted name for display
          brandName: productInfo.brandName || '', // Store the brand name if needed
          count: items.length,
          percentage: (items.length / totalUnits) * 100,
          value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0)
        };
      })
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error getting product distribution:', error);
    return [];
  }
};

/**
 * Get time series data with specified timeframe
 * @param {Array} data - Sales data
 * @param {string} timeframe - Timeframe (hourly, daily, weekly, monthly)
 * @returns {Array} - Time series data
 */
export const getTimeSeriesData = (data, timeframe = 'daily') => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  
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
          const diff = date.getDate() - dayOfWeek; // adjust to get first day of week (Sunday)
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
          count: items.length,
          value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0),
          avgValue: isNaN(avgValue) ? 0 : avgValue.toFixed(2)
        };
      });
    
    // Sort by the appropriate key
    if (timeframe === 'hourly') {
      // For hourly, sort by hour number
      result = result.sort((a, b) => parseInt(a.name) - parseInt(b.name));
    } else {
      // For other timeframes, sort by date/time
      result = result.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return result;
  } catch (error) {
    console.error('Error getting time series data:', error);
    return [];
  }
};

/**
 * Calculate trend line data (using simple moving average)
 * @param {Array} data - Time series data array
 * @param {number} window - Window size for moving average
 * @returns {Array} - Trend line data
 */
export const calculateTrendLine = (data, window = 7) => {
  if (!data || !Array.isArray(data) || data.length < window) return [];
  
  try {
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) {
        // Not enough data points yet for the window
        result.push({
          name: data[i].name,
          trend: null
        });
      } else {
        // Calculate average of last 'window' points
        let sum = 0;
        for (let j = 0; j < window; j++) {
          sum += data[i - j].count;
        }
        result.push({
          name: data[i].name,
          trend: sum / window
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error calculating trend line:', error);
    return [];
  }
};

/**
 * Analyze brands in data
 * @param {Array} data - Sales data
 * @returns {Object} - Brand mapping and brand names
 */
export const analyzeBrands = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { brandMapping: {}, brandNames: [] };
  }
  
  try {
    // Extract unique product names
    const uniqueProducts = _.uniq(data.map(item => item.product_name)).filter(Boolean);
    
    // Generate brand mapping
    const brandMapping = identifyBrandPrefixes(uniqueProducts);
    
    // Extract brand names
    const brandNames = extractBrandNames(brandMapping);
    
    return { brandMapping, brandNames };
  } catch (error) {
    console.error('Error analyzing brands:', error);
    return { brandMapping: {}, brandNames: [] };
  }
};

/**
 * Extract and process demographic data
 * @param {Array} data - Sales data
 * @returns {Object} - Demographic data
 */
export const extractDemographicData = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      genderDistribution: [],
      ageDistribution: [],
      availableQuestions: [],
      questionTexts: {}
    };
  }
  
  try {
    // Extract gender distribution
    const genderGroups = _.groupBy(
      data.filter(item => item.gender),
      'gender'
    );
    
    const genderDistribution = Object.entries(genderGroups)
      .map(([gender, items]) => ({
        name: gender,
        value: items.length,
        percentage: (items.length / data.length) * 100
      }))
      .sort((a, b) => b.value - a.value);
    
    // Extract age distribution
    const ageGroups = _.groupBy(
      data.filter(item => item.age_group),
      'age_group'
    );
    
    const ageDistribution = Object.entries(ageGroups)
      .map(([ageGroup, items]) => ({
        ageGroup,
        count: items.length,
        percentage: (items.length / data.length) * 100
      }))
      .sort((a, b) => b.count - a.count);
    
    // Process survey questions
    const questionFields = [];
    const sampleRow = data[0];
    
    if (sampleRow) {
      for (let i = 1; i <= 10; i++) {
        const paddedNum = i.toString().padStart(2, '0');
        const questionKey = `question_${paddedNum}`;
        const propKey = `proposition_${paddedNum}`;
        
        if (sampleRow[questionKey] !== undefined || sampleRow[propKey] !== undefined) {
          questionFields.push({
            number: paddedNum,
            questionKey,
            propKey
          });
        }
      }
    }
    
    const availableQuestions = questionFields.map(q => q.number);
    const questionTexts = {};
    
    questionFields.forEach(field => {
      const questionEntry = data.find(
        row => row[field.questionKey] && row[field.questionKey].trim() !== ''
      );
      
      if (questionEntry) {
        questionTexts[field.number] = questionEntry[field.questionKey];
      } else {
        questionTexts[field.number] = `Question ${parseInt(field.number)}`;
      }
    });
    
    return {
      genderDistribution,
      ageDistribution,
      availableQuestions,
      questionTexts,
      questionFields
    };
  } catch (error) {
    console.error('Error extracting demographic data:', error);
    return {
      genderDistribution: [],
      ageDistribution: [],
      availableQuestions: [],
      questionTexts: {}
    };
  }
};

/**
 * Filter sales data based on criteria
 * @param {Array} salesData - Sales data
 * @param {Object} filters - Filter criteria
 * @returns {Array} - Filtered data
 */
export const filterSalesData = (salesData, filters) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    return [];
  }
  
  if (!filters) {
    return salesData;
  }
  
  try {
    return salesData.filter(item => {
      if (!item) return false;
      
      // Product filter
      const productMatch = !filters.selectedProducts || 
                          filters.selectedProducts.includes('all') || 
                          (item.product_name && filters.selectedProducts.includes(item.product_name));
      
      // Retailer filter
      const retailerMatch = !filters.selectedRetailers || 
                            filters.selectedRetailers.includes('all') || 
                            (item.chain && filters.selectedRetailers.includes(item.chain));
      
      // Date filter
      let dateMatch = true;
      if (filters.dateRange === 'month' && filters.selectedMonth && item.month) {
        dateMatch = item.month === filters.selectedMonth;
      } else if (filters.dateRange === 'custom' && filters.startDate && filters.endDate && item.receipt_date) {
        dateMatch = item.receipt_date >= filters.startDate && item.receipt_date <= filters.endDate;
      }
      
      return productMatch && retailerMatch && dateMatch;
    });
  } catch (error) {
    console.error('Error filtering sales data:', error);
    return salesData;
  }
};

// Define the preferred sorting order for age groups
export const AGE_GROUP_ORDER = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Under 18'
];

/**
 * Sort age groups according to predefined order
 * @param {Array} ageData - Age data array
 * @param {string} keyName - Key name for age group
 * @returns {Array} - Sorted age data
 */
export const sortAgeGroups = (ageData, keyName = 'ageGroup') => {
  if (!ageData || !Array.isArray(ageData)) return [];
  
  return [...ageData].sort((a, b) => {
    const aGroup = a[keyName];
    const bGroup = b[keyName];
    
    const aIndex = AGE_GROUP_ORDER.indexOf(aGroup);
    const bIndex = AGE_GROUP_ORDER.indexOf(bGroup);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return aGroup.localeCompare(bGroup);
  });
};

// Export all functions as a default object for convenience
export default {
  processData,
  calculateMetrics,
  getRetailerDistribution,
  getProductDistribution,
  getTimeSeriesData,
  calculateTrendLine,
  analyzeBrands,
  extractDemographicData,
  filterSalesData,
  sortAgeGroups,
  AGE_GROUP_ORDER
};