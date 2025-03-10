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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [shareConfig, setShareConfig] = useState({
    allowedTabs: ['summary'], // Default tabs to share
    activeTab: 'summary',
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

  // Generate a shareable link using Supabase
  const generateShareableLink = useCallback(async () => {
    try {
      // Set loading state if needed
      setShareError(null);
      
      // Create a copy of the current sharing configuration
      const configToShare = { ...shareConfig };
      
      // Ensure we have at least one tab
      if (configToShare.allowedTabs.length === 0) {
        configToShare.allowedTabs = ['summary'];
      }
      
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
    
    // Reset preview mode when closing
    if (isShareModalOpen) {
      setIsPreviewMode(false);
    }
  }, [isShareModalOpen]);

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
  
  return (
    <SharingContext.Provider value={{
      isShareModalOpen,
      toggleShareModal,
      shareConfig,
      setShareConfig,
      generateShareableLink,
      shareableLink,
      setShareableLink,
      isPreviewMode,
      setIsPreviewMode,
      sharedDashboards,
      loadingSharedDashboards,
      deleteSharedDashboard,
      shareError,
      handleSaveCurrentFilters
    }}>
      {children}
    </SharingContext.Provider>
  );
};

export default SharingContext;