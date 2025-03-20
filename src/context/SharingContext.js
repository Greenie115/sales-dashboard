import React, { createContext, useState, useContext, useEffect } from 'react';
import sharingService from '../services/sharingService';
import { useData } from './DataContext';

// Create the context
const SharingContext = createContext();

// Custom hook to use the sharing context
export const useSharing = () => useContext(SharingContext);

export const SharingProvider = ({ children }) => {
  // State for sharing functionality
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareConfig, setShareConfig] = useState({
    allowedTabs: ['summary'],
    activeTab: 'summary',
    filters: {},
    branding: {
      companyName: 'Insights Dashboard',
      primaryColor: '#FF0066',
      showLogo: true
    },
    clientNote: '',
    expiryDate: '',
    customExcludedDates: [],
    hiddenCharts: []
  });
  const [shareableLink, setShareableLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [loadingSharedDashboards, setLoadingSharedDashboards] = useState(false);
  const [sharedDashboards, setSharedDashboards] = useState([]);
  const [shareError, setShareError] = useState(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Get data context
  const { 
    salesData, 
    brandNames, 
    clientName,
    brandMapping,
    getFilteredData,
    calculateMetrics,
    getRetailerDistribution,
    getProductDistribution,
    selectedProducts,
    selectedRetailers,
    dateRange,
    startDate,
    endDate,
    selectedMonth
  } = useData();

  // Toggle share modal
  const toggleShareModal = () => {
    setIsShareModalOpen(!isShareModalOpen);
    // Reset link and errors when toggling
    if (!isShareModalOpen) {
      setShareableLink('');
      setShareError(null);
    }
  };

  // Set active tab for sharing
  const setShareActiveTab = (tab) => {
    setShareConfig(prev => ({ ...prev, activeTab: tab }));
  };

  // Set allowed tabs for sharing
  const setShareAllowedTabs = (tabs) => {
    setShareConfig(prev => ({ ...prev, allowedTabs: tabs }));
  };

  // Update share configuration
  const updateShareConfig = (updates) => {
    setShareConfig(prev => ({ ...prev, ...updates }));
  };

  // Save current filters to share config
  const saveCurrentFilters = () => {
    setShareConfig(prev => ({
      ...prev,
      filters: {
        selectedProducts,
        selectedRetailers,
        dateRange,
        startDate,
        endDate,
        selectedMonth
      }
    }));
  };

  // Get enhanced preview data with all necessary information
  const getEnhancedPreviewData = () => {
    // Get the base preview data
    const previewData = { ...shareConfig };
    
    // Add metadata if it doesn't exist
    if (!previewData.metadata) {
      previewData.metadata = {
        clientName: clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client'),
        brandNames: brandNames || [],
        datasetSize: Array.isArray(salesData) ? salesData.length : 0,
        createdAt: new Date().toISOString()
      };
    } else {
      // Update metadata fields if missing
      previewData.metadata.clientName = previewData.metadata.clientName || 
        clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client');
      previewData.metadata.brandNames = previewData.metadata.brandNames || brandNames || [];
      previewData.metadata.datasetSize = previewData.metadata.datasetSize || 
        (Array.isArray(salesData) ? salesData.length : 0);
    }
    
    // Ensure we have precomputed data
    if (!previewData.precomputedData) {
      console.log("Creating new precomputed data for preview");
      
      // Get filtered data based on the current filters
      const filteredSalesData = getFilteredData ? 
        getFilteredData(previewData.filters) : (salesData || []);
      
      // Calculate metrics
      const calculatedMetrics = calculateMetrics ? 
        calculateMetrics() : null;
      
      // Create the precomputed data
      previewData.precomputedData = {
        // Include data
        filteredData: filteredSalesData,
        salesData: salesData ? 
          salesData.slice(0, Math.min(5000, salesData.length)) : [],
        
        // Include calculated metrics and distributions
        metrics: calculatedMetrics,
        retailerData: getRetailerDistribution ? 
          getRetailerDistribution() : [],
        productDistribution: getProductDistribution ? 
          getProductDistribution() : [],
        
        // Include brand and client information
        brandNames: brandNames || [],
        clientName: clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client'),
        brandMapping: brandMapping || {},
        
        // Set flags
        isSharedView: true,
        hiddenCharts: shareConfig.hiddenCharts || []
      };
      
      console.log("Created precomputed data:", previewData.precomputedData);
    }
    
    return previewData;
  };

  // Generate a fallback link using Base64 encoding
  const generateFallbackLink = () => {
    try {
      console.log("Generating fallback link");
      
      // Create a copy of the current sharing configuration
      const configToShare = JSON.parse(JSON.stringify(shareConfig));

      // Ensure we have an active tab that's in the allowed tabs
      if (!configToShare.allowedTabs || !Array.isArray(configToShare.allowedTabs) || configToShare.allowedTabs.length === 0) {
        configToShare.allowedTabs = ['summary'];
      }
      
      if (!configToShare.activeTab || !configToShare.allowedTabs.includes(configToShare.activeTab)) {
        configToShare.activeTab = configToShare.allowedTabs[0];
      }

      // Add metadata
      configToShare.metadata = {
        createdAt: new Date().toISOString(),
        brandNames: brandNames || [],
        clientName: clientName || 'Client',
        datasetSize: Array.isArray(salesData) ? salesData.length : 0,
      };

      // Process sales data for sharing
      const processSalesDataForSharing = (data) => {
        if (!data || !Array.isArray(data) || data.length === 0) return [];
        
        console.log(`Processing ${data.length} rows for sharing`);
        
        // If data is small enough, use it directly (up to 500 rows)
        if (data.length <= 500) {
          return data;
        }
        
        // For larger datasets, use a combination of sampling and aggregation
        let processedData = [];
        
        try {
          // Take a representative sample (first 300 rows)
          processedData = data.slice(0, 300);
          console.log(`Created sample with ${processedData.length} rows`);
          return processedData;
        } catch (err) {
          console.error("Error processing sales data for sharing:", err);
          // Fallback to simple slicing
          return data.slice(0, 200);
        }
      };

      // Get data to include
      let filteredData = [];
      try {
        filteredData = getFilteredData ? getFilteredData(configToShare.filters) : [];
      } catch (err) {
        console.error("Error getting filtered data:", err);
        filteredData = salesData ? salesData.slice(0, 200) : [];
      }
      
      // Process data for sharing
      const processedSalesData = processSalesDataForSharing(salesData || []);
      const processedFilteredData = processSalesDataForSharing(filteredData);

      // Add precomputed data
      configToShare.precomputedData = {
        filteredData: processedFilteredData,
        salesData: processedSalesData,
        metrics: calculateMetrics ? calculateMetrics() : null,
        retailerData: getRetailerDistribution ? getRetailerDistribution() : [],
        productDistribution: getProductDistribution ? getProductDistribution() : [],
        brandMapping: brandMapping || {},
        brandNames: brandNames || [],
        clientName: clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client'),
        isSharedView: true,
        hiddenCharts: configToShare.hiddenCharts || []
      };

      // Generate share ID using Base64 encoding
      const shareId = btoa(JSON.stringify(configToShare)).replace(/=/g, '');

      // Create shareable URL
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/#/shared/${shareId}`;

      setShareableLink(shareUrl);
      return shareUrl;
    } catch (error) {
      console.error("Error generating fallback link:", error);
      setShareError("Failed to generate shareable link. Try reducing your dataset size.");
      return "";
    }
  };

  // Generate a shareable link
  const generateShareableLink = async () => {
    setIsGeneratingLink(true);
    setShareError(null);
    
    try {
      // Save current filters
      saveCurrentFilters();
      
      // Get enhanced preview data
      const enhancedConfig = getEnhancedPreviewData();
      
      // Show a message for large data
      const configSize = JSON.stringify(enhancedConfig).length;
      console.log(`Config size: ${(configSize / 1024).toFixed(2)} KB`);
      
      if (configSize > 1024 * 1024) {
        console.log("Large dataset detected, this may take a moment...");
      }
      
      try {
        // Try to create shared dashboard in Supabase
        console.log("Attempting to create shared dashboard in Supabase");
        const result = await sharingService.createSharedDashboard(enhancedConfig);
        
        if (!result || !result.share_id) {
          throw new Error("Invalid response from createSharedDashboard");
        }
        
        // Generate share URL
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/#/shared/${result.share_id}`;
        
        console.log("Successfully created shared dashboard with Supabase");
        setShareableLink(shareUrl);
        return shareUrl;
      } catch (error) {
        console.error("Error with Supabase:", error);
        
        // Check if we should switch to fallback mode
        if (error.message === "TIMEOUT_SWITCH_TO_FALLBACK" || 
            error.code === '57014' || 
            (error.message && error.message.includes('timeout'))) {
          console.log("Supabase timeout detected, switching to fallback mode");
          
          // Automatically switch to fallback mode
          setFallbackMode(true);
          return generateFallbackLink();
        }
        
        // For other errors, rethrow
        throw error;
      }
    } catch (error) {
      console.error("Error generating shareable link:", error);
      setShareError(error.message || "Failed to generate shareable link");
      
      // Always try fallback mode as a last resort
      console.log("Attempting fallback mode as last resort");
      try {
        setFallbackMode(true);
        const fallbackUrl = generateFallbackLink();
        return fallbackUrl;
      } catch (fallbackError) {
        console.error("Fallback mode also failed:", fallbackError);
        setShareError("All sharing methods failed. Try reducing your dataset size.");
        throw error; // Throw the original error
      }
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Load shared dashboards
  const loadSharedDashboards = async () => {
    try {
      setLoadingSharedDashboards(true);
      setShareError(null);
      
      const dashboards = await sharingService.listSharedDashboards();
      setSharedDashboards(dashboards);
    } catch (error) {
      console.error("Error loading shared dashboards:", error);
      setShareError("Failed to load shared dashboards");
    } finally {
      setLoadingSharedDashboards(false);
    }
  };

  // Delete a shared dashboard
  const deleteSharedDashboard = async (shareId) => {
    try {
      setShareError(null);
      await sharingService.deleteSharedDashboard(shareId);
      
      // Refresh the list
      await loadSharedDashboards();
      return true;
    } catch (error) {
      console.error("Error deleting shared dashboard:", error);
      setShareError("Failed to delete shared dashboard");
      return false;
    }
  };

  // Transform data for sharing (can be customized for specific visualizations)
  const transformDataForSharing = (data) => {
    // You can add custom transformations here
    return data;
  };

  // Load dashboards on first render
  useEffect(() => {
    if (isShareModalOpen) {
      loadSharedDashboards();
    }
  }, [isShareModalOpen]);

  // Create the context value
  const contextValue = {
    isShareModalOpen,
    toggleShareModal,
    shareConfig,
    setShareConfig: updateShareConfig,
    setShareActiveTab,
    setShareAllowedTabs,
    shareableLink,
    setShareableLink,
    isGeneratingLink,
    isPreviewMode,
    setIsPreviewMode,
    fallbackMode,
    setFallbackMode,
    generateShareableLink,
    saveCurrentFilters,
    getPreviewData: getEnhancedPreviewData,
    transformDataForSharing,
    sharedDashboards,
    loadingSharedDashboards,
    loadSharedDashboards,
    deleteSharedDashboard,
    shareError,
    generateFallbackLink
  };

  return (
    <SharingContext.Provider value={contextValue}>
      {children}
    </SharingContext.Provider>
  );
};

export default SharingContext;