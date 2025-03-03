// src/utils/dataProcessing.js
import { identifyBrandPrefixes, extractBrandNames } from './brandDetection';
import _ from 'lodash';

/**
 * Process raw data to add derived fields and structured information
 */
export const processData = (rawData) => {
  if (!rawData || rawData.length === 0) return [];
  
  try {
    // Process dates and add derived fields
    return rawData.map(item => {
      if (!item.receipt_date) return item;
      
      const date = new Date(item.receipt_date);
      if (isNaN(date.getTime())) return item;
      
      return {
        ...item,
        receipt_date: date.toISOString().split('T')[0],
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
        hour_of_day: date.getHours() // 0-23
      };
    });
  } catch (error) {
    console.error('Error processing data:', error);
    return rawData;
  }
};

/**
 * Calculate metrics for the given data
 */
export const calculateMetrics = (data, isComparison = false) => {
  if (!data || data.length === 0) return null;
  
  // Get unique dates to calculate date range and average per day
  const uniqueDates = _.uniq(data.map(item => item.receipt_date)).sort();
  const daysInRange = uniqueDates.length;
  
  // Get total monetary value if available
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
    avgRedemptionsPerDay: avgPerDay.toFixed(1)
  };
};

/**
 * Get retailer distribution from data
 */
export const getRetailerDistribution = (data) => {
  if (!data || data.length === 0) return [];
  
  const groupedByRetailer = _.groupBy(data, 'chain');
  const totalUnits = data.length;
  
  return Object.entries(groupedByRetailer)
    .map(([chain, items]) => ({
      name: chain || 'Unknown',
      value: items.length,
      percentage: (items.length / totalUnits) * 100
    }))
    .sort((a, b) => b.value - a.value);
};

/**
 * Get product distribution from data using brand detection
 */
export const getProductDistribution = (data, brandMapping = {}) => {
  if (!data || data.length === 0) return [];
  
  const groupedByProduct = _.groupBy(data, 'product_name');
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
};

/**
 * Get redemptions over time based on selected timeframe
 */
export const getRedemptionsOverTime = (data, timeframe = 'daily') => {
  if (!data || data.length === 0) return [];
  
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
};

/**
 * Calculate trend line data (using simple moving average)
 */
export const calculateTrendLine = (data, window = 7) => {
  if (!data || data.length < window) return [];
  
  const result = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      // Not enough data points yet for the window
      result.push(null);
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
};

/**
 * Process uploaded file data for sales or offers
 */
export const processFileData = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const isOfferData = file.name.toLowerCase().includes('hits_offer');
        resolve({ content: e.target.result, isOfferData });
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Analyze data to detect brands and create mapping
 */
export const analyzeBrands = (data) => {
  if (!data || data.length === 0) return { brandMapping: {}, brandNames: [] };
  
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
 * Create a product-retailer matrix from data
 */
export const createProductRetailerMatrix = (data, usePercentages = false) => {
  if (!data || data.length === 0) return null;
  
  // Get unique products and retailers
  const uniqueProducts = _.uniq(data.map(item => item.product_name)).filter(Boolean);
  const uniqueRetailers = _.uniq(data.map(item => item.chain)).filter(Boolean);
  
  // Initialize the data structure
  const matrix = {
    retailers: uniqueRetailers,
    products: uniqueProducts,
    data: {}, // Will be a nested object: data[product][retailer] = count
    productTotals: {}, // Will store total count for each product
    retailerTotals: {}, // Will store total count for each retailer
    grandTotal: 0, // Overall total
    percentages: {} // Will store percentage data: percentages[product][retailer] = percentage
  };
  
  // Initialize with zeros
  uniqueProducts.forEach(product => {
    matrix.data[product] = {};
    matrix.percentages[product] = {};
    matrix.productTotals[product] = 0;
    
    uniqueRetailers.forEach(retailer => {
      matrix.data[product][retailer] = 0;
      matrix.percentages[product][retailer] = 0;
      if (!matrix.retailerTotals[retailer]) {
        matrix.retailerTotals[retailer] = 0;
      }
    });
  });
  
  // Populate the matrix
  data.forEach(item => {
    const product = item.product_name;
    const retailer = item.chain;
    
    if (product && retailer && matrix.data[product] && matrix.data[product][retailer] !== undefined) {
      matrix.data[product][retailer]++;
      matrix.productTotals[product]++;
      matrix.retailerTotals[retailer]++;
      matrix.grandTotal++;
    }
  });
  
  // Calculate percentages 
  uniqueProducts.forEach(product => {
    uniqueRetailers.forEach(retailer => {
      if (usePercentages) {
        // Calculate percentage relative to the product's total (how much of this product is sold in each retailer)
        if (matrix.productTotals[product] > 0) {
          matrix.percentages[product][retailer] = (matrix.data[product][retailer] / matrix.productTotals[product]) * 100;
        }
      } else {
        // Calculate percentage relative to the total for this retailer (share of each product within retailer)
        if (matrix.retailerTotals[retailer] > 0) {
          matrix.percentages[product][retailer] = (matrix.data[product][retailer] / matrix.retailerTotals[retailer]) * 100;
        }
      }
    });
  });
  
  // Sort products by total count (descending)
  matrix.products = matrix.products.sort((a, b) => 
    (matrix.productTotals[b] || 0) - (matrix.productTotals[a] || 0)
  );
  
  // Sort retailers by total count (descending)
  matrix.retailers = matrix.retailers.sort((a, b) => 
    (matrix.retailerTotals[b] || 0) - (matrix.retailerTotals[a] || 0)
  );
  
  // Limit to top 10 products and top 5 retailers for readability
  matrix.products = matrix.products.slice(0, 10);
  matrix.retailers = matrix.retailers.slice(0, 5);
  
  return matrix;
};