import React, { useState, useEffect } from 'react';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext'; // Provides clientName, brandMapping
import { useFilter } from '../../context/FilterContext'; // Provides filterState
import { useTheme } from '../../context/ThemeContext';
import SharedDashboardPreview from './SharedDashboardPreview';
import SharedDashboardsManager from './SharedDashboardsManager';
import ShareConfigTabSelector from '../ShareConfigTabSelector';
import ClientNameEditor from '../dashboard/ClientNameEditor';

const SharingModal = () => {
  const { darkMode } = useTheme();
  const {
    // Get metadata from DataContext
    clientName,
  } = useData();

  // Get filter context
  const { } = useFilter();

  // Get sharing context functions
  const {
    isShareModalOpen,
    toggleShareModal,
    shareConfig,
    updateShareConfig, // Use this instead of setShareConfig
    setShareActiveTab,
    setShareAllowedTabs,
    shareableLink,
    setShareableLink,
    isPreviewMode,
    setIsPreviewMode,
    generateShareableLink,
    saveCurrentFilters,
    getPreviewData
  } = useSharing();

  // Local UI state only - no duplication of share configuration
  const [activeView, setActiveView] = useState('create');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [inlinePreview] = useState(false); // Keep for inline preview toggle
  // fallbackMode state removed
  // Client name is now stored in shareConfig
  const [datePickerValue, setDatePickerValue] = useState('');

  // generateFallbackLink function removed

  // toggleFallbackMode function removed
  // Copy the share URL to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink)
      .then(() => setCopySuccess(true))
      .catch(err => console.error('Failed to copy link:', err));
  };

  // Reset copy success message
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  // getEnhancedPreviewData function removed
  // Handle generating share link
  const handleGenerateLink = async () => {
    // Ensure we have at least one tab selected
    if (shareConfig.allowedTabs.length === 0) {
      alert("Please select at least one tab to share.");
      return;
    }

    // Client ID is now handled by the SharingContext

    setIsGeneratingLink(true);
    setShareableLink(''); // Clear previous link

    try {
      // Use the generateShareableLink function from SharingContext
      // This will handle all the data processing and API calls
      const url = await generateShareableLink();

      if (!url) {
        throw new Error('Failed to generate share link.');
      }

      // Success message
      const successMessage = document.createElement('div');
      successMessage.className = `fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out`;
      successMessage.textContent = 'Share link generated successfully!';
      document.body.appendChild(successMessage);

      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);

    } catch (error) {
      console.error("Error generating share link:", error);

      // Don't use alert as it's disruptive - use a more user-friendly approach
      const errorDiv = document.getElementById('share-error-message');
      if (errorDiv) {
        errorDiv.textContent = `Failed to generate share link: ${error.message}`;
        errorDiv.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
          errorDiv.style.display = 'none';
        }, 5000);
      } else {
        // Fallback to console if the error div doesn't exist
        console.error(`Failed to generate share link: ${error.message}`);
      }
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Show the preview
  const handlePreviewClick = () => {
    // Make sure we have the latest tab configuration
    if (shareConfig.allowedTabs.length === 0) {
      // If no tabs are selected, default to summary
      setShareAllowedTabs(['summary']);
      setShareActiveTab('summary');
    } else if (!shareConfig.activeTab || !shareConfig.allowedTabs.includes(shareConfig.activeTab)) {
      // Make sure active tab is valid
      setShareActiveTab(shareConfig.allowedTabs[0]);
    }

    // Toggle to preview mode
    setIsPreviewMode(true);
  };

  // Handle tab configuration changes
  const handleTabConfigChange = (tabConfig) => {
    if (tabConfig.allowedTabs?.length) {
      setShareAllowedTabs(tabConfig.allowedTabs);
    }

    if (tabConfig.activeTab && shareConfig.allowedTabs.includes(tabConfig.activeTab)) {
      setShareActiveTab(tabConfig.activeTab);
    }
  };

  // Helper function to get display name without brand prefix
  // Commented out as it's not currently used
  /*
  const getProductDisplayName = (product) => {
    // Use the brand mapping if available
    if (brandMapping && brandMapping[product]) {
      return brandMapping[product].displayName || product;
    }

    // Fallback: Remove the brand prefix (first word or two)
    const words = product.split(' ');
    if (words.length >= 3) {
      // Remove first word or two words for longer product names
      const wordsToRemove = words.length >= 5 ? 2 : 1;
      return words.slice(wordsToRemove).join(' ');
    }

    return product;
  };
  */

  // Handle adding a custom excluded date
  const handleAddExcludedDate = () => {
    if (!datePickerValue) return;

    const updatedConfig = {
      ...shareConfig,
      customExcludedDates: [...(shareConfig.customExcludedDates || []), datePickerValue]
    };

    updateShareConfig(updatedConfig);
    setDatePickerValue('');
  };

  // Commented out as it's not currently used
  /*
  const handleToggleHiddenChart = (chartId) => {
    const updatedConfig = { ...shareConfig };

    if (!updatedConfig.hiddenCharts) {
      updatedConfig.hiddenCharts = [];
    }

    if (updatedConfig.hiddenCharts.includes(chartId)) {
      // Remove from hidden charts
      updatedConfig.hiddenCharts = updatedConfig.hiddenCharts.filter(id => id !== chartId);
    } else {
      // Add to hidden charts
      updatedConfig.hiddenCharts = [...updatedConfig.hiddenCharts, chartId];
    }

    updateShareConfig(updatedConfig);
  };
  */

  // Handle removing a custom excluded date
  const handleRemoveExcludedDate = (date) => {
    const updatedConfig = {
      ...shareConfig,
      customExcludedDates: (shareConfig.customExcludedDates || []).filter(d => d !== date)
    };

    updateShareConfig(updatedConfig);
  };

  // Exit if modal is closed
  if (!isShareModalOpen) return null;

  // If in full preview mode, render the preview
  if (isPreviewMode) {
    // Adjust preview if needed, potentially passing snapshot data directly
    return <SharedDashboardPreview
      config={getPreviewData()} // Use data directly from context for now
      onClose={() => setIsPreviewMode(false)}
    />;
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`relative w-full max-w-4xl rounded-lg shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <div>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Share Dashboard
            </h2>
          </div>

          {/* Tab navigation for Create/Manage/Debug */}
          <div className="flex items-center space-x-4">
            <div className="flex border rounded-md overflow-hidden">
              <button
                onClick={() => setActiveView('create')}
                className={`px-4 py-2 text-sm ${
                  activeView === 'create'
                    ? `bg-pink-600 text-white`
                    : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }`}
              >
                Create New
              </button>
              <button
                onClick={() => setActiveView('manage')}
                className={`px-4 py-2 text-sm ${
                  activeView === 'manage'
                    ? `bg-pink-600 text-white`
                    : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }`}
              >
                Manage Shares
              </button>
            </div>

            <button
              onClick={toggleShareModal}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Create New Share View */}
        {activeView === 'create' && (
          <div className="flex flex-col md:flex-row">
            {/* Left section - settings */}
            <div className={`w-full ${inlinePreview ? 'md:w-1/2 border-r dark:border-gray-700' : 'md:w-full'}`}>
              {/* Body */}
              <div className={`px-6 py-4 max-h-[70vh] overflow-y-auto ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {/* Fallback Mode UI completely removed */}
                <div className="space-y-6">
                  {/* Tab Selection */}
                  <div>
                    <ShareConfigTabSelector
                      allowedTabs={shareConfig.allowedTabs || ['summary']}
                      activeTab={shareConfig.activeTab || 'summary'}
                      onChange={handleTabConfigChange}
                      darkMode={darkMode}
                    />
                  </div>

                  {/* Client Name */}
                  <div className="mb-6">
                    <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Client Information</h3>
                    <ClientNameEditor />
                    <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      This name will be displayed in the client dashboard header.
                    </p>
                  </div>

                  {/* Client Selection */}
                  <div>
                    <label htmlFor="client-id-input" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Client Name:
                    </label>
                    <input
                      id="client-id-input"
                      type="text"
                      value={shareConfig.clientName || clientName || ''}
                      onChange={(e) => updateShareConfig({ clientName: e.target.value })}
                      placeholder="Enter Client Name"
                      className={`mt-1 block w-full px-3 py-2 text-sm rounded-md shadow-sm ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500 placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 focus:ring-pink-500 focus:border-pink-500 placeholder-gray-400'
                      }`}
                    />
                     <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      The name of the client who will access this dashboard.
                    </p>
                  </div>

                  {/* Data Filters (Display Only) */}
                   <div>
                     <div className="flex justify-between items-center mb-2">
                       <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Data Filters Applied</h3>
                       <button
                         onClick={saveCurrentFilters} // This function should update shareConfig.filters
                         className={`text-xs py-1 px-2 rounded ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                       >
                         Use Current Dashboard Filters
                       </button>
                     </div>
                     <div className={`rounded-lg border p-3 mb-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                       <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                         The shared view will be created with these filters:
                       </p>
                       {/* Display filters from shareConfig.filters */}
                       <div className="mt-2 space-y-1 text-xs">
                         <div><span className="font-medium">Products:</span> {shareConfig.filters?.selectedProducts?.join(', ') || 'All'}</div>
                         <div><span className="font-medium">Retailers:</span> {shareConfig.filters?.selectedRetailers?.join(', ') || 'All'}</div>
                         <div><span className="font-medium">Date Range:</span> {shareConfig.filters?.dateRange === 'custom' ? `${shareConfig.filters?.startDate} to ${shareConfig.filters?.endDate}` : shareConfig.filters?.dateRange || 'All Time'}</div>
                         {shareConfig.filters?.dateRange === 'month' && <div><span className="font-medium">Month:</span> {shareConfig.filters?.selectedMonth}</div>}
                       </div>
                     </div>
                     <p className={`text-xs italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                       Clients view a snapshot and cannot change filters.
                     </p>
                   </div>

                  {/* Display Options */}
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Display Options</h3>
                    <div className="flex flex-col space-y-2">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.hideRetailers}
                          onChange={(e) => {
                            updateShareConfig({ hideRetailers: e.target.checked });
                          }}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Hide retailer names (anonymize)</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.hideTotals}
                          onChange={(e) => {
                            updateShareConfig({ hideTotals: e.target.checked });
                          }}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Hide total values</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.showOnlyPercent}
                          onChange={(e) => {
                            updateShareConfig({ showOnlyPercent: e.target.checked });
                          }}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Show only percentages (hide count values)</span>
                      </label>
                    </div>
                  </div>

                  {/* Chart Visibility Options */}
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Chart Visibility</h3>
                    <div className="flex flex-col space-y-2">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.hiddenCharts?.includes('retailer-distribution') || false}
                          onChange={(e) => {
                            const chart = 'retailer-distribution';
                            // Create a new hiddenCharts array if it doesn't exist
                            const currentHiddenCharts = shareConfig.hiddenCharts || [];
                            const updatedCharts = e.target.checked
                              ? [...currentHiddenCharts, chart]
                              : currentHiddenCharts.filter(c => c !== chart);

                            updateShareConfig({ hiddenCharts: updatedCharts });
                            console.log("Updated hidden charts:", updatedCharts);
                          }}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Hide retailer distribution chart</span>
                      </label>

                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.hiddenCharts?.includes('product-distribution') || false}
                          onChange={(e) => {
                            const chart = 'product-distribution';
                            const currentHiddenCharts = shareConfig.hiddenCharts || [];
                            const updatedCharts = e.target.checked
                              ? [...currentHiddenCharts, chart]
                              : currentHiddenCharts.filter(c => c !== chart);

                            updateShareConfig({ hiddenCharts: updatedCharts });
                          }}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Hide product distribution chart</span>
                      </label>

                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.hiddenCharts?.includes('time-trend') || false}
                          onChange={(e) => {
                            const chart = 'time-trend';
                            const currentHiddenCharts = shareConfig.hiddenCharts || [];
                            const updatedCharts = e.target.checked
                              ? [...currentHiddenCharts, chart]
                              : currentHiddenCharts.filter(c => c !== chart);

                            updateShareConfig({ hiddenCharts: updatedCharts });
                          }}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Hide time trend chart</span>
                      </label>

                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.hiddenCharts?.includes('demographics-charts') || false}
                          onChange={(e) => {
                            const chart = 'demographics-charts';
                            const currentHiddenCharts = shareConfig.hiddenCharts || [];
                            const updatedCharts = e.target.checked
                              ? [...currentHiddenCharts, chart]
                              : currentHiddenCharts.filter(c => c !== chart);

                            updateShareConfig({ hiddenCharts: updatedCharts });
                          }}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Hide demographic breakdown charts</span>
                      </label>

                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.hiddenCharts?.includes('day-distribution') || false}
                          onChange={(e) => {
                            const chart = 'day-distribution';
                            const currentHiddenCharts = shareConfig.hiddenCharts || [];
                            const updatedCharts = e.target.checked
                              ? [...currentHiddenCharts, chart]
                              : currentHiddenCharts.filter(c => c !== chart);

                            updateShareConfig({ hiddenCharts: updatedCharts });
                          }}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Hide day distribution chart</span>
                      </label>
                    </div>
                  </div>

                  {/* Date Exclusion */}
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Exclude Dates from Time Charts</h3>
                    <div className="flex items-end space-x-2 mb-2">
                      <div className="flex-grow">
                        <input
                          type="date"
                          value={datePickerValue}
                          onChange={(e) => setDatePickerValue(e.target.value)}
                          className={`w-full px-3 py-2 border ${
                            darkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500'
                              : 'border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                          } rounded-md text-sm focus:outline-none`}
                        />
                      </div>
                      <button
                        onClick={handleAddExcludedDate}
                        disabled={!datePickerValue}
                        className={`px-3 py-2 rounded ${
                          !datePickerValue
                            ? `${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                            : `${darkMode ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-pink-600 text-white hover:bg-pink-700'}`
                        }`}
                      >
                        Add
                      </button>
                    </div>

                    {/* Display excluded dates */}
                    <div className={`mt-2 ${
                      shareConfig.customExcludedDates.length > 0
                        ? `${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} p-3 rounded-lg border`
                        : ''
                    }`}>
                      {shareConfig.customExcludedDates.length > 0 ? (
                        <div>
                          <h4 className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Excluded Dates:</h4>
                          <div className="max-h-32 overflow-y-auto">
                            {shareConfig.customExcludedDates.map(date => (
                              <div key={date} className="flex justify-between items-center py-1">
                                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {new Date(date).toLocaleDateString()}
                                </span>
                                <button
                                  onClick={() => handleRemoveExcludedDate(date)}
                                  className={`text-xs p-1 rounded ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-100'}`}
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No dates excluded. Add specific dates to exclude them from time-based charts.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date Exclusion */}
                    <div>
                      <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Exclude Dates from Time Charts
                      </h3>
                      <div className="flex items-end space-x-2 mb-2">
                        <div className="flex-grow">
                          <input
                            type="date"
                            value={datePickerValue}
                            onChange={(e) => setDatePickerValue(e.target.value)}
                            className={`w-full px-3 py-2 border ${
                              darkMode
                                ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500'
                                : 'border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                            } rounded-md text-sm focus:outline-none`}
                          />
                        </div>
                        <button
                          onClick={handleAddExcludedDate}
                          disabled={!datePickerValue}
                          className={`px-3 py-2 rounded ${
                            !datePickerValue
                              ? `${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                              : `${darkMode ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-pink-600 text-white hover:bg-pink-700'}`
                          }`}
                        >
                          Add
                        </button>
                      </div>

                      {/* Display excluded dates */}
                      <div className={`mt-2 ${
                        shareConfig.customExcludedDates.length > 0
                          ? `${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} p-3 rounded-lg border`
                          : ''
                      }`}>
                        {shareConfig.customExcludedDates.length > 0 ? (
                          <div>
                            <h4 className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Excluded Dates:
                            </h4>
                            <div className="max-h-32 overflow-y-auto">
                              {shareConfig.customExcludedDates.map(date => (
                                <div key={date} className="flex justify-between items-center py-1">
                                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {new Date(date).toLocaleDateString()}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveExcludedDate(date)}
                                    className={`text-xs p-1 rounded ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-100'}`}
                                  >
                                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No dates excluded. Add specific dates to exclude them from time-based charts.
                          </p>
                        )}
                      </div>
                    </div>

                  {/* Client Note */}
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Client Note</h3>
                    <textarea
                      placeholder="Add a message to display to the client (optional)"
                      value={shareConfig.clientNote}
                      onChange={(e) => {
                        updateShareConfig({ clientNote: e.target.value });
                      }}
                      className={`w-full px-3 py-2 border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500'
                          : 'border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                      } rounded-md text-sm focus:outline-none`}
                      rows={3}
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Expiry Date</h3>
                    <input
                      type="date"
                      value={shareConfig.expiryDate || ''}
                      onChange={(e) => {
                        updateShareConfig({ expiryDate: e.target.value || null });
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500'
                          : 'border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                      } rounded-md text-sm focus:outline-none`}
                    />
                    <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Leave blank for links that don't expire.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right section - inline preview */}
            {inlinePreview && (
              <div className="w-full md:w-1/2 max-h-[70vh] overflow-hidden relative">
                <div className="absolute inset-0 p-4 overflow-auto">
                  <div className={`rounded-lg shadow-lg overflow-hidden h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} flex justify-between items-center`}>
                      <div className="flex items-center">
                        {shareConfig.branding.showLogo && (
                          <div
                            className="h-6 w-6 rounded-full mr-2 flex items-center justify-center"
                            style={{ backgroundColor: shareConfig.branding.primaryColor }}
                          >
                            <span className="text-white font-bold text-xs">
                              {shareConfig.branding.companyName.slice(0, 1)}
                            </span>
                          </div>
                        )}
                        <h3 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Client View
                        </h3>
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Preview
                      </span>
                    </div>
                    <div className={`p-3 text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <p>Click "Preview Client View" below for a full interactive preview</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manage Existing Shares View */}
        {activeView === 'manage' && (
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <SharedDashboardsManager />
          </div>
        )}

        {/* Info message */}
        <div className="px-6 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-md mx-6 mb-4">
          <p><strong>Note:</strong> This app is using a mock Supabase client that stores data in your browser's localStorage. Shared dashboards will only be accessible on this device.</p>
        </div>

        {/* Error message */}
        <div id="share-error-message" className="hidden px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-md mx-6 mb-4"></div>

        {/* Footer with Actions */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <div className="flex items-center space-x-2">
            {activeView === 'create' && (
              <>
                <button
                  onClick={handlePreviewClick}
                  className={`
                    px-4 py-2 rounded-md flex items-center text-sm font-medium
                    ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}
                  `}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview Client View
                </button>
              </>
            )}
          </div>

          {activeView === 'create' && (
            <div className="flex items-center space-x-3">
              {!shareableLink ? (
                <button
                  onClick={handleGenerateLink}
                  disabled={isGeneratingLink}
                  className={`px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 flex items-center ${
                    isGeneratingLink ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isGeneratingLink && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isGeneratingLink ? 'Generating...' : 'Generate Link'}
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
                    disabled={isGeneratingLink}
                    className={`px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center ${
                      isGeneratingLink ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isGeneratingLink && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isGeneratingLink ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharingModal;