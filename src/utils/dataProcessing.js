// src/utils/dataProcessing.js
import { identifyBrandPrefixes, extractBrandNames } from './brandDetection';
import uniq from 'lodash/uniq';
import groupBy from 'lodash/groupBy';
import orderBy from 'lodash/orderBy';

/**
 * Process raw data to add derived fields and structured information
 */
export const processData = (rawData) => {
  if (!rawData || rawData.length === 0) return [];
  
  try {
    // First, remove completely empty rows
    const cleanedData = rawData.filter(row => {
      if (!row || typeof row !== 'object') return false;
      // Check if row has any non-empty values
      return Object.values(row).some(value => 
        value !== null && value !== undefined && value !== '' && String(value).trim() !== ''
      );
    });
    
    // Process dates and add derived fields with enhanced validation
    return cleanedData.map(item => {
      if (!item.receipt_date) return item;
      
      const date = new Date(item.receipt_date);
      
      // Validate date is reasonable (not before 1990 or after current date + 1 year)
      const minDate = new Date('1990-01-01');
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      
      if (isNaN(date.getTime()) || date < minDate || date > maxDate) {
        console.warn('Invalid date detected and filtered out:', item.receipt_date, 'in row:', item);
        return null; // Mark for removal
      }
      
      return {
        ...item,
        receipt_date: date.toISOString().split('T')[0],
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
        hour_of_day: date.getHours() // 0-23
      };
    }).filter(item => item !== null); // Remove invalid date entries
  } catch (error) {
    console.error('Error processing data:', error);
    return rawData;
  }
};

/**
 * Calculate comprehensive metrics for the given data including financial metrics
 */
export const calculateMetrics = (data, isComparison = false) => {
  if (!data || data.length === 0) return null;
  
  // Get unique dates to calculate date range and average per day
  const uniqueDates = uniq(data.map(item => item.receipt_date)).sort();
  const daysInRange = uniqueDates.length;
  
  // Financial calculations
  const totalRevenue = data.reduce((sum, item) => {
    return sum + (parseFloat(item.receipt_amount) || 0);
  }, 0);
  
  // Rebate/savings analytics
  const totalRebates = data.reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);
  
  // Customer analytics
  const uniqueCustomers = uniq(data.map(item => item.user_id)).filter(Boolean);
  const customerCount = uniqueCustomers.length;
  
  // Transaction analytics
  const avgPerDay = daysInRange > 0 ? data.length / daysInRange : 0;
  const avgTransactionValue = data.length > 0 ? totalRevenue / data.length : 0;
  const avgRevenuePerDay = daysInRange > 0 ? totalRevenue / daysInRange : 0;
  const avgRevenuePerCustomer = customerCount > 0 ? totalRevenue / customerCount : 0;
  const avgTransactionsPerCustomer = customerCount > 0 ? data.length / customerCount : 0;
  const avgRebatePerTransaction = data.length > 0 ? totalRebates / data.length : 0;
  const savingsRate = totalRevenue > 0 ? (totalRebates / totalRevenue) * 100 : 0;
  
  // Calculate customer frequency distribution
  const customerFrequency = {};
  data.forEach(item => {
    if (item.user_id) {
      customerFrequency[item.user_id] = (customerFrequency[item.user_id] || 0) + 1;
    }
  });
  
  const frequencyDistribution = Object.values(customerFrequency);
  const maxFrequency = Math.max(...frequencyDistribution, 0);
  const avgFrequency = frequencyDistribution.length > 0 ? 
    frequencyDistribution.reduce((a, b) => a + b, 0) / frequencyDistribution.length : 0;
  
  return {
    // Basic metrics
    totalUnits: data.length,
    uniqueDates: uniqueDates,
    daysInRange: daysInRange,
    avgRedemptionsPerDay: avgPerDay.toFixed(1),
    
    // Financial metrics
    totalRevenue: totalRevenue,
    avgTransactionValue: avgTransactionValue,
    avgRevenuePerDay: avgRevenuePerDay,
    avgRevenuePerCustomer: avgRevenuePerCustomer,
    
    // Customer metrics
    uniqueCustomers: customerCount,
    avgTransactionsPerCustomer: avgTransactionsPerCustomer,
    maxCustomerFrequency: maxFrequency,
    avgCustomerFrequency: avgFrequency,
    
    // Rebate/savings metrics
    totalRebates: totalRebates,
    avgRebatePerTransaction: avgRebatePerTransaction,
    savingsRate: savingsRate,
    
    // Legacy support
    totalValue: totalRevenue
  };
};

/**
 * Get retailer distribution from data with financial metrics
 */
export const getRetailerDistribution = (data) => {
  if (!data || data.length === 0) return [];
  
  const groupedByRetailer = groupBy(data, 'chain');
  const totalUnits = data.length;
  const totalRevenue = data.reduce((sum, item) => sum + (parseFloat(item.receipt_amount) || 0), 0);
  
  return Object.entries(groupedByRetailer)
    .map(([chain, items]) => {
      const chainRevenue = items.reduce((sum, item) => sum + (parseFloat(item.receipt_amount) || 0), 0);
      return {
        name: chain || 'Unknown',
        value: items.length,
        percentage: (items.length / totalUnits) * 100,
        revenue: chainRevenue,
        revenuePercentage: totalRevenue > 0 ? (chainRevenue / totalRevenue) * 100 : 0,
        avgTransactionValue: items.length > 0 ? chainRevenue / items.length : 0
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};

/**
 * Get product distribution from data using brand detection
 */
export const getProductDistribution = (data, brandMapping = {}) => {
  if (!data || data.length === 0) return [];
  
  const groupedByProduct = groupBy(data, 'product_name');
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
        value: items.reduce((sum, item) => sum + (item.receipt_amount || 0), 0)
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
      groupedData = groupBy(data, 'hour_of_day');
      format = hour => `${hour}:00`;
      break;
    case 'daily':
      // Group by date
      groupedData = groupBy(data, 'receipt_date');
      format = date => date;
      break;
    case 'weekly':
      // Group by week (using the first day of the week)
      groupedData = groupBy(data, item => {
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
      groupedData = groupBy(data, 'month');
      format = month => month;
  }
  
  // Convert grouped data to array format for chart
  let result = Object.entries(groupedData)
    .map(([key, items]) => {
      // Calculate average value per receipt if available
      const avgValue = items.reduce((sum, item) => sum + (item.receipt_amount || 0), 0) / items.length;
      
      return {
        name: format(key),
        count: items.length,
        value: items.reduce((sum, item) => sum + (item.receipt_amount || 0), 0),
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
    const uniqueProducts = uniq(data.map(item => item.product_name)).filter(Boolean);
    
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
  const uniqueProducts = uniq(data.map(item => item.product_name)).filter(Boolean);
  const uniqueRetailers = uniq(data.map(item => item.chain)).filter(Boolean);
  
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
/**
 * Filters sales data based on provided criteria.
 */
export const filterSalesData = (data, filters) => {
  if (!data || !Array.isArray(data)) return [];
  if (!filters) return data; // Return all data if no filters are provided

  const {
    selectedProducts = ['all'],
    selectedRetailers = ['all'],
    dateRange = 'all',
    startDate = '',
    endDate = '',
    selectedMonth = '',
    // Add textSearch later if needed
    // textSearch = ''
  } = filters;

  return data.filter(item => {
    if (!item) return false;

    // Product filter
    const productMatch = selectedProducts.includes('all') ||
                         (item.product_name && selectedProducts.includes(item.product_name));

    // Retailer filter
    const retailerMatch = selectedRetailers.includes('all') ||
                          (item.chain && selectedRetailers.includes(item.chain));

    // Date filter
    let dateMatch = true;
    if (dateRange === 'month' && selectedMonth && item.month) {
      dateMatch = item.month === selectedMonth;
    } else if (dateRange === 'custom' && startDate && endDate && item.receipt_date) {
      // Ensure date comparison is robust (e.g., comparing date objects or ensuring consistent string formats)
      // Assuming YYYY-MM-DD format for comparison
      dateMatch = item.receipt_date >= startDate && item.receipt_date <= endDate;
    }
    
    // Text search filter (placeholder - implement actual logic if needed)
    // const textMatch = !textSearch ||
    //                   (item.product_name && item.product_name.toLowerCase().includes(textSearch.toLowerCase())) ||
    //                   (item.chain && item.chain.toLowerCase().includes(textSearch.toLowerCase()));

    // Combine all filters
    return productMatch && retailerMatch && dateMatch; // && textMatch;
  });
};

/**
 * Get revenue over time based on selected timeframe
 */
export const getRevenueOverTime = (data, timeframe = 'daily') => {
  if (!data || data.length === 0) return [];
  
  let groupedData;
  let format;
  
  switch(timeframe) {
    case 'hourly':
      groupedData = groupBy(data, 'hour_of_day');
      format = hour => `${hour}:00`;
      break;
    case 'daily':
      groupedData = groupBy(data, 'receipt_date');
      format = date => date;
      break;
    case 'weekly':
      groupedData = groupBy(data, item => {
        const date = new Date(item.receipt_date);
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek;
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
      groupedData = groupBy(data, 'month');
      format = month => month;
  }
  
  let result = Object.entries(groupedData)
    .map(([key, items]) => {
      const revenue = items.reduce((sum, item) => sum + (parseFloat(item.receipt_amount) || 0), 0);
      const avgTransactionValue = items.length > 0 ? revenue / items.length : 0;
      
      return {
        name: format(key),
        revenue: revenue,
        transactions: items.length,
        avgTransactionValue: avgTransactionValue
      };
    });
  
  // Sort by the appropriate key
  if (timeframe === 'hourly') {
    result = result.sort((a, b) => parseInt(a.name) - parseInt(b.name));
  } else {
    result = result.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  return result;
};

/**
 * Get customer analytics including frequency and lifetime value
 */
export const getCustomerAnalytics = (data) => {
  if (!data || data.length === 0) return null;
  
  const customerData = {};
  
  // Group transactions by customer
  data.forEach(item => {
    if (!item.user_id) return;
    
    if (!customerData[item.user_id]) {
      customerData[item.user_id] = {
        transactions: 0,
        totalSpent: 0,
        firstPurchase: item.receipt_date,
        lastPurchase: item.receipt_date,
        products: new Set()
      };
    }
    
    const customer = customerData[item.user_id];
    customer.transactions++;
    customer.totalSpent += parseFloat(item.receipt_amount) || 0;
    customer.products.add(item.product_name);
    
    if (item.receipt_date < customer.firstPurchase) {
      customer.firstPurchase = item.receipt_date;
    }
    if (item.receipt_date > customer.lastPurchase) {
      customer.lastPurchase = item.receipt_date;
    }
  });
  
  const customers = Object.values(customerData);
  const totalCustomers = customers.length;
  
  if (totalCustomers === 0) return null;
  
  // Calculate segments
  const oneTimeCustomers = customers.filter(c => c.transactions === 1).length;
  const repeatCustomers = totalCustomers - oneTimeCustomers;
  const highValueCustomers = customers.filter(c => c.totalSpent > 100).length; // Threshold can be adjusted
  
  // Customer lifetime value
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgLifetimeValue = totalRevenue / totalCustomers;
  
  // Frequency distribution
  const frequencyBuckets = {
    '1': 0,
    '2-3': 0,
    '4-6': 0,
    '7-10': 0,
    '11+': 0
  };
  
  customers.forEach(customer => {
    const freq = customer.transactions;
    if (freq === 1) frequencyBuckets['1']++;
    else if (freq <= 3) frequencyBuckets['2-3']++;
    else if (freq <= 6) frequencyBuckets['4-6']++;
    else if (freq <= 10) frequencyBuckets['7-10']++;
    else frequencyBuckets['11+']++;
  });
  
  return {
    totalCustomers,
    oneTimeCustomers,
    repeatCustomers,
    highValueCustomers,
    avgLifetimeValue,
    repeatCustomerRate: (repeatCustomers / totalCustomers) * 100,
    highValueCustomerRate: (highValueCustomers / totalCustomers) * 100,
    frequencyDistribution: frequencyBuckets,
    avgTransactionsPerCustomer: data.length / totalCustomers,
    topCustomers: customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map(c => ({
        ...c,
        productCount: c.products.size
      }))
  };
};

/**
 * Get product performance with financial metrics
 */
export const getProductPerformance = (data, brandMapping = {}) => {
  if (!data || data.length === 0) return [];
  
  const groupedByProduct = groupBy(data, 'product_name');
  const totalRevenue = data.reduce((sum, item) => sum + (parseFloat(item.receipt_amount) || 0), 0);
  
  return Object.entries(groupedByProduct)
    .map(([product, items]) => {
      const productInfo = brandMapping[product] || { displayName: product };
      let displayName = productInfo.displayName || product;
      
      if (displayName === product) {
        const words = displayName.split(' ');
        if (words.length >= 3) {
          const wordsToRemove = words.length >= 5 ? 2 : 1;
          displayName = words.slice(wordsToRemove).join(' ');
        }
      }
      
      const revenue = items.reduce((sum, item) => sum + (parseFloat(item.receipt_amount) || 0), 0);
      const avgTransactionValue = items.length > 0 ? revenue / items.length : 0;
      const uniqueCustomers = uniq(items.map(item => item.user_id)).filter(Boolean).length;
      
      return {
        name: product,
        displayName: displayName,
        brandName: productInfo.brandName || '',
        transactions: items.length,
        revenue: revenue,
        percentage: (items.length / data.length) * 100,
        revenuePercentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        avgTransactionValue: avgTransactionValue,
        uniqueCustomers: uniqueCustomers,
        revenuePerCustomer: uniqueCustomers > 0 ? revenue / uniqueCustomers : 0
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};