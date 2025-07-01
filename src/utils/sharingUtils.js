/**
 * Utility functions for data sharing
 */

/**
 * Optimize data for sharing by removing unnecessary fields and limiting data size
 * @param {Array} data - The data array to optimize
 * @param {Object} options - Options for optimization
 * @param {boolean} options.anonymizeRetailers - Whether to anonymize retailer names
 * @param {boolean} options.hideTotals - Whether to hide total values
 * @param {number} options.limit - Maximum number of records to include
 * @param {Array} options.fields - Fields to include in the output
 * @returns {Array} - Optimized data array
 */
export const optimizeDataForSharing = (data, options = {}) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  const {
    anonymizeRetailers = false,
    hideTotals = false,
    limit = 1000,
    fields = null
  } = options;
  
  // Limit the number of records
  const limitedData = data.slice(0, limit);
  
  // Create retailer mapping for consistent anonymization
  const retailerMap = new Map();
  let retailerCounter = 1;
  
  return limitedData.map(item => {
    // Start with an empty object or all fields if no specific fields requested
    const result = fields ? {} : { ...item };
    
    // If specific fields are requested, only include those
    if (fields) {
      fields.forEach(field => {
        if (item[field] !== undefined) {
          result[field] = item[field];
        }
      });
    }
    
    // Anonymize retailer names if requested
    if (anonymizeRetailers && result.chain) {
      if (!retailerMap.has(result.chain)) {
        retailerMap.set(result.chain, `Retailer ${retailerCounter++}`);
      }
      result.chain = retailerMap.get(result.chain);
    }
    
    // Hide monetary values if requested
    if (hideTotals) {
      if (result.receipt_total !== undefined) {
        result.receipt_total = null;
      }
      if (result.value !== undefined) {
        result.value = null;
      }
    }
    
    return result;
  });
};

/**
 * Calculate the approximate size of a JavaScript object in bytes
 * @param {Object} object - The object to measure
 * @returns {number} - Approximate size in bytes
 */
export const getObjectSize = (object) => {
  const objectList = [];
  const stack = [object];
  let bytes = 0;
  
  while (stack.length) {
    const value = stack.pop();
    
    if (typeof value === 'boolean') {
      bytes += 4;
    } else if (typeof value === 'string') {
      bytes += value.length * 2;
    } else if (typeof value === 'number') {
      bytes += 8;
    } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
      objectList.push(value);
      
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          bytes += key.length * 2;
          stack.push(value[key]);
        }
      }
    }
  }
  
  return bytes;
};

/**
 * Check if the data size is within acceptable limits for sharing
 * @param {Object} data - The data to check
 * @param {number} maxSizeInMB - Maximum allowed size in MB
 * @returns {Object} - Result with status and message
 */
export const checkDataSizeForSharing = (data, maxSizeInMB = 5) => {
  const sizeInBytes = getObjectSize(data);
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  return {
    isWithinLimit: sizeInMB <= maxSizeInMB,
    sizeInMB,
    message: sizeInMB <= maxSizeInMB
      ? `Data size is ${sizeInMB.toFixed(2)} MB, which is within the ${maxSizeInMB} MB limit.`
      : `Data size is ${sizeInMB.toFixed(2)} MB, which exceeds the ${maxSizeInMB} MB limit. Please reduce the amount of data being shared.`
  };
};

export default {
  optimizeDataForSharing,
  getObjectSize,
  checkDataSizeForSharing
};
