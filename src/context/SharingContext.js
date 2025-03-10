import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useData } from './DataContext';
import sharingService from '../services/sharingService';

// Create context
const SharingContext = createContext();

// Custom hook for using this context
export const useSharing = () => useContext(SharingContext);

export const SharingProvider = ({ children }) => {
  const { 
    salesData, 
    activeTab, 
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
  
  // State for sharing configuration
  // IMPORTANT: Initialize previewActiveTab with the current activeTab
  const [previewActiveTab, setPreviewActiveTab] = useState(activeTab || 'summary');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [shareConfig, setShareConfig] = useState({
    allowedTabs: ['summary'], // Default tabs to share
    hideRetailers: false,     // Whether to anonymize retailer names
    hideTotals: false,        // Whether to hide total values
    showOnlyPercent: false,   // Whether to show only percentages
    clientNote: '',           // Optional message to display to client
    expiryDate: null,         // When the share link expires
    branding: {
      showLogo: true,         // Whether to show your company logo
      primaryColor: '#FF0066', // Primary brand color
      companyName: 'Your Company', // Company name to display
    },
    // Filter state tracking
    filters: {
      selectedProducts: ['all'],
      selectedRetailers: ['all'],
      dateRange: 'all',
      startDate: '',
      endDate: '',
      selectedMonth: '',
    },
    // Add precomputed data field
    precomputedData: null
  });

  // Shareable link state
  const [shareableLink, setShareableLink] = useState('');
  
  // State for shared dashboards
  const [sharedDashboards, setSharedDashboards] = useState([]);
  const [loadingSharedDashboards, setLoadingSharedDashboards] = useState(false);
  const [shareError, setShareError] = useState(null);
  
  // Sync previewActiveTab with activeTab when the modal opens
  useEffect(() => {
    if (isShareModalOpen && activeTab) {
      setPreviewActiveTab(activeTab);
      
      // Also ensure the active tab is in allowedTabs
      setShareConfig(prev => {
        if (!prev.allowedTabs.includes(activeTab)) {
          return {
            ...prev,
            allowedTabs: [...prev.allowedTabs, activeTab],
            activeTab: activeTab // Explicitly set activeTab in the config
          };
        }
        return {
          ...prev,
          activeTab: activeTab
        };
      });
      
      console.log("Synced preview active tab with current tab:", activeTab);
    }
  }, [isShareModalOpen, activeTab]);
  
  // When modal opens, also sync with share configuration
  useEffect(() => {
    if (isShareModalOpen) {
      // Sync the activeTab in the config with the current active tab
      setShareConfig(prev => ({
        ...prev,
        activeTab: activeTab || prev.allowedTabs[0] || 'summary'
      }));
    }
  }, [isShareModalOpen, activeTab]);
  
  // Load existing shared dashboards when the component mounts
  useEffect(() => {
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
    
    loadSharedDashboards();
  }, []);

  // Update filters in shareConfig when they change in DataContext
  useEffect(() => {
    // Only update if the modal is open to avoid unnecessary updates
    if (isShareModalOpen) {
      setShareConfig(prev => ({
        ...prev,
        filters: {
          selectedProducts,
          selectedRetailers,
          dateRange,
          startDate,
          endDate,
          selectedMonth,
        }
      }));
    }
  }, [isShareModalOpen, selectedProducts, selectedRetailers, dateRange, startDate, endDate, selectedMonth]);
  
  // Generate a shareable link using Supabase
  const generateShareableLink = useCallback(async () => {
    try {
      // Set loading state if needed
      setShareError(null);
      
      // Create a copy of the current sharing configuration
      const configToShare = { ...shareConfig };
      
      // IMPORTANT: Use the current activeTab from the dashboard if not explicitly set
      // This ensures the shared view matches what the user is seeing
      const currentActiveTab = activeTab || configToShare.activeTab || 'summary';
      
      // Add current active tab if not in allowed tabs
      if (currentActiveTab && !configToShare.allowedTabs.includes(currentActiveTab)) {
        configToShare.allowedTabs = [...configToShare.allowedTabs, currentActiveTab];
      }
      
      // Ensure we have at least one tab
      if (configToShare.allowedTabs.length === 0) {
        configToShare.allowedTabs = ['summary'];
      }
      
      // IMPORTANT: Set the active tab explicitly
      configToShare.activeTab = currentActiveTab;
      
      configToShare.metadata = {
        createdAt: new Date().toISOString(),
        brandNames: brandNames || [],
        clientName: brandNames?.length > 0 ? brandNames.join(', ') : (clientName || 'Client'),
        datasetSize: Array.isArray(salesData) ? salesData.length : 0,
      };
      
      // Add precomputed data for the client view
      configToShare.precomputedData = {
        filteredData: getFilteredData ? getFilteredData(configToShare.filters) : [],
        metrics: calculateMetrics ? calculateMetrics() : null,
        retailerData: getRetailerDistribution ? getRetailerDistribution() : [],
        productDistribution: getProductDistribution ? getProductDistribution() : [],
        brandMapping: brandMapping || {},
        brandNames: brandNames || [],
        salesData: salesData ? salesData.slice(0, 1000) : [] // Include a subset of the data
      };
      
      console.log("Generating share link with config:", {
        activeTab: configToShare.activeTab,
        allowedTabs: configToShare.allowedTabs
      });
      
      // Create the shared dashboard in Supabase
      const { url } = await sharingService.createSharedDashboard(
        configToShare, 
        configToShare.expiryDate ? new Date(configToShare.expiryDate) : null
      );
      
      // Set the shareable URL
      setShareableLink(url);
      
      // Refresh the shared dashboards list
      const dashboards = await sharingService.listSharedDashboards();
      setSharedDashboards(dashboards);
      
      return url;
    } catch (error) {
      console.error("Error generating share link:", error);
      setShareError('Failed to generate share link');
      return "";
    }
  }, [
    shareConfig, 
    activeTab, 
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
      
      // Update the shared dashboards list
      setSharedDashboards(prev => prev.filter(dashboard => dashboard.share_id !== shareId));
      
      return true;
    } catch (error) {
      console.error('Error deleting shared dashboard:', error);
      setShareError('Failed to delete shared dashboard');
      return false;
    }
  }, []);
  
  // Toggle share modal
  const toggleShareModal = useCallback(() => {
    setIsShareModalOpen(prev => !prev);
    
    // If opening the modal, sync the active tab
    if (!isShareModalOpen) {
      setPreviewActiveTab(activeTab || 'summary');
      
      setShareConfig(prev => {
        // Initialize with current active tab
        const newConfig = {
          ...prev,
          activeTab: activeTab || 'summary'
        };
        
        // Make sure activeTab is in allowedTabs
        if (activeTab && !prev.allowedTabs.includes(activeTab)) {
          newConfig.allowedTabs = [...prev.allowedTabs, activeTab];
        }
        
        return newConfig;
      });
    } else {
      // Reset preview mode when closing
      setIsPreviewMode(false);
    }
  }, [isShareModalOpen, activeTab]);

  // Update share configuration
  const updateShareConfig = useCallback((updates) => {
    setShareConfig(prev => {
      const newConfig = {
        ...prev,
        ...updates,
      };
      
      console.log("Updated share config:", newConfig);
      return newConfig;
    });
  }, []);
  
  // Toggle preview mode
  const togglePreviewMode = useCallback(() => {
    // Prepare precomputed data when entering preview mode
    if (!isPreviewMode) {
      // Make sure we have at least one allowed tab
      if (shareConfig.allowedTabs.length === 0) {
        setShareConfig(prev => ({
          ...prev,
          allowedTabs: ['summary']
        }));
      }
      
      // IMPORTANT: First get the current active tab or use first allowed tab
      const currentActiveTab = activeTab || shareConfig.activeTab || (shareConfig.allowedTabs.length > 0 ? shareConfig.allowedTabs[0] : 'summary');
      
      // Make sure the active tab is in allowed tabs
      let updatedConfig = { ...shareConfig };
      if (!updatedConfig.allowedTabs.includes(currentActiveTab)) {
        updatedConfig.allowedTabs = [...updatedConfig.allowedTabs, currentActiveTab];
      }
      
      // Always set the activeTab in the config
      updatedConfig.activeTab = currentActiveTab;
      
      // Also set the preview active tab state
      setPreviewActiveTab(currentActiveTab);
      
      console.log("Setting preview active tab to:", currentActiveTab);
      
      // Precompute data for the preview
      const precomputedData = {
        filteredData: getFilteredData ? getFilteredData(updatedConfig.filters) : [],
        metrics: calculateMetrics ? calculateMetrics() : null, 
        retailerData: getRetailerDistribution ? getRetailerDistribution() : [],
        productDistribution: getProductDistribution ? getProductDistribution() : [],
        salesData: salesData ? salesData.slice(0, 1000) : [], // Include a subset of the data
        brandNames: brandNames || [],
        brandMapping: brandMapping || {}
      };
      
      // Update the share config with precomputed data
      updatedConfig.precomputedData = precomputedData;
      setShareConfig(updatedConfig);
      
      console.log("Entering preview mode with tabs:", {
        allowedTabs: updatedConfig.allowedTabs,
        activeTab: currentActiveTab,
        previewActiveTab: currentActiveTab
      });
    }
    
    setIsPreviewMode(prev => !prev);
  }, [
    isPreviewMode,
    shareConfig,
    activeTab,
    getFilteredData,
    calculateMetrics,
    getRetailerDistribution,
    getProductDistribution,
    salesData,
    brandNames,
    brandMapping
  ]);
  
  // Handle saving current filters
  const handleSaveCurrentFilters = useCallback(() => {
    console.log("Saving current filters to share config:", {
      selectedProducts,
      selectedRetailers,
      dateRange,
      startDate,
      endDate,
      selectedMonth
    });
  
    // First make sure we have the latest values
    const currentFilters = {
      selectedProducts: [...selectedProducts],
      selectedRetailers: [...selectedRetailers],
      dateRange,
      startDate,
      endDate,
      selectedMonth
    };
  
    // Directly update the shareConfig object with a new object
    setShareConfig(prev => {
      const updatedConfig = {
        ...prev,
        filters: currentFilters
      };
      
      console.log("Updated share config filters:", updatedConfig.filters);
      return updatedConfig;
    });
  
    // This is important - force a refresh to show the update was applied
    setTimeout(() => {
      console.log("Current share config filters:", shareConfig.filters);
    }, 100);
  }, [
    selectedProducts, 
    selectedRetailers, 
    dateRange, 
    startDate, 
    endDate, 
    selectedMonth
  ]);
  
  // Transform data for sharing (removes sensitive data based on config)
  const transformDataForSharing = useCallback((data) => {
    if (!data) return null;
    
    try {
      // Create deep copy to avoid modifying original data
      const clientData = JSON.parse(JSON.stringify(data));
      
      // Apply transformations based on share config
      if (shareConfig?.hideRetailers && Array.isArray(clientData.retailerData)) {
        clientData.retailerData = clientData.retailerData.map((item, index) => ({
          ...item,
          name: `Retailer ${index + 1}`
        }));
      }
      
      if (shareConfig?.hideTotals) {
        // Remove total values from metrics
        if (clientData.metrics) {
          if (clientData.metrics.totalUnits) {
            clientData.metrics.totalUnits = '—'; // Replace with em dash
          }
          if (clientData.metrics.totalValue) {
            clientData.metrics.totalValue = '—';
          }
        }
        
        // Remove count values from retailer data
        if (Array.isArray(clientData.retailerData)) {
          clientData.retailerData = clientData.retailerData.map(item => ({
            ...item,
            value: shareConfig?.showOnlyPercent ? '—' : item.value
          }));
        }
        
        // Remove count values from product data
        if (Array.isArray(clientData.productDistribution)) {
          clientData.productDistribution = clientData.productDistribution.map(item => ({
            ...item,
            count: shareConfig?.showOnlyPercent ? '—' : item.count
          }));
        }
      }
      
      // Add shared context for client-specific view
      clientData.isSharedView = true;
      clientData.shareConfig = {
        // Default values if shareConfig is undefined
        allowedTabs: shareConfig?.allowedTabs || ['summary'],
        activeTab: shareConfig?.activeTab || 'summary', // Explicitly include activeTab
        hideRetailers: !!shareConfig?.hideRetailers,
        hideTotals: !!shareConfig?.hideTotals,
        showOnlyPercent: !!shareConfig?.showOnlyPercent,
        branding: shareConfig?.branding || {
          showLogo: true,
          companyName: 'Your Company',
          primaryColor: '#FF0066'
        },
        clientNote: shareConfig?.clientNote || '',
        expiryDate: shareConfig?.expiryDate || null,
      };
      
      return clientData;
    } catch (err) {
      console.error('Error in transformDataForSharing:', err);
      // Return data as-is if there's an error
      return data;
    }
  }, [shareConfig]);
  
  return (
    <SharingContext.Provider value={{
      isShareModalOpen,
      toggleShareModal,
      shareConfig,
      updateShareConfig,
      generateShareableLink,
      shareableLink,
      setShareableLink,
      isPreviewMode,
      togglePreviewMode,
      transformDataForSharing,
      sharedDashboards,
      loadingSharedDashboards,
      deleteSharedDashboard,
      shareError,
      handleSaveCurrentFilters,
      previewActiveTab,
      setPreviewActiveTab
    }}>
      {children}
    </SharingContext.Provider>
  );
};

export default SharingContext;