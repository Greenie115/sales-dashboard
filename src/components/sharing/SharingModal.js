// src/components/sharing/SharingModal.js - Simplified version
import React, { useState, useEffect } from 'react';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';

/**
 * Simplified SharingModal component
 */
const SharingModal = () => {
  const { darkMode } = useTheme();
  
  // Get context data
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
    offerData,
    clientName,
    brandNames,
    activeTab
  } = useData();
  
  // Local state
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isSharingModalOpen) {
      setStep(1);
      setCopied(false);
      
      // Set active tab in share config
      if (activeTab) {
        updateSharingOptions({ activeTab });
      }
    }
  }, [isSharingModalOpen, activeTab, updateSharingOptions]);
  
  // Generate shareable link
  const handleGenerateLink = async () => {
    try {
      await generateShareableLink();
      setStep(2);
    } catch (error) {
      console.error('Error generating link:', error);
    }
  };
  
  // Copy link to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };
  
  // Handle option change
  const handleOptionChange = (name, value) => {
    updateSharingOptions({ [name]: value });
  };
  
  // Handle tab selection
  const handleTabToggle = (tab) => {
    const { allowedTabs = ['summary'] } = shareConfig;
    
    if (allowedTabs.includes(tab)) {
      // Remove tab
      if (allowedTabs.length > 1) {
        updateSharingOptions({
          allowedTabs: allowedTabs.filter(t => t !== tab),
          // Update active tab if needed
          activeTab: shareConfig.activeTab === tab ? allowedTabs.filter(t => t !== tab)[0] : shareConfig.activeTab
        });
      }
    } else {
      // Add tab
      updateSharingOptions({
        allowedTabs: [...allowedTabs, tab]
      });
    }
  };
  
  // Render the modal content based on step
  const renderContent = () => {
    // Check if data is available
    const hasData = (salesData && salesData.length > 0) || (offerData && offerData.length > 0);
    
    // Step 1: Configuration
    if (step === 1) {
      return (
        <div>
          {!hasData && (
            <div className={`mb-4 p-3 ${darkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50' : 'bg-yellow-50 text-yellow-800 border-yellow-100'} rounded border`}>
              <p className="font-medium">No data available</p>
              <p className="text-sm mt-1">Please upload data before sharing.</p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Link Expiry</label>
            <select
              className={`w-full px-3 py-2 border rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={shareConfig.expiryDays}
              onChange={(e) => handleOptionChange('expiryDays', parseInt(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={0}>Never expires</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Visible Tabs</label>
            <div className="space-y-2">
              {['summary', 'sales', 'demographics', 'offers'].map((tab) => (
                <div key={tab} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`tab-${tab}`}
                    checked={shareConfig.allowedTabs?.includes(tab) || false}
                    onChange={() => handleTabToggle(tab)}
                    className="h-4 w-4 text-pink-600 border-gray-300 rounded"
                    disabled={shareConfig.allowedTabs?.length === 1 && shareConfig.allowedTabs?.includes(tab)}
                  />
                  <label htmlFor={`tab-${tab}`} className="ml-2 text-sm capitalize">
                    {tab}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Default Tab</label>
            <select
              className={`w-full px-3 py-2 border rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={shareConfig.activeTab}
              onChange={(e) => handleOptionChange('activeTab', e.target.value)}
            >
              {(shareConfig.allowedTabs || ['summary']).map((tab) => (
                <option key={tab} value={tab} className="capitalize">{tab}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Client Note (Optional)</label>
            <textarea
              rows={3}
              className={`w-full px-3 py-2 border rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Add a note for the client..."
              value={shareConfig.clientNote || ''}
              onChange={(e) => handleOptionChange('clientNote', e.target.value)}
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allow-filtering"
                checked={shareConfig.allowClientFiltering || false}
                onChange={(e) => handleOptionChange('allowClientFiltering', e.target.checked)}
                className="h-4 w-4 text-pink-600 border-gray-300 rounded"
              />
              <label htmlFor="allow-filtering" className="ml-2 text-sm">
                Allow client to use filters
              </label>
            </div>
          </div>
        </div>
      );
    } 
    // Step 2: Share result
    else {
      return (
        <div>
          {sharingError ? (
            <div className={`mb-4 p-3 ${darkMode ? 'bg-red-900/30 text-red-300 border-red-800/50' : 'bg-red-50 text-red-800 border-red-100'} rounded border`}>
              <p className="font-medium">Error Generating Link</p>
              <p className="text-sm mt-1">{sharingError}</p>
            </div>
          ) : (
            <>
              <p className="text-sm mb-4">
                Your dashboard link is ready. Copy this link to share with your client.
              </p>
              
              <div className="relative mb-4">
                <input
                  type="text"
                  value={shareableLink}
                  readOnly
                  className={`w-full px-3 py-2 pr-10 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  onClick={copyToClipboard}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                  title="Copy to clipboard"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
              
              {copied && (
                <div className={`mb-4 p-2 ${darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-800'} rounded`}>
                  Link copied to clipboard!
                </div>
              )}
              
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Link Details</h4>
                <ul className="text-xs space-y-1">
                  <li>• Tabs: {shareConfig.allowedTabs?.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}</li>
                  <li>• Default Tab: {shareConfig.activeTab.charAt(0).toUpperCase() + shareConfig.activeTab.slice(1)}</li>
                  <li>• Expires: {shareConfig.expiryDays > 0 ? `${shareConfig.expiryDays} days from now` : 'Never'}</li>
                  <li>• Client Filtering: {shareConfig.allowClientFiltering ? 'Enabled' : 'Disabled'}</li>
                  <li>• Client: {clientName || 'Not specified'}</li>
                  <li>• Brands: {brandNames?.length ? brandNames.join(', ') : 'Not specified'}</li>
                </ul>
              </div>
            </>
          )}
        </div>
      );
    }
  };
  
  // Modal footer buttons
  const renderFooter = () => {
    if (step === 1) {
      return (
        <>
          <button
            onClick={closeSharingModal}
            className="px-4 py-2 border bg-white text-gray-700 rounded-md hover:bg-gray-50 mr-3"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateLink}
            disabled={sharingInProgress || !(salesData?.length || offerData?.length)}
            className={`px-4 py-2 ${
              sharingInProgress || !(salesData?.length || offerData?.length)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-pink-600 text-white hover:bg-pink-700'
            } rounded-md`}
          >
            {sharingInProgress ? 'Generating...' : 'Generate Link'}
          </button>
        </>
      );
    } else {
      return (
        <>
          <button
            onClick={closeSharingModal}
            className="px-4 py-2 border bg-white text-gray-700 rounded-md hover:bg-gray-50 mr-3"
          >
            Close
          </button>
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </>
      );
    }
  };
  
  // If modal is closed, don't render anything
  if (!isSharingModalOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 overflow-y-auto z-50">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={closeSharingModal}></div>
        
        <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-auto p-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {step === 1 ? 'Share Dashboard' : 'Share Link Ready'}
            </h3>
            <button
              onClick={closeSharingModal}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="mb-6">
            {renderContent()}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end">
            {renderFooter()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharingModal;