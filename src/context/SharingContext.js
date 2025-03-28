import React, { createContext, useContext, useState, useEffect } from 'react';
// Removed uuidv4 as it's not used after local storage removal
import sharingService from '../services/sharingService';
import { useData } from './DataContext';
// Removed unused imports: sharedDataUtils, testSharedData, compressionUtils

// Create the context
const SharingContext = createContext();

/**
 * SharingProvider component - Provides sharing functionality using Supabase storage.
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
    allowClientFiltering: false, // Default to false, user enables in modal
    hiddenCharts: [],
    branding: {
      showLogo: true,
      companyName: 'Shopmium Insights',
      primaryColor: '#FF0066',
    }
  });
  
  // Get data context - Destructure all potentially needed fields
  const dataContext = useData();
  const { 
    activeTab,
    clientName,
    brandNames,
    // Get filter state for initialFilters
    selectedProducts,
    selectedRetailers,
    dateRange,
    startDate,
    endDate,
    selectedMonth,
    comparisonMode,
    comparisonDateRange,
    comparisonStartDate,
    comparisonEndDate,
    comparisonMonth,
    // Get the storage ID
    currentDatasetStorageId
  } = dataContext;

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
    // Ensure allowClientFiltering is reset or set based on a default preference
    updateSharingOptions({ allowClientFiltering: false }); 
  };

  // Close sharing modal
  const closeSharingModal = () => {
    setIsSharingModalOpen(false);
  };
  
  // Open/close dashboard manager modal
  const openDashboardManager = () => setDashboardManagerOpen(true);
  const closeDashboardManager = () => setDashboardManagerOpen(false);

  // Update sharing options (e.g., from the modal UI)
  const updateSharingOptions = (options) => {
    setShareConfig(prev => ({ ...prev, ...options }));
  };

  // --- Removed Local Storage Functions ---
  // saveLocalSharedDashboard and getLocalSharedDashboards removed as they are obsolete.
  // The primary sharing mechanism now relies on Supabase storage IDs.
  // --- End Removed Local Storage Functions ---


  /**
   * Generate a shareable link by compressing data and saving to Supabase.
   * @param {Object} options - Options for sharing (e.g., expiryDays, clientNote, allowClientFiltering)
   * @returns {Promise<string>} - The shareable link (ID-based).
   */
  const generateShareableLink = async (options) => {
    try {
      setSharingInProgress(true);
      setSharingError(null);

      // 1. Get the storageId from DataContext
      if (!currentDatasetStorageId) {
        throw new Error("Dataset has not been saved yet. Please wait for upload to complete or re-upload.");
      }
      console.log("Using storageId:", currentDatasetStorageId);

      // 2. Gather initial filters (use current filter state from DataContext)
      // Only include filters if allowClientFiltering is potentially true or needed for initial view
      const initialFilters = options.allowClientFiltering ? {
        selectedProducts,
        selectedRetailers,
        dateRange,
        startDate,
        endDate,
        selectedMonth,
        // Include comparison filters if relevant? Decide based on requirements.
        // comparisonMode, comparisonDateRange, comparisonStartDate, comparisonEndDate, comparisonMonth
      } : {}; // Empty object if client filtering is disabled

      // 3. Gather metadata
      const metadata = {
        clientName: clientName || 'Client', // Get from DataContext
        brandNames: brandNames || [],     // Get from DataContext
        createdAt: new Date().toISOString(),
        // Add other relevant metadata from shareConfig or options
        clientNote: options.clientNote || '',
        allowedTabs: options.allowedTabs || shareConfig.allowedTabs,
        activeTab: options.activeTab || shareConfig.activeTab,
        allowClientFiltering: options.allowClientFiltering || false,
        hiddenCharts: options.hiddenCharts || shareConfig.hiddenCharts,
        branding: options.branding || shareConfig.branding,
      };

      // 4. Calculate expiry date
      let expiryDateIso = null;
      if (options.expiryDays && options.expiryDays > 0) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + options.expiryDays);
        expiryDateIso = expiry.toISOString();
      } else if (shareConfig.expiryDays && shareConfig.expiryDays > 0 && !options.expiryDays) {
         const expiry = new Date();
         expiry.setDate(expiry.getDate() + shareConfig.expiryDays);
         expiryDateIso = expiry.toISOString();
      }

      // 5. Call the updated sharingService
      console.log("Calling sharingService.createSharedDashboard with:", {
        storageId: currentDatasetStorageId,
        initialFilters,
        metadata,
        expiryDate: expiryDateIso
      });

      const result = await sharingService.createSharedDashboard({
        storageId: currentDatasetStorageId,
        initialFilters,
        metadata,
        expiryDate: expiryDateIso
      });

      // 6. Construct the simple, ID-based URL
      const newShareableLink = `${window.location.origin}/share/${result.share_id}`;
      setShareableLink(newShareableLink);
      setSharingInProgress(false);
      console.log("Generated share link:", newShareableLink);
      return newShareableLink;

    } catch (err) {
      console.error("Error generating shareable link:", err);
      // Provide a more specific error message if possible
      let errorMessage = "Failed to generate shareable link.";
      if (err.message.includes('Failed to fetch')) {
         errorMessage = "Network error: Could not connect to the database.";
      } else if (err.message.includes('duplicate key value violates unique constraint')) {
         errorMessage = "Error: A share with this ID already exists (unexpected).";
      } else if (err.message) {
         errorMessage = `Error: ${err.message}`;
      }
      setSharingError(errorMessage);
      setSharingInProgress(false);
      throw err; // Re-throw if needed for further handling
    }
  };
  
  // Remove transformDataForSharing function - no longer needed for this approach
  // const transformDataForSharing = (...) => { ... };
  
  // Create the context value
  const contextValue = {
    // Modal state
    isSharingModalOpen, openSharingModal, closeSharingModal,
    dashboardManagerOpen, openDashboardManager, closeDashboardManager,
    
    // Share configuration state
    shareConfig, updateSharingOptions,
    
    // Share link generation state and function
    shareableLink, generateShareableLink, sharingInProgress, sharingError,
    
    // Preview state
    previewActiveTab, setPreviewActiveTab,
    
    // Removed getLocalSharedDashboards from context value
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
