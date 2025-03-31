// src/components/sharing/SharingModal.js
import React, { useState, useEffect } from 'react';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';
import { Modal, Button, Icon } from '../ui';

// Simple data upload utility that just generates IDs and stores locally
const uploadDataToStorageUtil = async (data, type = 'sales') => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No valid data to upload');
    }

    // Generate a unique ID for the dataset
    const storageId = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Optionally, you could store the data in localStorage, but this isn't necessary
    // for the sharing functionality to work. The data will be included in the share link.
    try {
      // Store a small marker in localStorage to remember this ID (optional)
      localStorage.setItem(`share_marker_${storageId}`, 'true');
    } catch (e) {
      // Ignore localStorage errors - this is just a convenience feature
      console.warn("Could not access localStorage:", e);
    }
    
    console.log('Generated storage ID in local mode:', storageId);
    return storageId;
  } catch (error) {
    console.error('Error in uploadDataToStorageUtil:', error);
    throw error;
  }
};

/**
 * SharingModal component
 * Simplified version that doesn't depend on Supabase
 */
const SharingModal = () => {
  const { 
    isSharingModalOpen, 
    closeSharingModal, 
    generateShareableLink,
    sharingInProgress,
    sharingError, // Error from link generation itself
    shareableLink,
    shareConfig,
    updateSharingOptions
  } = useSharing();
  
  const { 
    salesData, 
    offerData,
    filteredData, 
    selectedProducts, 
    selectedRetailers, 
    dateRange,
    startDate,
    endDate,
    selectedMonth,
    activeTab,
    metrics,
    retailerData,
    productDistribution,
    demographicData,
    brandNames,
    hiddenCharts,
    currentDatasetStorageId, // Add this to check if data is available
    loading, // Add this to check if data is uploading
    error: dataContextError, // Get error from DataContext (e.g., upload error)
    uploadDataToStorage // Function to upload data to storage if needed
  } = useData();
  
  const [step, setStep] = useState(1); // 1 = options, 2 = result
  const [copied, setCopied] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [localError, setLocalError] = useState(null); // Renamed local error state for modal-specific errors
  const [isUploadingDataForShare, setIsUploadingDataForShare] = useState(false);
  
  // Check if data is available
  const hasData = (salesData && salesData.length > 0) || (offerData && offerData.length > 0);
  
  // Default configuration in case shareConfig is not provided
  const defaultConfig = {
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
  };
  
  // Safely get the share configuration or use defaults
  const safeShareConfig = shareConfig || defaultConfig;
  
  // Reset state when modal opens
  useEffect(() => {
    if (isSharingModalOpen) {
      setStep(1);
      setCopySuccess(false);
      setCopied(false);
      setLocalError(null); // Reset local error
      setIsUploadingDataForShare(false);
    }
  }, [isSharingModalOpen]);
  
  // Handle changed options
  const handleOptionChange = (name, value) => {
    updateSharingOptions({
      [name]: value
    });
  };
  
  // Handle checkbox changes for allowed tabs
  const handleTabCheckboxChange = (tab) => {
    // Get current tabs
    const currentTabs = [...(safeShareConfig.allowedTabs || ['summary', 'sales'])];
    
    if (currentTabs.includes(tab)) {
      // Don't allow removing the last tab
      if (currentTabs.length <= 1) return;
      
      // Remove tab
      const updatedTabs = currentTabs.filter(t => t !== tab);
      
      // If active tab is removed, update it
      let updatedActiveTab = safeShareConfig.activeTab;
      if (updatedActiveTab === tab) {
        updatedActiveTab = updatedTabs[0];
      }
      
      updateSharingOptions({
        allowedTabs: updatedTabs,
        activeTab: updatedActiveTab
      });
    } else {
      // Add tab
      updateSharingOptions({
        allowedTabs: [...currentTabs, tab]
      });
    }
  };
  
  // Upload data to storage if needed - simplified version
  const ensureDataUploaded = async () => {
    // If data is already uploaded, return the ID
    if (currentDatasetStorageId) {
      return currentDatasetStorageId;
    }
    
    // If there's no data or we're already uploading, return null
    if (!hasData || loading) {
      return null;
    }
    
    // Upload the data
    setIsUploadingDataForShare(true);
    try {
      let storageId = null;
      
      // First try using the context's uploadDataToStorage if available
      if (typeof uploadDataToStorage === 'function') {
        try {
          // Use the function from DataContext
          storageId = await uploadDataToStorage(
            salesData && salesData.length > 0 ? salesData : offerData,
            salesData && salesData.length > 0 ? 'sales' : 'offer'
          );
          
          if (storageId) {
            console.log("Successfully uploaded data with context method, ID:", storageId);
            return storageId;
          }
        } catch (contextUploadError) {
          console.warn("Context upload method failed:", contextUploadError);
          // Continue to fallback if context method fails
        }
      }
      
      // Fallback: Use our simplified utility that doesn't depend on Supabase
      try {
        const dataToUpload = salesData && salesData.length > 0 ? salesData : offerData;
        const dataType = salesData && salesData.length > 0 ? 'sales' : 'offer';
        
        storageId = await uploadDataToStorageUtil(dataToUpload, dataType);
        console.log("Successfully generated storage ID with standalone utility:", storageId);
        return storageId;
      } catch (utilError) {
        console.error("Standalone utility failed:", utilError);
        
        // Last resort: Generate a temporary ID
        const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        console.log("Using generated temporary ID:", tempId);
        return tempId;
      }
    } catch (error) {
      console.error("Error in ensureDataUploaded:", error);
      setLocalError(`Failed to prepare data for sharing: ${error.message}`);
      return null;
    } finally {
      setIsUploadingDataForShare(false);
    }
  };
  
  // Generate the shareable link
  const handleGenerateLink = async () => {
    try {
      setLocalError(null); // Reset local error
      
      // Ensure data is uploaded
      const storageId = await ensureDataUploaded();
      
      // If there's no storage ID after trying to upload, abort
      if (!storageId) {
        setLocalError("Failed to prepare data for sharing. Please try again.");
        return;
      }
      
      // Prepare filters for sharing
      const filters = {
        selectedProducts,
        selectedRetailers,
        dateRange,
        startDate,
        endDate,
        selectedMonth
      };
      
      // Prepare options for sharing
      const options = {
        ...safeShareConfig,
        filters,
        activeTab: activeTab || safeShareConfig.activeTab,
        salesData,
        filteredData,
        metrics,
        retailerData,
        productDistribution,
        demographicData,
        brandNames,
        hiddenCharts,
        // Set the storage ID if we have one, otherwise explicitly set to null
        // so the sharing service knows to use local mode
        storageId: storageId || null 
      };
      
      // Generate the link
      await generateShareableLink(options);
      
      // Move to step 2 (result)
      setStep(2);
    } catch (err) {
      console.error("Error generating shareable link:", err);
      setLocalError(err.message || "Failed to generate shareable link"); // Use local error state
    }
  };
  
  // Copy link to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setCopySuccess(true);
      
      // Reset copy success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      setCopySuccess(false);
      setLocalError("Failed to copy link to clipboard"); // Use local error state
    }
  };
  
  // Determine which error to display (prioritize data context error)
  const displayError = dataContextError || localError;

  // Render step 1 content (sharing options)
  const renderStep1Content = () => (
    <div>
      {/* Loading Indicator */}
      {(loading || isUploadingDataForShare) && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-800 rounded dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-medium">
            {isUploadingDataForShare ? "Preparing data for sharing..." : "Processing data... Please wait."}
          </p>
        </div>
      )}

      {/* No Data Warning (only show if not loading and no data) */}
      {!loading && !hasData && !dataContextError && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">No data available</p>
              <p className="text-xs mt-1">Please upload data before generating a share link.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Display Combined Error */}
      {displayError && !isUploadingDataForShare && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">{displayError}</p>
        </div>
      )}

      {/* No Storage ID but Has Data Warning */}
      {!currentDatasetStorageId && hasData && !isUploadingDataForShare && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-800 rounded dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
          <p className="font-medium">Using Local Sharing Mode</p>
          <p className="text-sm">
            Your data will be encoded directly in the sharing link. This works fine but may result in longer URLs.
          </p>
        </div>
      )}

      {/* Rest of the form remains the same */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Link Expiry
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={safeShareConfig.expiryDays}
          onChange={(e) => handleOptionChange('expiryDays', parseInt(e.target.value))}
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={0}>Never expires</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Visible Tabs
        </label>
        <div className="space-y-2">
          {['summary', 'sales', 'demographics', 'offers'].map((tab) => (
            <div key={tab} className="flex items-center">
              <input
                type="checkbox"
                id={`tab-${tab}`}
                checked={safeShareConfig.allowedTabs?.includes(tab) || false}
                onChange={() => handleTabCheckboxChange(tab)}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                disabled={safeShareConfig.allowedTabs?.length === 1 && safeShareConfig.allowedTabs?.includes(tab)}
              />
              <label htmlFor={`tab-${tab}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300 capitalize">
                {tab}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Default Tab
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={safeShareConfig.activeTab}
          onChange={(e) => handleOptionChange('activeTab', e.target.value)}
        >
          {(safeShareConfig.allowedTabs || ['summary']).map((tab) => (
            <option key={tab} value={tab} className="capitalize">
              {tab}
            </option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Client Note (Optional)
        </label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Add a note for the client..."
          value={safeShareConfig.clientNote || ''}
          onChange={(e) => handleOptionChange('clientNote', e.target.value)}
        />
      </div>
      
      <div className="mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allow-filtering"
            checked={safeShareConfig.allowClientFiltering || false}
            onChange={(e) => handleOptionChange('allowClientFiltering', e.target.checked)}
            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
          />
          <label htmlFor="allow-filtering" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Allow client to use filters
          </label>
        </div>
      </div>
    </div>
  );
  
  // Render step 2 content (sharing result)
  const renderStep2Content = () => (
    <div>
      {sharingError ? ( 
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
          <p className="font-medium">Error Generating Link</p>
          <p className="text-sm">{sharingError}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Your dashboard link is ready. Copy this link to share with your client.
          </p>
          
          <div className="relative mb-4">
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              onClick={copyToClipboard}
              className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Copy to clipboard"
            >
              <Icon name="clipboard" />
            </button>
          </div>
          
          {copySuccess && (
            <div className="mb-4 p-2 bg-green-100 text-green-700 rounded dark:bg-green-900/30 dark:text-green-300">
              Link copied to clipboard!
            </div>
          )}
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link Details
            </h4>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li>• Tabs: {safeShareConfig.allowedTabs?.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') || 'Summary'}</li>
              <li>• Default Tab: {safeShareConfig.activeTab ? (safeShareConfig.activeTab.charAt(0).toUpperCase() + safeShareConfig.activeTab.slice(1)) : 'Summary'}</li>
              {safeShareConfig.expiryDays > 0 ? (
                <li>• Expires: {safeShareConfig.expiryDays} days from now</li>
              ) : (
                <li>• Expires: Never</li>
              )}
              <li>• Client Filtering: {safeShareConfig.allowClientFiltering ? 'Enabled' : 'Disabled'}</li>
              <li>• Storage Mode: Local (URL encoded)</li>
            </ul>
          </div>
          
          {!currentDatasetStorageId && hasData && (
            <div className="mt-4 p-2 bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-300 text-xs">
              <p className="font-medium mb-1">Using Local Sharing Mode</p>
              <p>Your link contains the data encoded directly within it. This works well for small to medium datasets.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
  
  // Footer buttons for step 1
  const step1Footer = (
    <>
      <Button
        variant="secondary"
        onClick={closeSharingModal}
        className="mr-3"
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleGenerateLink}
        disabled={sharingInProgress || (!hasData && !currentDatasetStorageId) || isUploadingDataForShare} 
      >
        {sharingInProgress ? 'Generating...' : 
         isUploadingDataForShare ? 'Preparing Data...' : 
         !hasData && !currentDatasetStorageId ? 'Upload Data First' : 
         !currentDatasetStorageId && hasData ? 'Generate Link (Local Mode)' :
         'Generate Link'}
      </Button>
    </>
  );
  
  // Footer buttons for step 2
  const step2Footer = (
    <>
      <Button
        variant="secondary"
        onClick={closeSharingModal}
        className="mr-3"
      >
        Close
      </Button>
      {!sharingError && (
        <Button
          variant="primary"
          onClick={copyToClipboard}
          icon={<Icon name="link" />}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      )}
    </>
  );
  
  return (
    <Modal
      isOpen={isSharingModalOpen}
      onClose={closeSharingModal}
      title={step === 1 ? 'Share Dashboard' : 'Share Link Ready'}
      footer={step === 1 ? step1Footer : step2Footer}
    >
      {step === 1 ? renderStep1Content() : renderStep2Content()}
    </Modal>
  );
};

export default SharingModal;