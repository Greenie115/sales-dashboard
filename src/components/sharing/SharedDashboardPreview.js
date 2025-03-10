import React, { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';
import { ClientDataProvider } from '../../context/ClientDataContext';
import SummaryTab from '../dashboard/tabs/SummaryTab';
import SalesTab from '../dashboard/tabs/SalesTab';
import DemographicsTab from '../dashboard/tabs/DemographicsTab';
import OffersTab from '../dashboard/tabs/OffersTab';

const SharedDashboardPreview = ({ onClose }) => {
  const { darkMode } = useTheme();
  const {
    shareConfig,
    transformDataForSharing,
    previewActiveTab,
    setPreviewActiveTab
  } = useSharing();

  const {
    activeTab, // Get the current active tab from DataContext
    salesData,
    getFilteredData,
    calculateMetrics,
    getRetailerDistribution,
    getProductDistribution,
    brandNames,
    clientName,
    brandMapping
  } = useData();

  // Effect to initialize preview tab or sync with current tab
  useEffect(() => {
    console.log("SharedDashboardPreview initializing with shareConfig:", {
      shareConfig: shareConfig,
      allowedTabs: shareConfig.allowedTabs,
      configActiveTab: shareConfig.activeTab,
      previewActiveTab: previewActiveTab,
      mainActiveTab: activeTab
    });
    
    // Use the active tab from the config, and ensure it's in allowedTabs
    if (shareConfig.activeTab && shareConfig.allowedTabs.includes(shareConfig.activeTab)) {
      // If the config has an active tab and it's allowed, use it
      if (previewActiveTab !== shareConfig.activeTab) {
        console.log("Setting previewActiveTab to config's activeTab:", shareConfig.activeTab);
        setPreviewActiveTab(shareConfig.activeTab);
      }
    } 
    // Fallback to the first allowed tab if needed
    else if (shareConfig.allowedTabs && shareConfig.allowedTabs.length > 0) {
      // If no explicitly set active tab, use the first allowed tab
      console.log("Setting previewActiveTab to first allowed tab:", shareConfig.allowedTabs[0]);
      setPreviewActiveTab(shareConfig.allowedTabs[0]);
    }
  }, [shareConfig, shareConfig.activeTab, shareConfig.allowedTabs, previewActiveTab, setPreviewActiveTab, activeTab]);

  // IMPORTANT: Use precomputed data if available
  const precomputed = shareConfig.precomputedData;
  const filteredData = precomputed?.filteredData || (getFilteredData ? getFilteredData(shareConfig.filters) : []);
  const metrics = precomputed?.metrics || (calculateMetrics ? calculateMetrics() : null);
  const retailerData = precomputed?.retailerData || (getRetailerDistribution ? getRetailerDistribution() : []);
  const productDistribution = precomputed?.productDistribution || (getProductDistribution ? getProductDistribution() : []);
  const usedBrandNames = precomputed?.brandNames || brandNames || [];
  const usedClientName = shareConfig.metadata?.clientName || clientName || 'Client';
  const usedBrandMapping = precomputed?.brandMapping || brandMapping || {};

  // Create data object to pass to the tabs
  const clientData = {
    salesData: precomputed?.salesData || [],
    filteredData,
    metrics,
    retailerData,
    productDistribution,
    brandMapping: usedBrandMapping,
    brandNames: usedBrandNames,
    clientName: usedClientName,
    filters: shareConfig?.filters || {},
    // Add flag to indicate this is a shared view
    isSharedView: true,
    hasData: filteredData && filteredData.length > 0, // Important: set hasData flag
    // Add getter functions
    getFilteredData: () => filteredData,  
    calculateMetrics: () => metrics,
    getRetailerDistribution: () => retailerData,
    getProductDistribution: () => productDistribution,
    // Empty setter functions for data context compatibility
    setSelectedProducts: () => { },
    setSelectedRetailers: () => { },
    setDateRange: () => { },
    setActiveTab: () => { } // This is just a placeholder, we manage activeTab separately
  };

  // Transform data based on sharing config
  const transformedData = transformDataForSharing ? transformDataForSharing(clientData) : clientData;

  // Check if preview has data
  const hasData = transformedData?.filteredData?.length > 0;

  // If expiry date is set, calculate days remaining
  const daysRemaining = shareConfig.expiryDate ?
    Math.ceil((new Date(shareConfig.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  // Log current state to help debug
  console.log("Preview rendering with tab states:", {
    previewActiveTab,
    shareConfigActiveTab: shareConfig.activeTab,
    mainActiveTab: activeTab,
    allowedTabs: shareConfig.allowedTabs
  });

  // Handle tab change
  const handleTabChange = (tab) => {
    console.log("Changing preview tab to:", tab);
    // Update both the preview state and the config
    setPreviewActiveTab(tab);
    
    // Update the activeTab in the shareConfig as well
    shareConfig.activeTab = tab;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className={`relative w-full h-full max-w-7xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Client View Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center">
            {shareConfig.branding.showLogo && (
              <div
                className="h-8 w-8 rounded-full mr-3 flex items-center justify-center"
                style={{ backgroundColor: shareConfig.branding.primaryColor }}
              >
                <span className="text-white font-bold">
                  {shareConfig.branding.companyName.slice(0, 1)}
                </span>
              </div>
            )}
            <div>
              <h1 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Dashboard Preview
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Shared by {shareConfig.branding.companyName}
              </p>
            </div>
          </div>

          {/* Preview Controls */}
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
              Preview Mode
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`text-9xl font-bold opacity-5 transform rotate-45 select-none ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>
            PREVIEW
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Client note if provided */}
          {shareConfig.clientNote && (
            <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-800'}`}>
              <p>{shareConfig.clientNote}</p>
            </div>
          )}

          {/* Expiry notice if set */}
          {daysRemaining !== null && (
            <div className={`mb-6 p-3 rounded-lg text-sm flex items-center
              ${daysRemaining <= 3
                ? (darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-800')
                : (darkMode ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-50 text-yellow-800')
              }`}
            >
              <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {daysRemaining > 0
                  ? `This dashboard link will expire in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`
                  : 'This dashboard link has expired.'}
              </span>
            </div>
          )}

          {/* Debug info in development mode */}
          {process.env.NODE_ENV === 'development' && (
            <div className={`mb-6 p-3 rounded-lg text-xs ${
              darkMode ? 'bg-gray-800 text-gray-300 border border-gray-700' : 
                         'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              <strong>Debug:</strong> Current Tab: {previewActiveTab} | 
              Config Active Tab: {shareConfig.activeTab} | 
              Allowed Tabs: {shareConfig.allowedTabs.join(', ')}
            </div>
          )}

          {/* Tab navigation */}
          {shareConfig.allowedTabs && shareConfig.allowedTabs.length > 1 && (
            <div className={`mb-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex space-x-2">
                {shareConfig.allowedTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`py-3 px-4 border-b-2 font-medium text-sm ${previewActiveTab === tab
                        ? `border-pink-500 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`
                        : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                      }`}
                  >
                    <span className="capitalize">{tab}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main content */}
          <div className={`bg-white dark:bg-gray-800 shadow rounded-lg ${!hasData ? 'p-6' : ''}`}>
            {!hasData ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className={`mt-2 text-base font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>No data available</h3>
                <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  There is no data to display with the current filters.
                </p>
              </div>
            ) : (
              <ClientDataProvider clientData={transformedData}>
                {/* Render appropriate tab content based on previewActiveTab */}
                {previewActiveTab === 'summary' && <SummaryTab isSharedView={true} />}
                {previewActiveTab === 'sales' && <SalesTab isSharedView={true} />}
                {previewActiveTab === 'demographics' && <DemographicsTab isSharedView={true} />}
                {previewActiveTab === 'offers' && <OffersTab isSharedView={true} />}
              </ClientDataProvider>
            )}
          </div>
        </div>

        {/* Footer with shared branding */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <div className="flex items-center">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Shared with you by {shareConfig.branding.companyName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedDashboardPreview;