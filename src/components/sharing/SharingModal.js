// SharingModal.js
import React, { useState, useEffect } from 'react';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';
import { Modal, Button, Icon } from '../ui';
import supabase from '../../utils/supabase';

/**
 * SharingModal component
 * Fixed to prevent undefined sharingOptions error
 */
const SharingModal = () => {
  const { 
    isSharingModalOpen, 
    closeSharingModal, 
    generateShareableLink,
    sharingInProgress,
    sharingError,
    shareableLink,
    shareConfig,
    updateSharingOptions
  } = useSharing();
  
  const { 
    salesData, 
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
    hiddenCharts
  } = useData();
  
  const [step, setStep] = useState(1); // 1 = options, 2 = result
  const [copied, setCopied] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showSSLWarning, setShowSSLWarning] = useState(false);
  
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
      setError(null);
      
      // Check if Supabase has SSL issues
      setShowSSLWarning(typeof supabase.hasSslError === 'function' && supabase.hasSslError());
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
  
  // Generate the shareable link
  const handleGenerateLink = async () => {
    try {
      setError(null);
      
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
        hiddenCharts
      };
      
      // Generate the link
      await generateShareableLink(options);
      
      // Move to step 2 (result)
      setStep(2);
    } catch (err) {
      console.error("Error generating shareable link:", err);
      setError(err.message || "Failed to generate shareable link");
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
      setError("Failed to copy link to clipboard");
    }
  };
  
  // Render step 1 content (sharing options)
  const renderStep1Content = () => (
    <div>
      {showSSLWarning && (
        <div className="mb-4 p-3 bg-amber-100 border border-amber-400 text-amber-800 rounded dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
          <p className="font-medium mb-1">SSL Certificate Issue Detected</p>
          <p className="text-sm">
            The dashboard will use local sharing mode (links may be longer). This won't affect functionality,
            but shared links will expire if the browser cache is cleared.
          </p>
        </div>
      )}
      
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
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
          {error}
        </div>
      )}
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
              <li>• Storage Mode: {showSSLWarning ? 'Local (URL encoded)' : 'Database'}</li>
            </ul>
          </div>
          
          {showSSLWarning && !supabase.isAvailable?.() && (
            <div className="mt-4 p-2 bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-300 text-xs">
              <p className="font-medium mb-1">Using Local Sharing Mode</p>
              <p>Database connection currently unavailable. Your link contains all necessary data and will work normally.</p>
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
        disabled={sharingInProgress}
      >
        {sharingInProgress ? 'Generating...' : 'Generate Link'}
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