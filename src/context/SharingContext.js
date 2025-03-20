import React, { createContext, useContext, useState, useCallback } from 'react';
import sharingService from '../services/sharingService';
import supabase from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';

// Create context
const SharingContext = createContext();

// Unicode-safe Base64 encoding function for fallback mode
const unicodeSafeBase64Encode = (str) => {
  try {
    // Convert string to UTF-8 bytes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    
    // Convert bytes to base64
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (error) {
    console.error("Error in Unicode-safe Base64 encoding:", error);
    throw error;
  }
};

/**
 * Provider component that wraps the app and makes sharing context available
 */
export function SharingProvider({ children }) {
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [sharingError, setSharingError] = useState(null);
  const [shareableLink, setShareableLink] = useState('');
  
  // Default sharing options
  const [sharingOptions, setSharingOptions] = useState({
    expiryDays: 7,
    allowedTabs: ['summary', 'sales', 'demographics', 'offers'],
    activeTab: 'summary',
    clientNote: '',
    allowClientFiltering: true
  });
  
  // State for shared dashboards management
  const [sharedDashboards, setSharedDashboards] = useState([]);
  const [loadingSharedDashboards, setLoadingSharedDashboards] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [dashboardManagerOpen, setDashboardManagerOpen] = useState(false);
  
  // Update sharing options
  const updateSharingOptions = useCallback((options) => {
    setSharingOptions(prev => ({
      ...prev,
      ...options
    }));
  }, []);
  
  // Open sharing modal
  const openSharingModal = useCallback(() => {
    setIsSharingModalOpen(true);
    setSharingError(null);
    setShareableLink('');
  }, []);
  
  // Close sharing modal
  const closeSharingModal = useCallback(() => {
    setIsSharingModalOpen(false);
  }, []);
  
  // Generate shareable link with fallback support
  const generateShareableLink = useCallback(async (options) => {
    setSharingInProgress(true);
    setSharingError(null);
    setShareableLink('');
    
    try {
      // Calculate expiry date if needed
      let expiryDate = null;
      if (options.expiryDays > 0) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + options.expiryDays);
      }
      
      // Prepare config for sharing
      const sharingConfig = {
        ...options,
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        precomputedData: {
          salesData: options.salesData || [],
          filteredData: options.filteredData || [],
          metrics: options.metrics || {},
          retailerData: options.retailerData || [],
          productDistribution: options.productDistribution || [],
          demographicData: options.demographicData || {},
          brandNames: options.brandNames || [],
          clientName: options.clientName || 'Client'
        },
        metadata: {
          createdAt: new Date().toISOString(),
          shareId: uuidv4(),
          version: '1.0',
          clientName: options.clientName || 'Client'
        },
        branding: {
          companyName: 'Shopmium Insights',
          showLogo: true,
          primaryColor: '#FF0066'
        }
      };
      
      // First, try to use the Supabase service if available
      if (supabase.isAvailable()) {
        try {
          const result = await sharingService.createSharedDashboard(sharingConfig);
          
          // If successful, create a link using the share ID
          const shareUrl = `${window.location.origin}${window.location.pathname}#/shared/${result.share_id}`;
          setShareableLink(shareUrl);
          setSharingInProgress(false);
          return shareUrl;
        } catch (supabaseError) {
          console.log("Supabase error:", supabaseError);
          // If we get a specific error that directs us to use the fallback, do so
          if (supabaseError.message === "TIMEOUT_SWITCH_TO_FALLBACK" || 
              supabase.hasSslError() ||
              supabaseError.message.includes("column") ||
              supabaseError.message.includes("schema")) {
            console.log("Supabase operation failed or has schema issues, using fallback mode");
            // Fall through to the fallback method below
          } else {
            // Otherwise, it's a different error, but still use fallback
            console.error("Error creating shared dashboard with Supabase:", supabaseError);
          }
        }
      }
      
      // Fallback: Base64 encoded sharing
      console.log("Using Base64 fallback for sharing");
      
      // First, optimize the sharing config to reduce size
      const optimizedConfig = JSON.parse(JSON.stringify(sharingConfig));
      
      // Limit the sales data to reduce size if needed
      if (optimizedConfig.precomputedData.salesData && 
          optimizedConfig.precomputedData.salesData.length > 1000) {
        // Keep only first 1000 records
        optimizedConfig.precomputedData.salesData = 
          optimizedConfig.precomputedData.salesData.slice(0, 1000);
        optimizedConfig.precomputedData.dataReduced = true;
      }
      
      // Convert the config to JSON string
      const configStr = JSON.stringify(optimizedConfig);
      
      // Encode the config
      const shareId = unicodeSafeBase64Encode(configStr);
      
      // Create shareable link
      const shareUrl = `${window.location.origin}${window.location.pathname}#/shared/${shareId}`;
      setShareableLink(shareUrl);
      setSharingInProgress(false);
      return shareUrl;
    } catch (error) {
      console.error("Error generating shareable link:", error);
      setSharingError(error.message || "Failed to generate shareable link");
      setSharingInProgress(false);
      throw error;
    }
  }, []);
  
  // Transform data for sharing (used in shared view)
  const transformDataForSharing = useCallback((data) => {
    if (!data) return data;
    
    // Create a deep copy to avoid modifying original data
    const transformedData = JSON.parse(JSON.stringify(data));
    
    // Add any necessary transformations here
    // ...
    
    return transformedData;
  }, []);
  
  // Load shared dashboards from Supabase
  const loadSharedDashboards = useCallback(async () => {
    setLoadingSharedDashboards(true);
    setShareError(null);
    
    try {
      const dashboards = await sharingService.listSharedDashboards();
      setSharedDashboards(dashboards || []);
    } catch (err) {
      console.error("Error loading shared dashboards:", err);
      setShareError("Could not load your shared dashboards. Please try again later.");
    } finally {
      setLoadingSharedDashboards(false);
    }
  }, []);

  // Delete a shared dashboard
  const deleteSharedDashboard = useCallback(async (shareId) => {
    try {
      setShareError(null);
      await sharingService.deleteSharedDashboard(shareId);
      
      // Remove from local state
      setSharedDashboards(prev => prev.filter(dash => dash.share_id !== shareId));
      return true;
    } catch (err) {
      console.error("Error deleting dashboard:", err);
      setShareError("Could not delete the dashboard. Please try again later.");
      return false;
    }
  }, []);

  // Open the dashboard manager
  const openDashboardManager = useCallback(() => {
    setDashboardManagerOpen(true);
    loadSharedDashboards();
  }, [loadSharedDashboards]);

  // Close the dashboard manager
  const closeDashboardManager = useCallback(() => {
    setDashboardManagerOpen(false);
  }, []);
  
  // The value to be provided to consumers
  const value = {
    isSharingModalOpen,
    openSharingModal,
    closeSharingModal,
    sharingInProgress,
    sharingError,
    shareableLink,
    sharingOptions,
    updateSharingOptions,
    generateShareableLink,
    transformDataForSharing,
    
    // Dashboard management
    sharedDashboards,
    loadingSharedDashboards,
    loadSharedDashboards,
    deleteSharedDashboard,
    shareError,
    dashboardManagerOpen,
    openDashboardManager,
    closeDashboardManager
  };
  
  return (
    <SharingContext.Provider value={value}>
      {children}
    </SharingContext.Provider>
  );
}

// Custom hook to use the sharing context
export function useSharing() {
  const context = useContext(SharingContext);
  if (!context) {
    throw new Error('useSharing must be used within a SharingProvider');
  }
  return context;
}