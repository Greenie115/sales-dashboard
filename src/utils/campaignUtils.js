import uniq from 'lodash/uniq';

/**
 * Utility functions for handling multiple campaign data sources
 */

/**
 * Gets the appropriate dataset based on comparison settings and available campaigns
 * @param {Object} options - Configuration object
 * @param {Object} options.campaigns - Campaigns data structure
 * @param {Object} options.comparisonSettings - Comparison mode settings
 * @param {boolean} options.canCompare - Whether comparison is available
 * @param {Array} options.fallbackData - Fallback data (legacy salesData)
 * @returns {Array} Combined or single campaign dataset
 */
export const getCombinedCampaignData = ({ 
  campaigns, 
  comparisonSettings, 
  canCompare, 
  fallbackData = [] 
}) => {
  // If we're in comparison mode and have both campaigns, combine their data
  if (comparisonSettings?.mode === 'campaigns' && canCompare && campaigns?.A?.data && campaigns?.B?.data) {
    return [
      ...campaigns.A.data,
      ...campaigns.B.data
    ];
  }
  
  // If we're in yearly comparison mode, also combine both datasets
  if (comparisonSettings?.mode === 'yearly' && canCompare && campaigns?.A?.data && campaigns?.B?.data) {
    return [
      ...campaigns.A.data,
      ...campaigns.B.data
    ];
  }
  
  // For single mode or when only one campaign exists, use the primary dataset
  if (comparisonSettings?.mode === 'single' || !canCompare) {
    // Use the active dataset or fall back to legacy data
    const primaryCampaign = comparisonSettings?.primaryDataset || 'A';
    return campaigns?.[primaryCampaign]?.data || fallbackData;
  }
  
  // Default fallback
  return fallbackData;
};

/**
 * Extracts unique products from the combined campaign dataset
 * @param {Array} campaignData - Combined campaign data
 * @returns {Array} Sorted array of unique product names
 */
export const getUniqueProducts = (campaignData) => {
  if (!Array.isArray(campaignData)) return [];
  
  return uniq(campaignData.map(item => item.product_name || ''))
    .filter(Boolean)
    .sort();
};

/**
 * Extracts unique retailers from the combined campaign dataset
 * @param {Array} campaignData - Combined campaign data
 * @returns {Array} Sorted array of unique retailer names
 */
export const getUniqueRetailers = (campaignData) => {
  if (!Array.isArray(campaignData)) return [];
  
  return uniq(campaignData.map(item => item.chain || ''))
    .filter(Boolean)
    .sort();
};


/**
 * Gets available months from the combined dataset
 * @param {Array} campaignData - Combined campaign data
 * @returns {Array} Sorted array of unique months
 */
export const getAvailableMonths = (campaignData) => {
  if (!Array.isArray(campaignData)) return [];
  
  return uniq(campaignData.map(item => item.month))
    .filter(Boolean)
    .sort();
};

/**
 * Determines if we should show combined data in filters
 * @param {Object} comparisonSettings - Comparison mode settings
 * @param {boolean} canCompare - Whether comparison is available
 * @returns {boolean} Whether to combine data from both campaigns
 */
export const shouldCombineDataForFilters = (comparisonSettings, canCompare) => {
  return (comparisonSettings?.mode === 'campaigns' || comparisonSettings?.mode === 'yearly') && canCompare;
};