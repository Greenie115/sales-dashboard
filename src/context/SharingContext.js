import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useData } from './DataContext';
import sharingService from '../services/sharingService';

// Create context
const SharingContext = createContext();

// Custom hook for using this context
export const useSharing = () => useContext(SharingContext);

export const SharingProvider = ({ children }) => {
  const { salesData, activeTab, brandNames, clientName } = useData();
  
  // State for sharing configuration
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
    }
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
      
      // Add current active tab if not in allowed tabs
      if (activeTab && !configToShare.allowedTabs.includes(activeTab)) {
        configToShare.allowedTabs = [...configToShare.allowedTabs, activeTab];
      }
      
      // Add metadata
      configToShare.metadata = {
        createdAt: new Date().toISOString(),
        brandNames: brandNames || [],
        clientName: clientName || 'Client',
        datasetSize: Array.isArray(salesData) ? salesData.length : 0,
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
  }, [shareConfig, activeTab, brandNames, clientName, salesData]);
  
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
    setIsPreviewMode(prev => !prev);
  }, []);
  
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
      isPreviewMode,
      togglePreviewMode,
      transformDataForSharing,
      sharedDashboards,
      loadingSharedDashboards,
      deleteSharedDashboard,
      shareError
    }}>
      {children}
    </SharingContext.Provider>
  );
};

export default SharingContext;