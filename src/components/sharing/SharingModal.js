import React, { useState, useEffect } from 'react';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useFilter } from '../../context/FilterContext';
import SharedDashboardPreview from './SharedDashboardPreview';
import SharedDashboardsManager from './SharedDashboardsManager';
import SupabaseDebugger from '../debug/SupabaseDebugger';

const SharingModal = () => {
  const { darkMode } = useTheme();
  const {
    salesData,
    activeTab,
    brandNames,
    clientName,
    getFilteredData,
    calculateMetrics,
    getRetailerDistribution,
    getProductDistribution,
    brandMapping,
    selectedProducts,
    selectedRetailers,
    dateRange,
    startDate,
    endDate,
    selectedMonth
  } = useData();

  const [shareConfig, setShareConfig] = useState({
    allowedTabs: [], // Start with an empty array
    hideRetailers: false,
    hideTotals: false,
    showOnlyPercent: false,
    clientNote: '',
    expiryDate: null,
    branding: {
      showLogo: true,
      primaryColor: '#FF0066',
      companyName: 'Shopmium',
    },
    filters: {
      selectedProducts: ['all'],
      selectedRetailers: ['all'],
      dateRange: 'all',
      startDate: '',
      endDate: '',
      selectedMonth: '',
    },
    precomputedData: null
  });

  const {
    isShareModalOpen,
    toggleShareModal,
    generateShareableLink,
    shareableLink,
    setShareableLink,
    isPreviewMode,
    togglePreviewMode,
    handleSaveCurrentFilters
  } = useSharing();

  const { filters } = useFilter();
  const [copySuccess, setCopySuccess] = useState(false);
  const [inlinePreview, setInlinePreview] = useState(false);
  const [activeView, setActiveView] = useState('create'); // 'create', 'manage', or 'debug'
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);


// When modal opens, ensure current tab is selected
useEffect(() => {
  if (isShareModalOpen) {
    console.log("Modal opened with activeTab:", activeTab);
    
    // When modal opens, start fresh with ONLY the current tab
    setShareConfig(prev => ({
      ...prev,
      allowedTabs: [activeTab || 'summary'],
      activeTab: activeTab || 'summary'
    }));
  }
}, [isShareModalOpen, activeTab]);


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
    console.log(`Toggle tab: ${tab}`);
    
    setShareConfig(prev => {
      // Check if this tab is already selected
      const isSelected = prev.allowedTabs.includes(tab);
      let newAllowedTabs;
      let newActiveTab = prev.activeTab;
      
      if (isSelected) {
        // We're removing this tab
        // Only allow removal if it's not the last tab
        if (prev.allowedTabs.length > 1) {
          // Create new array without this tab
          newAllowedTabs = prev.allowedTabs.filter(t => t !== tab);
          
          // If we're removing the active tab, set a new active tab
          if (prev.activeTab === tab) {
            newActiveTab = newAllowedTabs[0];
          }
          
          console.log(`Removed ${tab}, new tabs:`, newAllowedTabs);
        } else {
          // Can't remove the last tab
          console.log("Can't remove last tab");
          return prev; // Return unchanged state
        }
      } else {
        // We're adding this tab
        newAllowedTabs = [...prev.allowedTabs, tab];
        
        // If this is the first tab or there's no active tab, 
        // make this the active tab
        if (prev.allowedTabs.length === 0 || !prev.activeTab) {
          newActiveTab = tab;
        }
        
        console.log(`Added ${tab}, new tabs:`, newAllowedTabs);
      }
      
      // Return updated state
      return {
        ...prev,
        allowedTabs: newAllowedTabs,
        activeTab: newActiveTab
      };
    });
  };

  // Helper function to get display name without brand prefix
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

  // Create a fallback link using Base64 encoding (like the original implementation)
  const generateFallbackLink = () => {
    try {
      // Create a copy of the current sharing configuration
      const configToShare = { ...shareConfig };
  
      // Add current active tab if not in allowed tabs
      if (activeTab && !configToShare.allowedTabs.includes(activeTab)) {
        configToShare.allowedTabs = [...configToShare.allowedTabs, activeTab];
      }
      
      // Ensure we set the activeTab property
      configToShare.activeTab = configToShare.allowedTabs[0];

      // Add metadata
      configToShare.metadata = {
        createdAt: new Date().toISOString(),
        brandNames: brandNames || [],
        clientName: clientName || 'Client',
        datasetSize: Array.isArray(salesData) ? salesData.length : 0,
      };
  
      // IMPORTANT: Add precomputed data for the client view
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
  
      // Generate an ID using Base64 encoding (Original method)
      const shareId = btoa(JSON.stringify(configToShare)).replace(/=/g, '');
  
      // Create the shareable URL with hash for HashRouter
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/#/shared/${shareId}`;
  
      return shareUrl;
    } catch (error) {
      console.error("Error generating fallback link:", error);
      return "";
    }
  };

  // Handle generating and copying link
  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    
    try {
      // Ensure we have at least one tab selected
      if (shareConfig.allowedTabs.length === 0) {
        alert("Please select at least one tab to share.");
        setIsGeneratingLink(false);
        return;
      }
      
      // Ensure active tab is set and valid
      if (!shareConfig.activeTab || !shareConfig.allowedTabs.includes(shareConfig.activeTab)) {
        setShareConfig(prev => ({
          ...prev,
          activeTab: prev.allowedTabs[0]
        }));
        
        // Add a small delay to ensure state update
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Log the configuration for debugging
      console.log("Generating share link with config:", {
        allowedTabs: shareConfig.allowedTabs,
        activeTab: shareConfig.activeTab
      });
      
      // Use appropriate generation method
      if (fallbackMode) {
        const shareUrl = generateFallbackLink();
        setShareableLink(shareUrl);
      } else {
        await generateShareableLink();
      }
      
      setIsGeneratingLink(false);
    } catch (error) {
      console.error("Error generating link:", error);
      // If Supabase fails, try fallback method
      if (!fallbackMode) {
        setFallbackMode(true);
        const shareUrl = generateFallbackLink();
        setShareableLink(shareUrl);
      }
      setIsGeneratingLink(false);
    }
  };

  const applyCurrentFilters = () => {
    // Call the handler
    handleSaveCurrentFilters();
    
    // Force update the UI by updating local state
    setShareConfig(prev => {
      return {
        ...prev,
        filters: {
          selectedProducts: [...selectedProducts],
          selectedRetailers: [...selectedRetailers],
          dateRange: dateRange,
          startDate: startDate,
          endDate: endDate,
          selectedMonth: selectedMonth
        }
      };
    });
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink)
      .then(() => setCopySuccess(true))
      .catch(err => console.error('Failed to copy link:', err));
  };

  const handlePreviewClick = () => {
    // Make sure we have at least one allowed tab
    if (shareConfig.allowedTabs.length === 0) {
      setShareConfig(prev => ({
        ...prev,
        allowedTabs: ['summary']
      }));
    }
  
    console.log("Opening preview with allowedTabs:", shareConfig.allowedTabs);
    
    // Toggle to preview mode
    togglePreviewMode();
  };

  // Toggle inline preview
  const toggleInlinePreview = () => {
    setInlinePreview(!inlinePreview);
  };

  // Toggle fallback mode
  const toggleFallbackMode = () => {
    setFallbackMode(!fallbackMode);
    // Clear existing link when toggling mode
    setShareableLink('');
  };

  // If in full preview mode, render the preview
  if (isPreviewMode) {
    return <SharedDashboardPreview onClose={togglePreviewMode} />;
  }

  const TabSelectionSection = () => (
    <div>
      <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
        Visible Tabs
      </h3>
      <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Select which tabs to include in the shared dashboard:
      </p>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        {['summary', 'sales', 'demographics', 'offers'].map(tab => (
          <div 
            key={tab}
            className={`
              px-4 py-3 rounded-lg border flex items-center justify-between cursor-pointer
              ${shareConfig.allowedTabs.includes(tab) 
                ? `bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800/50 ${darkMode ? 'text-pink-300' : 'text-pink-700'}` 
                : `${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600`
              }
            `}
            onClick={() => handleTabToggle(tab)}
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={shareConfig.allowedTabs.includes(tab)}
                onChange={() => handleTabToggle(tab)}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-3"
              />
              <span className="capitalize">{tab}</span>
            </div>
            
            {/* Show active indicator */}
            {shareConfig.activeTab === tab && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                darkMode ? 'bg-pink-800 text-pink-200' : 'bg-pink-100 text-pink-800'
              }`}>
                Active
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* Warning if no tabs selected */}
      {shareConfig.allowedTabs.length === 0 && (
        <div className={`p-3 mb-4 rounded-lg border ${
          darkMode ? 'bg-amber-900/20 border-amber-800/30 text-amber-300' : 
                   'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-start">
            <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Please select at least one tab to share</span>
          </div>
        </div>
      )}
      
      {/* Active tab selector (only show if multiple tabs are selected) */}
      {shareConfig.allowedTabs.length > 1 && (
        <div className="mt-2 mb-4">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Set Active Tab:
          </label>
          <div className="flex flex-wrap gap-2">
            {shareConfig.allowedTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setShareConfig(prev => ({ ...prev, activeTab: tab }))}
                className={`px-3 py-1 text-sm rounded-md ${
                  shareConfig.activeTab === tab
                    ? 'bg-pink-600 text-white'
                    : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }`}
              >
                <span className="capitalize">{tab}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            The active tab will be shown first when the client opens the shared dashboard.
          </p>
        </div>
      )}
    </div>
  );
  
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
              <button
                onClick={() => setActiveView('debug')}
                className={`px-4 py-2 text-sm ${
                  activeView === 'debug' 
                    ? `bg-pink-600 text-white` 
                    : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }`}
              >
                Debug
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
                {/* Fallback Mode Notice */}
                {fallbackMode && (
                  <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-amber-900/20 border-amber-800/30' : 'bg-amber-50 border-amber-200'} border`}>
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-amber-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <h3 className={`text-sm font-medium ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                          Using Fallback Mode
                        </h3>
                        <p className={`mt-1 text-sm ${darkMode ? 'text-amber-200' : 'text-amber-700'}`}>
                          Fallback mode encodes dashboard information directly in the URL without storing in Supabase.
                          To use database storage, go to the Debug tab to troubleshoot connection issues.
                        </p>
                        <button 
                          onClick={toggleFallbackMode}
                          className={`mt-2 px-3 py-1 text-xs rounded-md ${
                            darkMode ? 'bg-amber-800/50 text-amber-200 hover:bg-amber-800' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          Try Using Supabase
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-6">
               {/* Tab Selection */}
                <div>
                  <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Visible Tabs</h3>
                  
                  {/* Show warning if no tabs selected */}
                  {shareConfig.allowedTabs.length === 0 && (
                    <div className={`p-3 mb-3 rounded-lg text-sm ${
                      darkMode ? 'bg-amber-900/20 text-amber-300 border border-amber-800/30' : 
                              'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      Select at least one tab to share.
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    {['summary', 'sales', 'demographics', 'offers'].map(tab => (
                      <div 
                        key={tab}
                        className={`
                          px-4 py-3 rounded-lg border flex items-center justify-between cursor-pointer
                          ${shareConfig.allowedTabs.includes(tab) 
                            ? `bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800/50 ${darkMode ? 'text-pink-300' : 'text-pink-700'}` 
                            : `${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600`
                          }
                        `}
                        onClick={() => handleTabToggle(tab)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={shareConfig.allowedTabs.includes(tab)}
                            onChange={() => handleTabToggle(tab)}
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-3"
                          />
                          <span className="capitalize">{tab}</span>
                        </div>
                        
                        {/* Show active indicator */}
                        {shareConfig.activeTab === tab && (
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            darkMode ? 'bg-pink-800 text-pink-200' : 'bg-pink-100 text-pink-800'
                          }`}>
                            Active
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Active Tab Selector */}
                  {shareConfig.allowedTabs.length > 1 && (
                    <div className="mt-4">
                      <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Set Active Tab:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {shareConfig.allowedTabs.map(tab => (
                          <button
                            key={tab}
                            onClick={() => setShareConfig(prev => ({ ...prev, activeTab: tab }))}
                            className={`px-3 py-1 text-xs rounded-md ${
                              shareConfig.activeTab === tab
                                ? 'bg-pink-600 text-white'
                                : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                            }`}
                          >
                            <span className="capitalize">{tab}</span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This tab will be displayed first when shared.
                      </p>
                    </div>
                  )}
                </div>
                  
                  {/* Data Filters */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Data Filters</h3>
                      <button
                        onClick={applyCurrentFilters}
                        className={`text-xs py-1 px-2 rounded ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        Use Current Filters
                      </button>
                    </div>
                    <div className={`rounded-lg border p-3 mb-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Clients will view the dashboard with the following filters applied:
                      </p>
                      <div className="mt-2 space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Products:</span> {shareConfig.filters?.selectedProducts?.includes('all') 
                            ? 'All Products' 
                            : (shareConfig.filters?.selectedProducts?.map(p => getProductDisplayName(p)).join(', ') || 'All Products')}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Retailers:</span> {shareConfig.filters?.selectedRetailers?.includes('all') 
                            ? 'All Retailers' 
                            : (shareConfig.filters?.selectedRetailers?.join(', ') || 'All Retailers')}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Date Range:</span> {shareConfig.filters?.dateRange === 'custom' 
                            ? `${shareConfig.filters?.startDate} to ${shareConfig.filters?.endDate}` 
                            : (shareConfig.filters?.dateRange === 'month' 
                              ? shareConfig.filters?.selectedMonth 
                              : (shareConfig.filters?.dateRange || 'All Time'))}
                        </div>
                      </div>
                    </div>
                    <p className={`text-xs italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Clients won't be able to change these filters.
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
                          onChange={(e) => setShareConfig({ hideRetailers: e.target.checked })}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Hide retailer names (anonymize)</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.hideTotals}
                          onChange={(e) => setShareConfig({ hideTotals: e.target.checked })}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Hide total values</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.showOnlyPercent}
                          onChange={(e) => setShareConfig({ showOnlyPercent: e.target.checked })}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Show only percentages (hide count values)</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Client Note */}
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Client Note</h3>
                    <textarea
                      placeholder="Add a message to display to the client (optional)"
                      value={shareConfig.clientNote}
                      onChange={(e) => setShareConfig({ clientNote: e.target.value })}
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
                      onChange={(e) => setShareConfig({ expiryDate: e.target.value || null })}
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
                  
                  {/* Branding */}
                  {/* <div>
                    <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Branding</h3>
                    <div className="space-y-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.branding.showLogo}
                          onChange={(e) => setShareConfig({ 
                            branding: { ...shareConfig.branding, showLogo: e.target.checked }
                          })}
                          className="form-checkbox h-4 w-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="ml-2">Show your logo</span>
                      </label>
                      
                      <div>
                        <label className={`block text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={shareConfig.branding.companyName}
                          onChange={(e) => setShareConfig({ 
                            branding: { ...shareConfig.branding, companyName: e.target.value }
                          })}
                          placeholder="Your Company"
                          className={`w-full px-3 py-2 border ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500' 
                              : 'border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                          } rounded-md text-sm focus:outline-none`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                          Brand Color
                        </label>
                        <div className="flex items-center">
                          <input
                            type="color"
                            value={shareConfig.branding.primaryColor}
                            onChange={(e) => setShareConfig({ 
                              branding: { ...shareConfig.branding, primaryColor: e.target.value }
                            })}
                            className="h-8 w-8 mr-3 rounded-md cursor-pointer"
                          />
                          <input
                            type="text"
                            value={shareConfig.branding.primaryColor}
                            onChange={(e) => setShareConfig({ 
                              branding: { ...shareConfig.branding, primaryColor: e.target.value }
                            })}
                            placeholder="#FF0066"
                            className={`w-24 px-3 py-2 border ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500' 
                                : 'border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                            } rounded-md text-sm focus:outline-none`}
                          />
                        </div>
                      </div>
                    </div>
                  </div> */}
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
        
        {/* Debug View */}
        {activeView === 'debug' && (
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Supabase Connection Troubleshooting
              </h3>
              <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Use this page to diagnose and fix problems with Supabase connection.
              </p>
              
              <div className="mb-4 p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30">
                <h4 className={`font-medium mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Setup Instructions</h4>
                <ol className={`list-decimal ml-5 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                  <li className="mb-1">Create a <code>.env</code> file in your project root</li>
                  <li className="mb-1">Add your Supabase credentials:
                    <pre className="mt-1 p-2 bg-blue-100 dark:bg-blue-900/40 rounded text-xs overflow-x-auto">
                      REACT_APP_SUPABASE_URL=your_supabase_url<br/>
                      REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
                    </pre>
                  </li>
                  <li className="mb-1">Restart your development server</li>
                  <li>Run the SQL from <code>supabase/migrations/20250306000000_create_shared_dashboards.sql</code> in your Supabase SQL editor</li>
                </ol>
              </div>
              
              <div className="flex items-center mb-4">
                <button
                  onClick={toggleFallbackMode}
                  className={`py-2 px-4 rounded ${
                    fallbackMode 
                      ? (darkMode ? 'bg-amber-700 text-white' : 'bg-amber-500 text-white') 
                      : (darkMode ? 'bg-green-700 text-white' : 'bg-green-500 text-white')
                  }`}
                >
                  {fallbackMode ? 'Currently Using Fallback Mode' : 'Currently Using Supabase'}
                </button>
                <div className={`ml-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {fallbackMode 
                    ? 'Click to try using Supabase database storage again' 
                    : 'Click to switch to URL-based fallback mode'}
                </div>
              </div>
            </div>
            
            <SupabaseDebugger />
          </div>
        )}
        
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