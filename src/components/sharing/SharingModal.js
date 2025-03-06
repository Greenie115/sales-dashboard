import React, { useState, useEffect } from 'react';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import SharedDashboardPreview from './SharedDashboardPreview';

const SharingModal = () => {
  const { darkMode } = useTheme();
  const { activeTab } = useData();
  const { 
    isShareModalOpen, 
    toggleShareModal, 
    shareConfig, 
    updateShareConfig,
    generateShareableLink,
    shareableLink,
    isPreviewMode,
    togglePreviewMode
  } = useSharing();
  
  const [copySuccess, setCopySuccess] = useState(false);
  
  // When modal opens, ensure current tab is selected
  useEffect(() => {
    if (isShareModalOpen && activeTab && !shareConfig.allowedTabs.includes(activeTab)) {
      updateShareConfig({
        allowedTabs: [...shareConfig.allowedTabs, activeTab]
      });
    }
  }, [isShareModalOpen, activeTab, shareConfig.allowedTabs, updateShareConfig]);
  
  // Reset copy success message
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);
  
  if (!isShareModalOpen) return null;
  
  // Handle tab selection
  const handleTabToggle = (tab) => {
    if (shareConfig.allowedTabs.includes(tab)) {
      // Don't allow deselecting all tabs
      if (shareConfig.allowedTabs.length > 1) {
        updateShareConfig({
          allowedTabs: shareConfig.allowedTabs.filter(t => t !== tab)
        });
      }
    } else {
      updateShareConfig({
        allowedTabs: [...shareConfig.allowedTabs, tab]
      });
    }
  };
  
  // Handle generating and copying link
  const handleGenerateLink = () => {
    generateShareableLink();
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink)
      .then(() => setCopySuccess(true))
      .catch(err => console.error('Failed to copy link:', err));
  };
  
  // If in preview mode, render the preview
  if (isPreviewMode) {
    return <SharedDashboardPreview onClose={togglePreviewMode} />;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`relative w-full max-w-2xl rounded-lg shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Share Dashboard with Client
          </h2>
          <button 
            onClick={toggleShareModal}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className={`px-6 py-4 max-h-[70vh] overflow-y-auto ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <div className="space-y-6">
            {/* Tab Selection */}
            <div>
              <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Visible Tabs</h3>
              <div className="grid grid-cols-2 gap-3">
                {['summary', 'sales', 'demographics', 'offers'].map(tab => (
                  <div 
                    key={tab}
                    className={`
                      px-4 py-3 rounded-lg border flex items-center cursor-pointer
                      ${shareConfig.allowedTabs.includes(tab) 
                        ? `bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800/50 ${darkMode ? 'text-pink-300' : 'text-pink-700'}` 
                        : `${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600`
                      }
                    `}
                    onClick={() => handleTabToggle(tab)}
                  >
                    <input
                      type="checkbox"
                      checked={shareConfig.allowedTabs.includes(tab)}
                      onChange={() => handleTabToggle(tab)}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-3"
                    />
                    <span className="capitalize">{tab}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Data Anonymization Options */}
            <div>
              <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Data Privacy Options</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={shareConfig.hideRetailers}
                    onChange={(e) => updateShareConfig({ hideRetailers: e.target.checked })}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">Anonymize retailer names</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={shareConfig.hideTotals}
                    onChange={(e) => updateShareConfig({ hideTotals: e.target.checked })}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">Hide absolute totals</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={shareConfig.showOnlyPercent}
                    onChange={(e) => updateShareConfig({ showOnlyPercent: e.target.checked })}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">Show percentages only</span>
                </label>
              </div>
            </div>
            
            {/* Branding Options */}
            <div>
              <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Branding</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Company Name</label>
                  <input
                    type="text"
                    value={shareConfig.branding.companyName}
                    onChange={(e) => updateShareConfig({ 
                      branding: { ...shareConfig.branding, companyName: e.target.value } 
                    })}
                    className={`
                      w-full px-3 py-2 rounded-md border 
                      ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                      focus:outline-none focus:ring-2 focus:ring-pink-500
                    `}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Brand Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={shareConfig.branding.primaryColor}
                      onChange={(e) => updateShareConfig({ 
                        branding: { ...shareConfig.branding, primaryColor: e.target.value } 
                      })}
                      className="h-8 w-8 border-0 p-0 rounded"
                    />
                    <input
                      type="text"
                      value={shareConfig.branding.primaryColor}
                      onChange={(e) => updateShareConfig({ 
                        branding: { ...shareConfig.branding, primaryColor: e.target.value } 
                      })}
                      className={`
                        flex-1 px-3 py-2 rounded-md border 
                        ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                        focus:outline-none focus:ring-2 focus:ring-pink-500
                      `}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={shareConfig.branding.showLogo}
                    onChange={(e) => updateShareConfig({ 
                      branding: { ...shareConfig.branding, showLogo: e.target.checked } 
                    })}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">Show company logo</span>
                </label>
              </div>
            </div>
            
            {/* Client Note */}
            <div>
              <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Note to Client</h3>
              <textarea
                value={shareConfig.clientNote}
                onChange={(e) => updateShareConfig({ clientNote: e.target.value })}
                placeholder="Add an optional message for your client..."
                rows={3}
                className={`
                  w-full px-3 py-2 rounded-md border 
                  ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                  focus:outline-none focus:ring-2 focus:ring-pink-500
                `}
              />
            </div>
            
            {/* Expiration Date */}
            <div>
              <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Link Expiration</h3>
              <input
                type="date"
                value={shareConfig.expiryDate || ''}
                onChange={(e) => updateShareConfig({ expiryDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={`
                  w-full px-3 py-2 rounded-md border 
                  ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                  focus:outline-none focus:ring-2 focus:ring-pink-500
                `}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leave blank for no expiration
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer with Actions */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <button
            onClick={togglePreviewMode}
            className={`
              px-4 py-2 rounded-md flex items-center text-sm font-medium
              ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}
            `}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview Client View
          </button>
          
          <div className="flex items-center space-x-3">
            {!shareableLink ? (
              <button
                onClick={handleGenerateLink}
                className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                Generate Link
              </button>
            ) : (
              <>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={shareableLink}
                    className={`
                      w-64 px-3 py-2 pr-10 rounded-md border text-sm 
                      ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}
                    `}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="Copy to clipboard"
                  >
                    {copySuccess ? (
                      <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  onClick={handleGenerateLink}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Regenerate
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharingModal;