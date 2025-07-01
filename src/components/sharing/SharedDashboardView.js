import React, { useState, useEffect, useMemo } from 'react'; // Add useMemo import
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
// useSharing and useData imports removed
import { ClientDataProvider } from '../../context/ClientDataContext'; // To provide snapshot data
import supabase from '../../utils/supabase'; // Import supabase for auth check
import { calculateMetrics } from '../../utils/dataProcessing'; // Import if needed for dataForProvider
import SummaryTab from '../dashboard/tabs/SummaryTab';
import SalesTab from '../dashboard/tabs/SalesTab';
import DemographicsTab from '../dashboard/tabs/DemographicsTab';
import OffersTab from '../dashboard/tabs/OffersTab';
import ErrorBoundary from '../ErrorBoundary';
import sharingService from '../../services/sharingService';

// Helper functions getClientDisplayName and createSharedDataContext removed.

const SharedDashboardView = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  // Unused context hooks/setters removed.

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // Default active tab
  const [isExpired, setIsExpired] = useState(false);
  const [clientData, setClientData] = useState({ // State to hold snapshot and filters
      filterParams: null,
      dataSnapshot: null,
      allowedTabs: ['summary', 'sales', 'demographics', 'offers'], // Default or fetch if stored
      // shareConfig: {} // Removed placeholder, specific config can be added if needed
  });
  const [clientDisplayName, setClientDisplayName] = useState('Shared Dashboard'); // Default name
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // isBase64ShareId function removed.

  // Check authentication status first
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        // Optional: Redirect to login immediately if not authenticated
        // navigate('/login'); // Or your login route
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [navigate]);

  // Load shared view data if authenticated
  useEffect(() => {
    // Define the async function to fetch data
    const fetchSharedData = async () => {
      setLoading(true);
      setError(null);
      setIsExpired(false);

      try {
        if (!shareId) {
          throw new Error("No share ID provided");
        }

        console.log("Fetching shared dashboard with ID:", shareId);
        const result = await sharingService.getSharedDashboard(shareId);
        console.log("Result from getSharedDashboard:", result);

        if (result.expired) {
          console.log('Dashboard has expired');
          setIsExpired(true);
          return;
        }

        if (!result.shareConfig) {
          console.error('Missing share configuration in result:', result);
          setError("Shared dashboard data is invalid or incomplete.");
          return;
        }

        // Store fetched data successfully
        const config = result.shareConfig;
        console.log('Processing share configuration:', config);

        // Validate required data
        if (!config.precomputedData) {
          console.error('Missing precomputed data in share config');
          setError("Shared dashboard is missing required data.");
          return;
        }

        // Set client data from the configuration
        setClientData(prev => ({
          ...prev,
          filterParams: config.filters || {},
          dataSnapshot: config.precomputedData || {},
          allowedTabs: Array.isArray(config.allowedTabs) ? config.allowedTabs : ['summary'],
          activeTab: config.activeTab || 'summary'
        }));

        console.log('Client data set successfully');

        // Set active tab from the shared dashboard
        if (config.activeTab &&
            config.allowedTabs &&
            Array.isArray(config.allowedTabs) &&
            config.allowedTabs.includes(config.activeTab)) {
          setActiveTab(config.activeTab);
          console.log(`Active tab set to: ${config.activeTab}`);
        } else {
          setActiveTab('summary'); // Default tab
          console.log('Active tab defaulted to summary');
        }

        // Set client display name
        let displayName = 'Shared Dashboard';

        if (config.clientName) {
          displayName = config.clientName;
        } else if (config.metadata && config.metadata.clientName) {
          displayName = config.metadata.clientName;
        } else if (config.metadata && Array.isArray(config.metadata.brandNames) && config.metadata.brandNames.length > 0) {
          displayName = config.metadata.brandNames.join(', ');
        }

        setClientDisplayName(displayName);
        console.log(`Client display name set to: ${displayName}`);

        console.log('Dashboard loaded successfully');
      } catch (err) {
        console.error("Error loading shared dashboard:", err);
        setError(err.message || "Failed to load shared dashboard.");
        // Clear potentially incomplete data on error
        setClientData(prev => ({ ...prev, filterParams: null, dataSnapshot: null }));
      } finally {
        setLoading(false); // Ensure loading is set to false in all cases
      }
    };

    // Only fetch data if authentication is complete and successful
    if (!authLoading) {
      if (isAuthenticated) {
        fetchSharedData(); // Call the async function here
      } else {
        // If not authenticated, stop loading and set an error message
        setLoading(false);
        setError("Authentication required to view this dashboard.");
        console.log("User not authenticated, cannot load shared view.");
      }
    }
    // Effect depends on auth status and shareId
  }, [shareId, authLoading, isAuthenticated]); // Removed navigate dependency

  // Handle tab selection
  const handleTabChange = (tab) => {
    console.log("Changing active tab to:", tab);
    // Use allowedTabs from clientData state
    if (tab && clientData.allowedTabs?.includes(tab)) {
      setActiveTab(tab);
    }
  };

  // If still loading
  // Add check for auth loading and authentication status
  if (authLoading || loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-4`}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-pink-600 rounded-full animate-spin"></div>
          <p className="mt-4">{authLoading ? 'Checking authentication...' : 'Loading shared dashboard...'}</p>
        </div>
      </div>
    );
  }

  // Authentication check moved inside the loading block

  // If error
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
            Please contact the person who shared this link for an updated version.
          </p>
        </div>
      </div>
    );
  }

  // Removed !shareConfig check. Error state handles loading failures.

  // Check for incomplete data *after* loading/error/expiry checks.
  const isDataIncomplete = !loading && !error && !isExpired && (!clientData.dataSnapshot || !clientData.filterParams);

  // This useEffect now runs unconditionally, but the setError call inside depends on isDataIncomplete.
  useEffect(() => {
    if (isDataIncomplete) {
       console.error("Snapshot data is missing after successful load attempt", clientData);
       setError("Shared dashboard data is incomplete or missing.");
    }
    // This effect should run when isDataIncomplete changes.
  }, [isDataIncomplete]);

  // Construct the data object needed by ClientDataProvider using useMemo.
  // This hook is now called unconditionally.
  const dataForProvider = useMemo(() => {
    // Internal logic handles data readiness.
    if (clientData.dataSnapshot && clientData.filterParams) {
      const snapshotMetrics = calculateMetrics(clientData.dataSnapshot);
      return {
        filteredData: clientData.dataSnapshot,
        filters: clientData.filterParams,
        metrics: snapshotMetrics,
        isSharedView: true,
        // Add other derived data/config as needed
      };
    }
    return null; // Return null if data isn't ready
  }, [clientData.dataSnapshot, clientData.filterParams]); // Dependencies remain the same

  // Check if data is ready for rendering using the memoized value.
  const hasData = !!dataForProvider?.filteredData?.length;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Storage type indicator - Only visible in development */}
      {/* Supabase/Fallback mode indicator removed */}

      {/* Header */}
      <header className={`w-full border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            {/* TODO: Add branding logo if stored/fetched */}
            {/* Example placeholder */}
             <div className="h-10 w-10 rounded-full mr-3 flex items-center justify-center bg-pink-600">
                 <span className="text-white font-bold text-lg">S</span>
             </div>
            <div>
              <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {clientDisplayName}
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Shared Dashboard {/* TODO: Add 'Shared by' if branding info available */}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Client note if provided */}
        {/* TODO: Add client note if stored/fetched */}
        {/* {clientData.shareConfig?.clientNote && ( ... )} */}

        {/* Tabs navigation if multiple tabs are allowed */}
        {/* Use allowedTabs from clientData state */}
        {clientData.allowedTabs && clientData.allowedTabs.length > 1 && (
          <div className={`mb-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-wrap">
              {clientData.allowedTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
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
              {/* Provide the memoized data object */}
              <ClientDataProvider clientData={dataForProvider}>
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
              </ClientDataProvider>
            </ErrorBoundary>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={`w-full border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Shared Dashboard View
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SharedDashboardView;