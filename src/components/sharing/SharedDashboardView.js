import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';
import SummaryTab from '../dashboard/tabs/SummaryTab';
import SalesTab from '../dashboard/tabs/SalesTab';
import DemographicsTab from '../dashboard/tabs/DemographicsTab';
import OffersTab from '../dashboard/tabs/OffersTab';
import ErrorBoundary from '../ErrorBoundary';

// Same context from SharedDashboardPreview for consistency
const ClientDataContext = React.createContext();
export const useClientData = () => React.useContext(ClientDataContext);

// Wrapper to provide transformed data to tabs 
const TabContentWrapper = ({ children, transformedData }) => {
  return (
    <ClientDataContext.Provider value={transformedData}>
      {children}
    </ClientDataContext.Provider>
  );
};

const SharedDashboardView = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { transformDataForSharing } = useSharing();
  const { 
    getFilteredData, 
    calculateMetrics, 
    getRetailerDistribution,
    getProductDistribution,
    brandNames, 
    clientName,
    brandMapping
  } = useData();
  
  const [error, setError] = useState(null);
  const [shareConfig, setShareConfig] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  
  // Load shared configuration from the share ID
  useEffect(() => {
    try {
      if (!shareId) {
        throw new Error("No share ID provided");
      }
      
      // In a real implementation, this would make an API call
      // For now, we decode from the URL
      const decodedConfig = JSON.parse(atob(shareId + "=="));
      
      // Check if share link is expired
      if (decodedConfig.expiryDate) {
        const expiryDate = new Date(decodedConfig.expiryDate);
        const now = new Date();
        if (expiryDate < now) {
          setIsExpired(true);
        }
      }
      
      setShareConfig(decodedConfig);
      
      // Set the default active tab
      if (decodedConfig.allowedTabs && decodedConfig.allowedTabs.length > 0) {
        setActiveTab(decodedConfig.allowedTabs[0]);
      }
    } catch (err) {
      console.error("Error loading shared dashboard:", err);
      setError("Invalid or expired share link");
    }
  }, [shareId]);
  
  // If still loading or error
  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-4`}>
        <div className={`w-full max-w-md p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Dashboard</h2>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  if (!shareConfig) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-4`}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-pink-600 rounded-full animate-spin"></div>
          <p className="mt-4">Loading shared dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (isExpired) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-4`}>
        <div className={`w-full max-w-md p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-amber-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center mb-4">This Dashboard Link Has Expired</h2>
          <p className="text-center mb-6">
            Please contact {shareConfig.branding?.companyName || 'the dashboard owner'} for an updated link.
          </p>
        </div>
      </div>
    );
  }
  
  // Prepare the data from share configuration
  const clientData = {
    filteredData: getFilteredData ? getFilteredData(shareConfig?.filters) : [],
    metrics: calculateMetrics ? calculateMetrics() : null,
    retailerData: getRetailerDistribution ? getRetailerDistribution() : [],
    productDistribution: getProductDistribution ? getProductDistribution() : [],
    brandMapping: brandMapping || {},
    brandNames: (shareConfig?.hideRetailers ? ['Anonymous Brand'] : brandNames) || [],
    clientName: clientName || 'Client',
    filters: shareConfig?.filters || {}
  };
  
  // Transform data based on sharing config
  const transformedData = transformDataForSharing ? 
    transformDataForSharing({...clientData, shareConfig}) : 
    clientData;
  
  // Check if there's data to display
  const hasData = transformedData?.filteredData?.length > 0;
  
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`w-full border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            {shareConfig.branding?.showLogo && (
              <div 
                className="h-10 w-10 rounded-full mr-3 flex items-center justify-center"
                style={{ backgroundColor: shareConfig.branding.primaryColor || '#FF0066' }}
              >
                <span className="text-white font-bold text-lg">
                  {(shareConfig.branding.companyName || 'C').slice(0, 1)}
                </span>
              </div>
            )}
            <div>
              <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {shareConfig.metadata?.clientName || 'Client'} Dashboard
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Shared by {shareConfig.branding?.companyName || 'Your Company'}
              </p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Client note if provided */}
        {shareConfig.clientNote && (
          <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-800'}`}>
            <p>{shareConfig.clientNote}</p>
          </div>
        )}
        
        {/* Tabs navigation if multiple tabs are allowed */}
        {shareConfig.allowedTabs.length > 1 && (
          <div className={`mb-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-wrap">
              {shareConfig.allowedTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
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
        
        {/* Main content based on active tab */}
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
            <ErrorBoundary>
              <TabContentWrapper transformedData={transformedData}>
                {/* Render the appropriate tab content */}
                {activeTab === 'summary' && (
                  <ErrorBoundary>
                    <SummaryTab isSharedView={true} />
                  </ErrorBoundary>
                )}
                {activeTab === 'sales' && (
                  <ErrorBoundary>
                    <SalesTab isSharedView={true} />
                  </ErrorBoundary>
                )}
                {activeTab === 'demographics' && (
                  <ErrorBoundary>
                    <DemographicsTab isSharedView={true} />
                  </ErrorBoundary>
                )}
                {activeTab === 'offers' && (
                  <ErrorBoundary>
                    <OffersTab isSharedView={true} />
                  </ErrorBoundary>
                )}
              </TabContentWrapper>
            </ErrorBoundary>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className={`w-full border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Shared with you by {shareConfig.branding?.companyName || 'Your Company'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SharedDashboardView;