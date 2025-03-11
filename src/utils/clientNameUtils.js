/**
 * Get the client name with fallbacks from various sources
 * @param {Object} data - Data object that might contain client name
 * @param {string} defaultName - Default name to use if no client name is found
 * @returns {string} - The client name
 */
export const getClientName = (data, defaultName = 'Client') => {
    if (!data) return defaultName;
    
    // Try direct client name property
    if (data.clientName) return data.clientName;
    
    // Try from metadata
    if (data.metadata?.clientName) return data.metadata.clientName;
    
    // Try from precomputedData
    if (data.precomputedData?.clientName) return data.precomputedData.clientName;
    
    // Try from brandNames (joined with commas)
    if (data.brandNames && Array.isArray(data.brandNames) && data.brandNames.length > 0) {
      return data.brandNames.join(', ');
    }
    
    // Try from precomputedData.brandNames
    if (data.precomputedData?.brandNames && 
        Array.isArray(data.precomputedData.brandNames) && 
        data.precomputedData.brandNames.length > 0) {
      return data.precomputedData.brandNames.join(', ');
    }
    
    // Finally, return the default
    return defaultName;
  };
  
  /**
   * Format the client name for display in dashboard headings
   * @param {Object} data - Data object that might contain client name
   * @param {boolean} includeWord - Whether to include the word "Dashboard" after the name
   * @returns {string} - Formatted client name
   */
  export const formatClientNameForDisplay = (data, includeWord = true) => {
    const clientName = getClientName(data);
    return includeWord ? `${clientName} Dashboard` : clientName;
  };
  
  /**
   * Extract brand name from a product name string
   * @param {string} productName - Full product name 
   * @returns {string} - The extracted brand name
   */
  export const extractBrandFromProduct = (productName) => {
    if (!productName) return '';
    
    const words = productName.split(' ');
    if (words.length >= 3) {
      // For longer product names, first 1-2 words might be the brand
      const wordsToExtract = words.length >= 5 ? 2 : 1;
      return words.slice(0, wordsToExtract).join(' ');
    }
    
    return '';
  };