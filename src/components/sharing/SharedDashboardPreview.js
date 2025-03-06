import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';
import SummaryTab from '../dashboard/tabs/SummaryTab';
import SalesTab from '../dashboard/tabs/SalesTab';
import DemographicsTab from '../dashboard/tabs/DemographicsTab';
import OffersTab from '../dashboard/tabs/OffersTab';

const ClientDataContext = React.createContext();
export const useClientData = () => React.useContext(ClientDataContext);

const TabContentWrapper = ({ children, transformedData }) => {
  return (
    <ClientDataContext.Provider value={transformedData}>
      {children}
    </ClientDataContext.Provider>
  );
};

const SharedDashboardPreview = ({ onClose }) => {
  const { darkMode } = useTheme();
  const { 
    shareConfig, 
    transformDataForSharing 
  } = useSharing();
  
  const { 
    getFilteredData, 
    calculateMetrics, 
    getRetailerDistribution,
    getProductDistribution,
    brandNames, 
    clientName,
    brandMapping,
    filters
  } = useData();
  
  // State for currently active tab in the preview
  const [activeTab, setActiveTab] = useState(shareConfig.allowedTabs[0] || 'summary');
  
  // Get data for preview
  const filteredData = getFilteredData ? getFilteredData() : [];
  const metrics = calculateMetrics ? calculateMetrics() : null;
  const retailerData = getRetailerDistribution ? getRetailerDistribution() : [];
  const productDistribution = getProductDistribution ? getProductDistribution() : [];
  
  // Create data object to pass to the tabs
  const clientData = {
    filteredData,
    metrics,
    retailerData,
    productDistribution,
    brandMapping,
    brandNames: shareConfig.hideRetailers ? ['Anonymous Brand'] : brandNames,
    clientName,
    filters: shareConfig.filters || filters, // Use sharing filters or current filters
  };
  
  // Transform the data based on sharing config
  const transformedData = transformDataForSharing(clientData);
  
  // Check if preview has data
  const hasData = transformedData?.filteredData?.length > 0;
  
  // If expiry date is set, calculate days remaining
  const daysRemaining = shareConfig.expiryDate ? 
    Math.ceil((new Date(shareConfig.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  
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
                {clientName || 'Client'} Dashboard
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
          
          {/* Tab navigation */}
          {shareConfig.allowedTabs.length > 1 && (
            <div className={`mb-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex space-x-2">
                {shareConfig.allowedTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-4 border-b-2 font-medium text-sm ${
                      activeTab === tab
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
          <div className={`bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden ${!hasData ? 'p-6' : ''}`}>
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
              <TabContentWrapper transformedData={transformedData}>
                {/* Render the appropriate tab content */}
                {activeTab === 'summary' && <SummaryTab isSharedView={true} />}
                {activeTab === 'sales' && <SalesTab isSharedView={true} />}
                {activeTab === 'demographics' && <DemographicsTab isSharedView={true} />}
                {activeTab === 'offers' && <OffersTab isSharedView={true} />}
              </TabContentWrapper>
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
          
          {/* Show only if we need client acknowledgment */}
          {false && (
            <button
              className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Acknowledge Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedDashboardPreview;