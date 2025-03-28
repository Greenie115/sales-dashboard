/**
 * Test utility for diagnosing shared dashboard data issues
 */
import { validateSharedDashboardData } from './debugUtils';

/**
 * Create a minimal valid shared dashboard data structure
 * @returns {Object} A minimal valid shared dashboard data structure
 */
export const createMinimalValidData = () => {
  // Create a minimal sales data sample
  const sampleSalesData = [
    {
      id: 'sample1',
      product_name: 'Test Product',
      chain: 'Test Retailer',
      receipt_date: '2023-01-01',
      receipt_total: 10.99,
      gender: 'Female',
      age_group: '25-34',
      month: '2023-01'
    }
  ];

  // Create a minimal valid data structure
  return {
    salesData: sampleSalesData,
    filteredData: sampleSalesData,
    brandMapping: { 'Test Product': { displayName: 'Test', brandName: 'Test Brand' } },
    brandNames: ['Test Brand'],
    metrics: {
      totalUnits: 1,
      avgRedemptionsPerDay: 1,
      uniqueDates: ['2023-01-01'],
      daysInRange: 1,
      totalValue: 10.99
    },
    retailerDistribution: [
      { name: 'Test Retailer', value: 1, percentage: 100 }
    ],
    productDistribution: [
      { name: 'Test Product', displayName: 'Test', count: 1, percentage: 100, value: 10.99 }
    ],
    demographicData: {
      genderDistribution: [
        { name: 'Female', value: 1, percentage: 100 }
      ],
      ageDistribution: [
        { ageGroup: '25-34', count: 1, percentage: 100 }
      ]
    },
    metadata: {
      clientName: 'Test Client',
      totalRecords: 1,
      filteredRecords: 1,
      createdAt: new Date().toISOString()
    },
    allowClientFiltering: false
  };
};

/**
 * Test function to diagnose shared dashboard data issues
 * @param {Object} data - The data to test
 * @returns {Object} - Test results
 */
export const testSharedData = (data) => {
  console.group('Shared Dashboard Data Test');
  
  // Check if data exists
  if (!data) {
    console.error('Data is null or undefined');
    console.groupEnd();
    return { success: false, message: 'Data is null or undefined' };
  }
  
  // Validate the data
  const isValid = validateSharedDashboardData(data, 'Test validation');
  
  // Create a minimal valid data structure
  const minimalValidData = createMinimalValidData();
  
  // Compare the data with the minimal valid data structure
  console.log('Comparing with minimal valid data structure:');
  const missingKeys = [];
  Object.keys(minimalValidData).forEach(key => {
    if (!data[key]) {
      missingKeys.push(key);
      console.error(`Missing key: ${key}`);
    }
  });
  
  // Check hasData condition
  const hasData = Boolean(
    (data.metrics && data.metrics.totalUnits > 0) || 
    (data.salesData && data.salesData.length > 0) || 
    (data.filteredData && data.filteredData.length > 0) ||
    (data.retailerDistribution && data.retailerDistribution.length > 0) ||
    (data.productDistribution && data.productDistribution.length > 0)
  );
  
  console.log('hasData check result:', hasData);
  
  // Check if the data has any arrays with length > 0
  const nonEmptyArrays = [];
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      nonEmptyArrays.push(key);
    }
  });
  
  console.log('Non-empty arrays:', nonEmptyArrays);
  
  // Result
  const result = {
    success: isValid,
    hasData,
    missingKeys,
    nonEmptyArrays,
    message: isValid ? 'Data is valid' : 'Data is invalid'
  };
  
  console.log('Test result:', result);
  console.groupEnd();
  
  return result;
};

export default {
  createMinimalValidData,
  testSharedData
};
