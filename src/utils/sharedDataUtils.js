/**
 * Shared data utilities for consistent data handling between main dashboard and shared view
 */
import _ from 'lodash';

/**
 * Validate shared data structure to ensure it has all required fields
 * @param {Object} data - The data to validate
 * @returns {Object} - Validation result with isValid flag and issues array
 */
export const validateSharedData = (data) => {
  const issues = [];
  
  // Check required fields
  if (!data) {
    return { isValid: false, issues: ['Data object is null or undefined'] };
  }
  
  // Check core data arrays
  if (!data.salesData) issues.push("Missing salesData");
  if (!data.filteredData) issues.push("Missing filteredData");
  
  // Check data types
  if (data.salesData && !Array.isArray(data.salesData)) 
    issues.push("salesData is not an array");
  if (data.filteredData && !Array.isArray(data.filteredData)) 
    issues.push("filteredData is not an array");
  
  // Check required objects
  if (!data.brandMapping || typeof data.brandMapping !== 'object')
    issues.push("Missing or invalid brandMapping");
  if (!data.metrics || typeof data.metrics !== 'object')
    issues.push("Missing or invalid metrics");
  
  // Check required arrays
  if (!data.brandNames || !Array.isArray(data.brandNames))
    issues.push("Missing or invalid brandNames");
  
  // Return validation result
  return {
    isValid: issues.length === 0,
    issues,
    // Add some stats for debugging
    stats: {
      salesDataLength: data.salesData?.length || 0,
      filteredDataLength: data.filteredData?.length || 0,
      brandNamesCount: data.brandNames?.length || 0,
      hasMetrics: Boolean(data.metrics),
      hasRetailerDistribution: Boolean(data.retailerDistribution?.length),
      hasProductDistribution: Boolean(data.productDistribution?.length)
    }
  };
};

/**
 * Compute retailer distribution from sales data
 * @param {Array} salesData - The sales data array
 * @returns {Array} - Retailer distribution array
 */
export const computeRetailerDistribution = (salesData) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    return [];
  }
  
  try {
    const groupedByRetailer = _.groupBy(
      salesData.filter(item => item && item.chain),
      'chain'
    );
    
    const totalUnits = salesData.length;
    
    return Object.entries(groupedByRetailer)
      .map(([chain, items]) => ({
        name: chain || 'Unknown',
        value: items.length,
        percentage: (items.length / totalUnits) * 100
      }))
      .sort((a, b) => b.value - a.value);
  } catch (e) {
    console.error("Error computing retailer distribution:", e);
    return [];
  }
};

/**
 * Compute product distribution from sales data
 * @param {Array} salesData - The sales data array
 * @param {Object} brandMapping - The brand mapping object
 * @returns {Array} - Product distribution array
 */
export const computeProductDistribution = (salesData, brandMapping = {}) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    return [];
  }
  
  try {
    const groupedByProduct = _.groupBy(
      salesData.filter(item => item && item.product_name),
      'product_name'
    );
    
    return Object.entries(groupedByProduct)
      .map(([product, items]) => {
        // Use the mapping to get display name
        const productInfo = brandMapping[product] || { displayName: product };
        
        let displayName = productInfo.displayName || product;
        
        // If the display name is still the full product name and has 3+ words,
        // force remove the first word(s)
        if (displayName === product) {
          const words = displayName.split(' ');
          if (words.length >= 3) {
            // Remove the first word (or two if the name is long)
            const wordsToRemove = words.length >= 5 ? 2 : 1;
            displayName = words.slice(wordsToRemove).join(' ');
          }
        }
        
        return {
          name: product, // Keep original name for data integrity
          displayName: displayName, // Use formatted name for display
          brandName: productInfo.brandName || '', // Store the brand name if needed
          count: items.length,
          percentage: (items.length / salesData.length) * 100,
          value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0)
        };
      })
      .sort((a, b) => b.count - a.count);
  } catch (e) {
    console.error("Error computing product distribution:", e);
    return [];
  }
};

/**
 * Compute demographic data from sales data
 * @param {Array} salesData - The sales data array
 * @returns {Object} - Demographic data object
 */
export const computeDemographicData = (salesData) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    return { genderDistribution: [], ageDistribution: [] };
  }
  
  try {
    // Extract gender distribution
    const genderGroups = _.groupBy(
      salesData.filter(item => item && item.gender),
      'gender'
    );
    
    const genderDistribution = Object.keys(genderGroups).length > 0 
      ? Object.entries(genderGroups)
          .map(([gender, items]) => ({
            name: gender,
            value: items.length,
            percentage: (items.length / salesData.length) * 100
          }))
          .sort((a, b) => b.value - a.value)
      : [];
    
    // Extract age distribution
    const ageGroups = _.groupBy(
      salesData.filter(item => item && item.age_group),
      'age_group'
    );
    
    const ageDistribution = Object.keys(ageGroups).length > 0
      ? Object.entries(ageGroups)
          .map(([ageGroup, items]) => ({
            ageGroup,
            count: items.length,
            percentage: (items.length / salesData.length) * 100
          }))
          .sort((a, b) => b.count - a.count)
      : [];
      
    return {
      genderDistribution,
      ageDistribution
    };
  } catch (e) {
    console.error("Error computing demographic data:", e);
    return { genderDistribution: [], ageDistribution: [] };
  }
};

/**
 * Compute metrics from sales data
 * @param {Array} salesData - The sales data array
 * @returns {Object} - Metrics object
 */
export const computeMetrics = (salesData) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    return {
      totalUnits: 0,
      avgRedemptionsPerDay: 0,
      uniqueDates: []
    };
  }
  
  try {
    const datesWithValues = salesData
      .map(item => item.receipt_date)
      .filter(Boolean);
    const uniqueDates = _.uniq(datesWithValues).sort();
    const daysInRange = uniqueDates.length;
    const totalValue = salesData.reduce((sum, item) => {
      return sum + (item.receipt_total || 0);
    }, 0);
    
    // Calculate average per day
    const avgPerDay = daysInRange > 0 ? salesData.length / daysInRange : 0;
    
    return {
      totalUnits: salesData.length,
      uniqueDates: uniqueDates,
      daysInRange: daysInRange,
      totalValue: totalValue,
      avgRedemptionsPerDay: parseFloat(avgPerDay.toFixed(1))
    };
  } catch (e) {
    console.error("Error computing metrics:", e);
    return {
      totalUnits: salesData.length,
      avgRedemptionsPerDay: 0,
      uniqueDates: []
    };
  }
};

/**
 * Create a standardized data structure for sharing
 * @param {Object} data - The source data
 * @returns {Object} - Standardized data structure
 */
export const createStandardDataStructure = (data) => {
  if (!data) return null;
  
  // Create a deep copy to avoid modifying the original
  const standardData = _.cloneDeep(data);
  
  // Ensure salesData exists and is an array
  if (!standardData.salesData || !Array.isArray(standardData.salesData)) {
    standardData.salesData = [];
  }
  
  // Ensure filteredData exists and is an array
  if (!standardData.filteredData || !Array.isArray(standardData.filteredData)) {
    standardData.filteredData = [...standardData.salesData];
  }
  
  // Ensure brandMapping exists
  if (!standardData.brandMapping || typeof standardData.brandMapping !== 'object') {
    standardData.brandMapping = {};
  }
  
  // Ensure brandNames exists
  if (!standardData.brandNames || !Array.isArray(standardData.brandNames)) {
    standardData.brandNames = [];
  }
  
  // Ensure metrics exists
  if (!standardData.metrics || typeof standardData.metrics !== 'object') {
    standardData.metrics = computeMetrics(standardData.salesData);
  }
  
  // Ensure retailerDistribution exists
  if (!standardData.retailerDistribution || !Array.isArray(standardData.retailerDistribution)) {
    standardData.retailerDistribution = computeRetailerDistribution(standardData.salesData);
  }
  
  // Ensure productDistribution exists
  if (!standardData.productDistribution || !Array.isArray(standardData.productDistribution)) {
    standardData.productDistribution = computeProductDistribution(
      standardData.salesData, 
      standardData.brandMapping
    );
  }
  
  // Ensure demographicData exists
  if (!standardData.demographicData || typeof standardData.demographicData !== 'object') {
    standardData.demographicData = computeDemographicData(standardData.salesData);
  }
  
  // Add metadata
  standardData.metadata = {
    createdAt: new Date().toISOString(),
    totalRecords: standardData.salesData.length,
    filteredRecords: standardData.filteredData.length,
    clientName: standardData.clientName || 'Client',
    brandNames: standardData.brandNames || []
  };
  
  return standardData;
};

/**
 * Filter sales data based on filter criteria
 * @param {Array} salesData - The sales data array
 * @param {Object} filters - The filter criteria
 * @returns {Array} - Filtered sales data
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
  } catch (e) {
    console.error("Error filtering sales data:", e);
    return salesData;
  }
};

export default {
  validateSharedData,
  computeRetailerDistribution,
  computeProductDistribution,
  computeDemographicData,
  computeMetrics,
  createStandardDataStructure,
  filterSalesData
};
