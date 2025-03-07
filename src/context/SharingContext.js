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
  const [previewActiveTab, setPreviewActiveTab] = useState('summary');
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
      
      // Add current active tab if not in allowed tabs
      if (activeTab && !configToShare.allowedTabs.includes(activeTab)) {
        configToShare.allowedTabs = [...configToShare.allowedTabs, activeTab];
      }
      
      // Ensure we have at least one tab
      if (configToShare.allowedTabs.length === 0) {
        configToShare.allowedTabs = ['summary'];
      }
      
      // Set the active tab as the first allowed tab
      configToShare.activeTab = activeTab || configToShare.allowedTabs[0];
      
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
        salesData: salesData ? salesData.slice(0, 1000) : [] // Include a subset of the data
      };
      
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
    getProductDistribution
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
    // Reset preview mode when closing
    if (isShareModalOpen) {
      setIsPreviewMode(false);
    }
  }, [isShareModalOpen]);

  // Update share configuration
  const updateShareConfig = useCallback((updates) => {
    setShareConfig(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);
  
  // Toggle preview mode
  const togglePreviewMode = useCallback(() => {
    // Prepare precomputed data when entering preview mode
    if (!isPreviewMode) {
      // First ensure that activeTab is included in allowedTabs
      if (activeTab && !shareConfig.allowedTabs.includes(activeTab)) {
        setShareConfig(prev => ({
          ...prev,
          allowedTabs: [...prev.allowedTabs, activeTab],
          activeTab: activeTab
        }));
        
        // Set the preview active tab
        setPreviewActiveTab(activeTab);
      } else if (shareConfig.allowedTabs.length > 0) {
        // Use the first allowed tab if active tab is not in allowed tabs
        setPreviewActiveTab(shareConfig.allowedTabs[0]);
      }
      
      const precomputedData = {
        filteredData: getFilteredData ? getFilteredData(shareConfig.filters) : [],
        metrics: calculateMetrics ? calculateMetrics() : null, 
        retailerData: getRetailerDistribution ? getRetailerDistribution() : [],
        productDistribution: getProductDistribution ? getProductDistribution() : [],
        salesData: salesData ? salesData.slice(0, 1000) : [] // Include a subset of the data
      };
      
      // Update the share config with precomputed data and active tab
      setShareConfig(prev => ({
        ...prev,
        precomputedData,
        activeTab: activeTab // Ensure active tab is set
      }));
      
      console.log("Entering preview mode with tabs:", {
        activeTab,
        allowedTabs: shareConfig.allowedTabs,
        previewActiveTab
      });
    }
    
    setIsPreviewMode(prev => !prev);
  }, [
    isPreviewMode,
    activeTab,
    shareConfig.allowedTabs,
    shareConfig.filters,
    getFilteredData,
    calculateMetrics,
    getRetailerDistribution,
    getProductDistribution,
    salesData,
    previewActiveTab
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
      setPreviewActiveTab // Make this available in the context
    }}>
      {children}
    </SharingContext.Provider>
  );
};

export default SharingContext;