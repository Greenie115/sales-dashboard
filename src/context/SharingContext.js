import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useData } from './DataContext';
import { useFilter } from './FilterContext';
import sharingService from '../services/sharingService';
import { optimizeDataForSharing, checkDataSizeForSharing } from '../utils/sharingUtils';

// Create context
const SharingContext = createContext();

// Custom hook for using this context
export const useSharing = () => useContext(SharingContext);

export const SharingProvider = ({ children }) => {
  // Get data-related values from DataContext
  const dataContext = useData();
  const {
    salesData,
    activeTab,
    brandNames,
    clientName,
    brandMapping
  } = dataContext;

  // Get filter-related values from FilterContext
  const filterContext = useFilter();
  const {
    selectedProducts,
    selectedRetailers,
    dateRange,
    startDate,
    endDate,
    selectedMonth,
    getFilteredData,
    calculateMetrics,
    getRetailerDistribution,
    getProductDistribution
  } = filterContext;

  // UI State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [shareError, setShareError] = useState(null);

  // Share Configuration - Single Source of Truth
  const [shareConfig, setShareConfig] = useState({
    allowedTabs: ['summary'],
    activeTab: 'summary',
    hideRetailers: false,
    hideTotals: false,
    showOnlyPercent: false,
    clientNote: '',
    expiryDate: null,
    branding: {
      showLogo: true,
      primaryColor: '#FF0066',
      companyName: 'Shopmium Insights',
    },
    filters: {
      selectedProducts: ['all'],
      selectedRetailers: ['all'],
      dateRange: 'all',
      startDate: '',
      endDate: '',
      selectedMonth: '',
    },
    customExcludedDates: [],
    hiddenCharts: [],
    precomputedData: null
  });

  // Shared dashboards list
  const [sharedDashboards, setSharedDashboards] = useState([]);
  const [loadingSharedDashboards, setLoadingSharedDashboards] = useState(false);

  // Initialize share config when modal opens
  useEffect(() => {
    if (isShareModalOpen) {
      const mainTab = activeTab || 'summary';

      setShareConfig(prev => ({
        ...prev,
        activeTab: mainTab,
        allowedTabs: prev.allowedTabs.includes(mainTab)
          ? prev.allowedTabs
          : [...prev.allowedTabs, mainTab]
      }));
    }
  }, [isShareModalOpen, activeTab]);

  // Load shared dashboards from the server
  useEffect(() => {
    if (isShareModalOpen) {
      loadSharedDashboards();
    }
  }, [isShareModalOpen]);

  // Load shared dashboards
  const loadSharedDashboards = async () => {
    setLoadingSharedDashboards(true);
    try {
      const dashboards = await sharingService.listSharedDashboards();
      setSharedDashboards(dashboards);
      setShareError(null);
    } catch (error) {
      console.error('Error loading shared dashboards:', error);
      setShareError('Failed to load shared dashboards');
    } finally {
      setLoadingSharedDashboards(false);
    }
  };

  // Update share config - maintain immutability and stable references
  const updateShareConfig = useCallback((updates) => {
    setShareConfig(prev => {
      // Create a new config object
      const newConfig = { ...prev };

      // Update top-level properties
      Object.keys(updates).forEach(key => {
        // Handle nested objects specially
        if (key === 'filters' && updates.filters) {
          newConfig.filters = { ...prev.filters, ...updates.filters };
        } else if (key === 'branding' && updates.branding) {
          newConfig.branding = { ...prev.branding, ...updates.branding };
        } else {
          // Update normal properties
          newConfig[key] = updates[key];
        }
      });

      return newConfig;
    });
  }, []);

  // Clear visible error
  const clearError = useCallback(() => {
    setShareError(null);
  }, []);

  // Toggle share modal
  const toggleShareModal = useCallback(() => {
    setIsShareModalOpen(prev => !prev);
    if (isShareModalOpen) {
      setIsPreviewMode(false);
    }
  }, [isShareModalOpen]);

  // Save current filters from FilterContext
  const saveCurrentFilters = useCallback(() => {
    // Ensure selectedProducts and selectedRetailers are arrays before spreading
    const productsArray = Array.isArray(selectedProducts) ? selectedProducts : ['all'];
    const retailersArray = Array.isArray(selectedRetailers) ? selectedRetailers : ['all'];

    console.log('Saving current filters:', {
      products: productsArray,
      retailers: retailersArray,
      dateRange,
      startDate,
      endDate,
      selectedMonth
    });

    updateShareConfig({
      filters: {
        selectedProducts: [...productsArray],
        selectedRetailers: [...retailersArray],
        dateRange: dateRange || 'all',
        startDate: startDate || '',
        endDate: endDate || '',
        selectedMonth: selectedMonth || ''
      }
    });
  }, [
    updateShareConfig,
    selectedProducts,
    selectedRetailers,
    dateRange,
    startDate,
    endDate,
    selectedMonth
  ]);

  // Generate shareable link - recompute data for the dashboard
  const generateShareableLink = useCallback(async () => {
    try {
      setShareError(null);
      console.log('Generating shareable link...');

      // Validate that we have data to share
      if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
        throw new Error('No sales data available to share');
      }

      // Create deep copy of the share config to avoid reference issues
      const configToShare = JSON.parse(JSON.stringify(shareConfig));

      // Ensure we have at least one tab
      if (!configToShare.allowedTabs || !Array.isArray(configToShare.allowedTabs) || configToShare.allowedTabs.length === 0) {
        console.warn('No allowed tabs specified, defaulting to summary tab');
        configToShare.allowedTabs = ['summary'];
      }

      // Ensure active tab is in allowed tabs
      if (!configToShare.activeTab || !configToShare.allowedTabs.includes(configToShare.activeTab)) {
        console.warn('Active tab not in allowed tabs, defaulting to first allowed tab');
        configToShare.activeTab = configToShare.allowedTabs[0];
      }

      // Add metadata
      configToShare.metadata = {
        createdAt: new Date().toISOString(),
        brandNames: brandNames || [],
        clientName: configToShare.clientName || clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client'),
        datasetSize: Array.isArray(salesData) ? salesData.length : 0,
      };

      console.log('Share config prepared:', configToShare);

      // Ensure we have filter functions
      if (!getFilteredData) {
        throw new Error('Data filtering function is not available');
      }

      // Get filtered data based on the share configuration
      const filteredData = getFilteredData(configToShare.filters);

      if (!filteredData || !Array.isArray(filteredData)) {
        throw new Error('Failed to filter data for sharing');
      }

      console.log(`Filtered data for sharing: ${filteredData.length} records`);

      // Calculate metrics based on filtered data
      const metrics = calculateMetrics ?
        calculateMetrics(filteredData) : null;

      if (!metrics) {
        console.warn('No metrics calculated for sharing');
      }

      // Get retailer distribution based on filtered data
      const retailerData = getRetailerDistribution ?
        getRetailerDistribution(filteredData) : [];

      // Get product distribution based on filtered data
      const productData = getProductDistribution ?
        getProductDistribution(filteredData, brandMapping || {}) : [];

      // Apply transformations based on share config
      // Hide retailer names if configured
      let processedRetailerData = retailerData;
      if (configToShare.hideRetailers) {
        processedRetailerData = retailerData.map((item, index) => ({
          ...item,
          name: `Retailer ${index + 1}`
        }));
      }

      // Hide totals if configured
      let processedMetrics = metrics;
      if (configToShare.hideTotals && metrics) {
        processedMetrics = {
          ...metrics,
          totalUnits: configToShare.showOnlyPercent ? '—' : metrics?.totalUnits,
          totalValue: configToShare.showOnlyPercent ? '—' : metrics?.totalValue
        };
      }

      // Precompute data for the client view - only include what's necessary
      configToShare.precomputedData = {
        metrics: processedMetrics,
        retailerData: processedRetailerData,
        productDistribution: productData,
        brandMapping: brandMapping || {},
        brandNames: brandNames || [],
        clientName: configToShare.clientName || clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client'),
      };

      // Only include filtered data if absolutely necessary and optimize it
      if (configToShare.allowedTabs.includes('sales') || configToShare.allowedTabs.includes('demographics')) {
        try {
          // Use our utility function to optimize the data for sharing
          const optimizedData = optimizeDataForSharing(filteredData, {
            anonymizeRetailers: configToShare.hideRetailers,
            hideTotals: configToShare.hideTotals,
            limit: 1000,
            fields: ['receipt_date', 'month', 'day_of_week', 'hour_of_day', 'chain', 'product_name']
          });

          // Check if the data size is within acceptable limits
          const sizeCheck = checkDataSizeForSharing(optimizedData, 5); // 5MB limit

          if (!sizeCheck.isWithinLimit) {
            console.warn(sizeCheck.message);
            // Further reduce the data if it's too large
            const reducedData = optimizeDataForSharing(filteredData, {
              anonymizeRetailers: configToShare.hideRetailers,
              hideTotals: configToShare.hideTotals,
              limit: 500, // Reduce limit to 500 records
              fields: ['receipt_date', 'month', 'day_of_week', 'chain', 'product_name'] // Remove hour_of_day
            });
            configToShare.precomputedData.filteredData = reducedData;
          } else {
            configToShare.precomputedData.filteredData = optimizedData;
          }

          console.log(`Optimized data for sharing: ${configToShare.precomputedData.filteredData.length} records`);
        } catch (optimizationError) {
          console.error('Error optimizing data for sharing:', optimizationError);
          // Fallback to a smaller subset of data
          configToShare.precomputedData.filteredData = filteredData.slice(0, 200);
          console.log('Using fallback data subset for sharing');
        }
      }

      console.log('Prepared data for sharing, creating dashboard in Supabase...');

      // Create the shared dashboard in database
      const { url } = await sharingService.createSharedDashboard(
        configToShare,
        configToShare.expiryDate ? new Date(configToShare.expiryDate) : null
      );

      if (!url) {
        throw new Error('Failed to get share URL from service');
      }

      console.log('Dashboard created successfully, URL:', url);
      setShareableLink(url);
      await loadSharedDashboards();

      return url;
    } catch (error) {
      console.error("Error generating share link:", error);
      setShareError('Failed to generate share link: ' + error.message);
      return "";
    }
  }, [
    shareConfig,
    brandNames,
    clientName,
    salesData,
    getFilteredData,
    calculateMetrics,
    getRetailerDistribution,
    getProductDistribution,
    brandMapping
  ]);

  // Delete a shared dashboard
  const deleteSharedDashboard = useCallback(async (shareId) => {
    try {
      setShareError(null);
      await sharingService.deleteSharedDashboard(shareId);
      setSharedDashboards(prev =>
        prev.filter(dashboard => dashboard.share_id !== shareId)
      );
      return true;
    } catch (error) {
      console.error('Error deleting shared dashboard:', error);
      setShareError('Failed to delete shared dashboard');
      return false;
    }
  }, []);
  /**
   * Transform data for client sharing view based on share configuration
   * This function applies privacy and display transformations to the data
   */
  const transformDataForSharing = useCallback((data) => {
    if (!data) return data;

    try {
      console.log('Transforming data for sharing...');

      // Create deep copy to avoid modifying original data
      const clientData = JSON.parse(JSON.stringify(data));
      const config = clientData.shareConfig || shareConfig;

      // Apply transformations based on share config
      // 1. Handle retailer anonymization
      if (config.hideRetailers) {
        console.log('Anonymizing retailer data...');

        // Anonymize retailer distribution data
        if (Array.isArray(clientData.retailerData)) {
          clientData.retailerData = clientData.retailerData.map((item, index) => ({
            ...item,
            name: `Retailer ${index + 1}`
          }));
        }

        // Anonymize retailer names in filtered data
        if (Array.isArray(clientData.filteredData)) {
          const retailerMap = new Map(); // Map to consistently use the same anonymized name
          let retailerCounter = 1;

          clientData.filteredData = clientData.filteredData.map(item => {
            if (!item.chain) return item;

            // Get or create anonymized retailer name
            if (!retailerMap.has(item.chain)) {
              retailerMap.set(item.chain, `Retailer ${retailerCounter++}`);
            }

            return {
              ...item,
              chain: retailerMap.get(item.chain)
            };
          });
        }
      }

      // 2. Handle hiding totals and values
      if (config.hideTotals) {
        console.log('Hiding total values...');

        // Remove total values from metrics
        if (clientData.metrics) {
          if (clientData.metrics.totalUnits) {
            clientData.metrics.totalUnits = '—';
          }
          if (clientData.metrics.totalValue) {
            clientData.metrics.totalValue = '—';
          }
        }

        // Remove count values if showOnlyPercent is true
        if (config.showOnlyPercent) {
          console.log('Showing only percentages...');

          // Hide absolute values in retailer data
          if (Array.isArray(clientData.retailerData)) {
            clientData.retailerData = clientData.retailerData.map(item => ({
              ...item,
              value: '—'
            }));
          }

          // Hide absolute values in product distribution
          if (Array.isArray(clientData.productDistribution)) {
            clientData.productDistribution = clientData.productDistribution.map(item => ({
              ...item,
              count: '—',
              value: '—'
            }));
          }

          // Hide absolute values in trend data
          if (Array.isArray(clientData.trendData)) {
            clientData.trendData = clientData.trendData.map(item => ({
              ...item,
              count: item.percentage ? item.percentage : item.count,
              value: '—'
            }));
          }
        }
      }

      // 3. Handle hidden charts
      if (config.hiddenCharts && Array.isArray(config.hiddenCharts)) {
        // Make sure we're using a new array to avoid reference issues
        clientData.hiddenCharts = [...config.hiddenCharts];
        console.log("Setting hidden charts in client data:", clientData.hiddenCharts);
      } else {
        // Initialize with empty array if missing
        clientData.hiddenCharts = [];
      }

      // 4. Apply date exclusions to time trend data
      if (Array.isArray(clientData.trendData) && clientData.trendData.length > 0 &&
          Array.isArray(config.customExcludedDates) && config.customExcludedDates.length > 0) {

        console.log('Applying date exclusions to trend data...');

        // Create a Set of dates to exclude for efficient lookup
        const excludeDates = new Set(config.customExcludedDates);

        // Filter out excluded dates from trend data
        clientData.trendData = clientData.trendData.filter(item => {
          return !excludeDates.has(item.date);
        });
      }

      // 5. Ensure we're not sending unnecessary data
      // Remove raw data if not needed
      if (!config.allowedTabs.includes('sales') && !config.allowedTabs.includes('demographics')) {
        delete clientData.filteredData;
      }

      console.log('Data transformation complete');
      return clientData;
    } catch (err) {
      console.error('Error in transformDataForSharing:', err);
      return data;
    }
  }, [shareConfig]);

  // Set active tab in share config
  const setShareActiveTab = useCallback((tab) => {
    if (tab && shareConfig.allowedTabs.includes(tab)) {
      updateShareConfig({ activeTab: tab });
    }
  }, [shareConfig.allowedTabs, updateShareConfig]);

  // Update allowed tabs in share config
  const setShareAllowedTabs = useCallback((tabs) => {
    if (Array.isArray(tabs) && tabs.length > 0) {
      const newConfig = { allowedTabs: tabs };

      // If current active tab isn't in the new allowed tabs, update it
      if (!tabs.includes(shareConfig.activeTab)) {
        newConfig.activeTab = tabs[0];
      }

      updateShareConfig(newConfig);
    }
  }, [shareConfig.activeTab, updateShareConfig]);

  // Create preview data for SharedDashboardPreview
  const getPreviewData = useCallback(() => {
    // Create a copy of the current shareConfig
    const previewConfig = { ...shareConfig };

    // Add precomputed data for the preview if it doesn't exist
    if (!previewConfig.precomputedData) {
      previewConfig.precomputedData = {
        filteredData: getFilteredData ?
          getFilteredData(previewConfig.filters) : [],
        metrics: calculateMetrics ?
          calculateMetrics() : null,
        retailerData: getRetailerDistribution ?
          getRetailerDistribution() : [],
        productDistribution: getProductDistribution ?
          getProductDistribution() : [],
        salesData: salesData ?
          salesData.slice(0, 1000) : [],
        brandNames: brandNames || [],
        brandMapping: brandMapping || {}
      };
    }

    return previewConfig;
  }, [
    shareConfig,
    getFilteredData,
    calculateMetrics,
    getRetailerDistribution,
    getProductDistribution,
    salesData,
    brandNames,
    brandMapping
  ]);

  // Provide value to consumers
  const value = {
    // UI State
    isShareModalOpen,
    isPreviewMode,
    shareableLink,
    shareError,
    sharedDashboards,
    loadingSharedDashboards,

    // Share configuration
    shareConfig,

    // Actions
    toggleShareModal,
    setIsPreviewMode,
    setShareableLink,
    generateShareableLink,
    deleteSharedDashboard,
    updateShareConfig,
    setShareActiveTab,
    setShareAllowedTabs,
    saveCurrentFilters,
    clearError,

    // Helper methods
    transformDataForSharing,
    getPreviewData
  };

  return (
    <SharingContext.Provider value={value}>
      {children}
    </SharingContext.Provider>
  );
};

export default SharingContext;