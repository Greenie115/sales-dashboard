/**
 * Debug utilities for troubleshooting data flow issues
 */

/**
 * Deeply inspect an object and log its structure and content
 * @param {Object} obj - The object to inspect
 * @param {string} label - A label for the log
 * @param {boolean} verbose - Whether to log the full object or just structure
 */
export const inspectObject = (obj, label = 'Object inspection', verbose = false) => {
  console.group(label);
  
  if (!obj) {
    console.log('Object is null or undefined');
    console.groupEnd();
    return;
  }
  
  // Log object type and basic info
  console.log('Type:', typeof obj);
  
  if (Array.isArray(obj)) {
    console.log('Is Array:', true);
    console.log('Length:', obj.length);
    
    // Sample first few items if it's an array
    if (obj.length > 0) {
      console.log('First item type:', typeof obj[0]);
      if (verbose) {
        console.log('Sample items (up to 3):', obj.slice(0, 3));
      }
    }
  } else if (typeof obj === 'object') {
    // Log keys
    const keys = Object.keys(obj);
    console.log('Keys:', keys);
    
    // Check for nested objects/arrays and log their structure
    keys.forEach(key => {
      const value = obj[key];
      if (value === null) {
        console.log(`${key}: null`);
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          console.log(`${key}: Array[${value.length}]`);
          if (verbose && value.length > 0) {
            console.log(`${key} first item:`, value[0]);
          }
        } else {
          console.log(`${key}: Object{${Object.keys(value).join(', ')}}`);
        }
      } else {
        console.log(`${key}: ${typeof value} = ${String(value).substring(0, 50)}`);
      }
    });
  }
  
  // Log the full object if verbose
  if (verbose) {
    console.log('Full object:', obj);
  }
  
  console.groupEnd();
};

/**
 * Validate shared dashboard data structure and log issues
 * @param {Object} data - The data to validate
 * @param {string} label - A label for the validation
 * @returns {boolean} - Whether the data is valid
 */
export const validateSharedDashboardData = (data, label = 'Shared dashboard data validation') => {
  console.group(label);
  
  if (!data) {
    console.error('Data is null or undefined');
    console.groupEnd();
    return false;
  }
  
  let isValid = true;
  const issues = [];
  
  // Check essential properties
  const essentialProps = [
    'salesData', 'filteredData', 'metrics', 'retailerDistribution', 
    'productDistribution', 'brandMapping', 'brandNames'
  ];
  
  essentialProps.forEach(prop => {
    if (!data[prop]) {
      issues.push(`Missing ${prop}`);
      isValid = false;
    } else {
      console.log(`${prop}: ${Array.isArray(data[prop]) ? 'Array[' + data[prop].length + ']' : 'Object'}`);
    }
  });
  
  // Check metrics
  if (data.metrics) {
    if (!data.metrics.totalUnits && data.metrics.totalUnits !== 0) {
      issues.push('metrics.totalUnits is missing');
      isValid = false;
    } else {
      console.log('metrics.totalUnits:', data.metrics.totalUnits);
    }
  }
  
  // Check hasData condition
  const hasData = Boolean(
    (data.metrics && data.metrics.totalUnits > 0) || 
    (data.salesData && data.salesData.length > 0) || 
    (data.filteredData && data.filteredData.length > 0) ||
    (data.retailerDistribution && data.retailerDistribution.length > 0) ||
    (data.productDistribution && data.productDistribution.length > 0)
  );
  
  console.log('hasData check result:', hasData);
  
  if (!hasData) {
    issues.push('hasData check fails - no data available to display');
    isValid = false;
  }
  
  // Log issues
  if (issues.length > 0) {
    console.error('Issues found:', issues);
  } else {
    console.log('No issues found');
  }
  
  console.groupEnd();
  return isValid;
};

export default {
  inspectObject,
  validateSharedDashboardData
};
