import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import sharingService from '../services/sharingService';
import { useData } from './DataContext';

// Create the context
const SharingContext = createContext();

/**
 * SharingProvider component - Provides sharing functionality
 */
export const SharingProvider = ({ children }) => {
  // State for sharing modal
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [dashboardManagerOpen, setDashboardManagerOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [sharingError, setSharingError] = useState(null);
  const [previewActiveTab, setPreviewActiveTab] = useState('summary');
  const [shareConfig, setShareConfig] = useState({
    allowedTabs: ['summary', 'sales'],
    activeTab: 'summary',
    expiryDays: 30,
    clientNote: '',
    allowClientFiltering: false,
    hiddenCharts: [],
    branding: {
      showLogo: true,
      companyName: 'Shopmium Insights',
      primaryColor: '#FF0066',
    }
  });
  
  // Get data context
  const { 
    clientName,
    brandNames,
    activeTab 
  } = useData();

  // When the component mounts, set default values
  useEffect(() => {
    // Update default active tab based on the current active tab
    if (activeTab) {
      updateSharingOptions({ activeTab });
    }
  }, [activeTab]);

  // Open sharing modal
  const openSharingModal = () => {
    setIsSharingModalOpen(true);
    
    // Reset state when modal opens
    setShareableLink('');
    setSharingError(null);
    setSharingInProgress(false);
  };

  // Close sharing modal
  const closeSharingModal = () => {
    setIsSharingModalOpen(false);
  };
  
  // Open/close dashboard manager modal
  const openDashboardManager = () => setDashboardManagerOpen(true);
  const closeDashboardManager = () => setDashboardManagerOpen(false);

  // Update sharing options
  const updateSharingOptions = (options) => {
    setShareConfig(prev => ({ ...prev, ...options }));
  };

  const saveLocalSharedDashboard = (dashboard) => {
    try {
      if (!dashboard || !dashboard.share_id) return false;
      
      // Get existing dashboards
      const dashboards = getLocalSharedDashboards();
      
      // Check if this dashboard already exists
      const existingIndex = dashboards.findIndex(dash => dash.share_id === dashboard.share_id);
      if (existingIndex >= 0) {
        // Update existing dashboard
        dashboards[existingIndex] = {...dashboards[existingIndex], ...dashboard};
      } else {
        // Add new dashboard
        dashboards.push(dashboard);
      }
      
      // Save back to localStorage
      localStorage.setItem('sharedDashboards', JSON.stringify(dashboards));
      return true;
    } catch (err) {
      console.error("Error saving local shared dashboard:", err);
      return false;
    }
  };
  
  /**
   * Get shared dashboards from localStorage
   * 
   * @returns {Array} - List of shared dashboards from localStorage
   */
  const getLocalSharedDashboards = () => {
    try {
      // Get from localStorage
      const dashboardsJson = localStorage.getItem('sharedDashboards');
      if (!dashboardsJson) return [];
      
      // Parse and validate the data
      const parsedData = JSON.parse(dashboardsJson);
      if (!Array.isArray(parsedData)) return [];
      
      // Filter out invalid entries and sort by created_at
      return parsedData
        .filter(dash => dash && dash.share_id && dash.created_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (err) {
      console.error("Error getting local shared dashboards:", err);
      return [];
    }
  };
  
  /**
   * Improved Base64 encoding that handles all characters including unicode
   * @param {string} str - The string to encode
   * @returns {string} - Base64 URL-safe encoded string
   */
  const unicodeSafeBase64Encode = (str) => {
    try {
      // Convert the string to UTF-8 bytes
      const bytes = new TextEncoder().encode(str);
      
      // Convert the bytes to base64
      let base64 = '';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const byteLength = bytes.byteLength;
      const byteRemainder = byteLength % 3;
      const mainLength = byteLength - byteRemainder;
      
      // Process 3 bytes at a time, each producing 4 characters
      for (let i = 0; i < mainLength; i += 3) {
        // Use bitwise operators to combine the bytes and extract 6-bit segments
        const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        const a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        const b = (chunk & 258048) >> 12;   // 258048 = (2^6 - 1) << 12
        const c = (chunk & 4032) >> 6;      // 4032 = (2^6 - 1) << 6
        const d = chunk & 63;               // 63 = 2^6 - 1
        
        // Convert the 6-bit segments to base64 chars
        base64 += chars[a] + chars[b] + chars[c] + chars[d];
      }
      
      // Handle the remaining bytes
      if (byteRemainder === 1) {
        const chunk = bytes[mainLength];
        const a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
        const b = (chunk & 3) << 4;   // 3 = 2^2 - 1
        
        base64 += chars[a] + chars[b] + '==';
      } else if (byteRemainder === 2) {
        const chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
        const a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        const b = (chunk & 1008) >> 4;   // 1008 = (2^6 - 1) << 4
        const c = (chunk & 15) << 2;     // 15 = 2^4 - 1
        
        base64 += chars[a] + chars[b] + chars[c] + '=';
      }
      
      // Make the base64 URL-safe
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (error) {
      console.error("Error in unicodeSafeBase64Encode:", error);
      throw error;
    }
  };
  
  /**
   * Generate a URL-safe version of JSON for sharing
   * @param {Object} data - The data to encode
   * @returns {string} - URL-safe encoded string
   */
  const generateUrlSafeData = (data) => {
    try {
      // Convert data to JSON
      const jsonString = JSON.stringify(data);
      
      // Use our improved Unicode-safe Base64 encoding
      return unicodeSafeBase64Encode(jsonString);
    } catch (error) {
      console.error("Error generating URL-safe data:", error);
      throw error;
    }
  };
  
  /**
   * Generate a shareable link for the dashboard
   * @param {Object} options - Options for sharing
   * @returns {Promise<string>} - The shareable link
   */
  const generateShareableLink = async (options) => {
    try {
      setSharingInProgress(true);
      setSharingError(null);

      // Create the share configuration
      const shareData = {
        ...shareConfig,
        ...options,
        // Add metadata
        metadata: {
          clientName: clientName || 'Client',
          brandNames: brandNames || [],
          createdAt: new Date().toISOString(),
        }
      };
      
      // Calculate expiry date if needed
      if (shareData.expiryDays > 0) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + shareData.expiryDays);
        shareData.expiryDate = expiryDate.toISOString();
      }
      
      // Try to use Supabase first
      try {
        const result = await sharingService.createSharedDashboard(shareData);
        const shareableLink = `${window.location.origin}${window.location.pathname}#/shared/${result.share_id}`;
        setShareableLink(shareableLink);
        setSharingInProgress(false);
        return shareableLink;
      } catch (err) {
        // Check if this is a timeout or other error that should trigger fallback
        if (err.message === 'TIMEOUT_SWITCH_TO_FALLBACK' || 
            sharingService.hasSSLErrors && sharingService.hasSSLErrors()) {
          console.log("Supabase operation failed or has schema issues, using fallback mode");
        } else {
          // For other errors, throw to show the error to the user
          throw err;
        }
      }
      
      // If we got here, use Base64 fallback
      console.log("Using Base64 fallback for sharing");
      
      // Generate a local share ID
      const localShareId = uuidv4();
      
      // Save a record of this shared dashboard to localStorage
      const localDashboard = {
        share_id: localShareId,
        created_at: new Date().toISOString(),
        config: shareData,
        expires_at: shareData.expiryDate,
        access_count: 0
      };
      saveLocalSharedDashboard(localDashboard);
      
      // Generate URL-safe Base64 data - store both the shareId and the data
      shareData.share_id = localShareId;
      const base64Data = generateUrlSafeData(shareData);
      
      // Create shareable link
      const shareableLink = `${window.location.origin}${window.location.pathname}#/shared/${base64Data}`;
      setShareableLink(shareableLink);
      setSharingInProgress(false);
      return shareableLink;
    } catch (err) {
      console.error("Error generating shareable link:", err);
      setSharingError(err.message || "Failed to generate shareable link");
      setSharingInProgress(false);
      throw err;
    }
  };
  
  /**
   * Transform data for sharing with specific rules
   * @param {Object} data - The data to transform
   * @returns {Object} - Transformed data
   */
  const transformDataForSharing = (data) => {
    if (!data) return data;
    
    try {
      // Make a deep copy to avoid modifying the original
      const transformedData = JSON.parse(JSON.stringify(data));
      
      // Apply sharing-specific transformations
      // For example, remove sensitive fields
      
      // If hiddenCharts are specified, use them
      if (data.shareConfig && data.shareConfig.hiddenCharts) {
        transformedData.hiddenCharts = data.shareConfig.hiddenCharts;
      }
      
      return transformedData;
    } catch (err) {
      console.error("Error transforming data for sharing:", err);
      // Return original data if transformation fails
      return data;
    }
  };
  
  // Create the context value
  const contextValue = {
    // Modal state
    isSharingModalOpen,
    openSharingModal,
    closeSharingModal,
    dashboardManagerOpen,
    openDashboardManager,
    closeDashboardManager,
    
    // Share configuration
    shareConfig,
    updateSharingOptions,
    
    // Share link generation
    shareableLink,
    generateShareableLink,
    sharingInProgress,
    sharingError,
    
    // Preview state
    previewActiveTab,
    setPreviewActiveTab,
    
    // Data transformation
    transformDataForSharing,
    
    // Utility functions
    generateUrlSafeData
  };

  return (
    <SharingContext.Provider value={contextValue}>
      {children}
    </SharingContext.Provider>
  );
};

// Custom hook to use the sharing context
export const useSharing = () => {
  const context = useContext(SharingContext);
  if (context === undefined) {
    throw new Error('useSharing must be used within a SharingProvider');
  }
  return context;
};

export default SharingContext;