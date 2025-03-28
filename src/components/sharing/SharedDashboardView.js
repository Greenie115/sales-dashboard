// SharedDashboardView.js - Refactored to fetch config and download raw data from Supabase Storage
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import _ from 'lodash';
import { useTheme } from '../../context/ThemeContext';
import { ClientDataProvider } from '../../context/ClientDataContext';
import supabase from '../../utils/supabase'; // Import supabase with correct path
import { filterSalesData, computeMetrics, computeDemographicData, computeRetailerDistribution, computeProductDistribution } from '../../utils/sharedDataUtils'; // Keep utils for client-side computation
import { inspectObject, validateSharedDashboardData } from '../../utils/debugUtils'; // Keep debug utilities
import SummaryTab from '../dashboard/tabs/SummaryTab';
import SalesTab from '../dashboard/tabs/SalesTab';
import DemographicsTab from '../dashboard/tabs/DemographicsTab';
import OffersTab from '../dashboard/tabs/OffersTab';
import ErrorBoundary from '../ErrorBoundary';
import SharedFilterPanel from '../filters/SharedFilterPanel';
import sharingService from '../../services/sharingService'; // Keep service

/**
 * SharedDashboardView component - Fetches configuration and raw data via shareId.
 */
const SharedDashboardView = () => {
  const { shareId } = useParams(); // UUID from URL
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  // State variables
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareMetadata, setShareMetadata] = useState(null); // Stores metadata from DB record
  const [initialFilters, setInitialFilters] = useState({}); // Stores initial filters from DB record
  const [rawData, setRawData] = useState(null); // Stores the full raw data downloaded from Storage
  const [activeTab, setActiveTab] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [clientDisplayName, setClientDisplayName] = useState('Client Dashboard');
  const [renderReady, setRenderReady] = useState(false);
  const [allowClientFiltering, setAllowClientFiltering] = useState(false);

  // Client-side filtering state (operates on the full rawData if allowed)
  const [clientFilters, setClientFilters] = useState({
    selectedProducts: ['all'], // Default to 'all'
    selectedRetailers: ['all'], // Default to 'all'
    dateRange: 'all', // Default to 'all'
    startDate: '',
    endDate: '',
    selectedMonth: '' // Default to empty string
  });

  // Handle client filtering
  const handleClientFilter = (filterType, value) => {
    if (!allowClientFiltering) return; // Check top-level flag

    console.log(`[SharedView] Client filter change: ${filterType} =`, value);

    setClientFilters(prev => {
      let newValue = value;
      // Ensure 'all' is handled correctly when selecting specific items
      if (Array.isArray(value)) {
        if (value.includes('all')) {
          newValue = ['all']; // If 'all' is selected, only keep 'all'
        } else {
          newValue = value.filter(v => v !== 'all'); // Remove 'all' if specific items are chosen
          if (newValue.length === 0) {
             newValue = ['all']; // If selection becomes empty, default back to 'all'
          }
        }
      }
      return {
        ...prev,
        [filterType]: newValue
      };
    });
  };

  // Get filtered data using the FULL raw data if client filtering is active
  const getClientFilteredData = useCallback(() => {
    if (!rawData || !Array.isArray(rawData)) {
      console.warn("[SharedView] No raw data available for filtering.");
      return [];
    }

    let filtersToApply = {};

    // Determine if any client filters are active (different from default 'all' or empty)
    const clientFiltersActive =
      (clientFilters.selectedProducts && !_.isEqual(clientFilters.selectedProducts, ['all'])) ||
      (clientFilters.selectedRetailers && !_.isEqual(clientFilters.selectedRetailers, ['all'])) ||
      (clientFilters.dateRange && clientFilters.dateRange !== 'all') ||
      (clientFilters.selectedMonth && clientFilters.selectedMonth !== '') ||
      (clientFilters.dateRange === 'custom' && clientFilters.startDate && clientFilters.endDate);

    if (allowClientFiltering && clientFiltersActive) {
      // Use client filters if allowed and active
      filtersToApply = clientFilters;
      console.log("[SharedView] Applying client filters:", filtersToApply);
    } else if (initialFilters && Object.keys(initialFilters).length > 0) {
      // Otherwise, use initial filters if they exist
      filtersToApply = initialFilters;
      console.log("[SharedView] Applying initial filters:", filtersToApply);
    } else {
      // No filters to apply, return raw data
      console.log("[SharedView] No filters applied, returning raw data.");
      return rawData;
    }

    // Apply the chosen filters to the full raw data
    try {
      return filterSalesData(rawData, filtersToApply);
    } catch (e) {
      console.error("[SharedView] Error applying filters:", e);
      return rawData; // Fallback to raw data on error
    }
  }, [rawData, clientFilters, allowClientFiltering, initialFilters]);

  // Get client display name from the fetched metadata
  const getClientDisplayName = (metadata) => {
    return metadata?.clientName || 'Client';
  };

  // Process survey responses - Operates on the currently filtered data
  const processSurveyResponses = (filteredData, questionNumber) => {
     if (!filteredData || !Array.isArray(filteredData) || filteredData.length === 0 || !questionNumber) {
      return { responseData: [], ageDistribution: [], genderDistribution: [] };
    }
    try {
      const propKey = `proposition_${questionNumber}`;
      const questionKey = `question_${questionNumber}`;

      const validResponses = filteredData.filter(row =>
        row && row[propKey] && typeof row[propKey] === 'string' && row[propKey].trim() !== ''
      );

      if (validResponses.length === 0) return { responseData: [] };

      const responseCount = {};
      validResponses.forEach(row => {
        const response = row[propKey];
        responseCount[response] = (responseCount[response] || 0) + 1;
      });

      const responseData = Object.entries(responseCount).map(([fullResponse, count]) => {
        return {
          fullResponse,
          count,
          percentage: ((count / validResponses.length) * 100).toFixed(1)
        };
      }).sort((a, b) => b.count - a.count);

      return {
        responseData,
        questionText: validResponses[0]?.[questionKey] || `Question ${questionNumber}`,
        validResponses
      };
    } catch (error) {
      console.error("[SharedView] Error processing survey responses:", error);
      return { responseData: [] };
    }
  };

  // Create context value using the raw data and metadata
  const createSharedDataContext = (currentRawData, currentMetadata) => {
    if (!currentRawData || !currentMetadata) {
       console.warn("[SharedView] Cannot create context, missing rawData or metadata");
       return {};
    }

    const filteredData = getClientFilteredData(); // Get currently filtered data
    console.log(`[SharedView] Filtered data length for context: ${filteredData.length}`);

    // Compute metrics and distributions based on the *filtered* data
    const metrics = computeMetrics(filteredData);
    const retailerDistribution = computeRetailerDistribution(filteredData);

    // TODO: Need brandMapping for product distribution. Where does it come from?
    // Assuming it might be part of rawData or metadata for now.
    // Let's try to derive it from rawData if possible, otherwise use metadata.
    let brandMapping = currentMetadata?.brandMapping || {};
    if (currentRawData.length > 0 && Object.keys(brandMapping).length === 0) {
       // Attempt to derive from rawData if not in metadata (this might be slow/inefficient)
       console.warn("[SharedView] BrandMapping missing, attempting to derive from raw data (may be slow). Consider adding to metadata.");
       // This requires the brand detection utils, which might not be ideal here.
       // For now, leave it potentially empty or rely on metadata.
       // const uniqueProducts = _.uniq(currentRawData.map(item => item.product_name)).filter(Boolean);
       // brandMapping = identifyBrandPrefixes(uniqueProducts); // Requires identifyBrandPrefixes util
    }

    const productDistribution = computeProductDistribution(filteredData, brandMapping);
    const demographicData = computeDemographicData(filteredData); // Compute demographics

    const contextValue = {
      // Core data
      salesData: currentRawData, // Provide full raw data
      filteredData: filteredData, // Provide currently filtered data
      brandMapping: brandMapping, // Provide brand mapping
      brandNames: currentMetadata?.brandNames || [],
      clientName: currentMetadata?.clientName || 'Client',
      hiddenCharts: currentMetadata?.hiddenCharts || [],
      metrics, // Computed metrics based on filtered data
      retailerDistribution, // Computed based on filtered data
      productDistribution, // Computed based on filtered data
      demographicData, // Computed based on filtered data
      // surveyData: null, // Survey data needs separate handling/computation

      // Flags and metadata
      isSharedView: true,
      hasData: Boolean(currentRawData && currentRawData.length > 0), // Check raw data presence
      allowClientFiltering: allowClientFiltering,

      // Methods
      getFilteredData: getClientFilteredData, // Provides currently filtered data
      calculateMetrics: () => metrics || {}, // Return computed metrics
      getRetailerDistribution: () => retailerDistribution || [],
      getProductDistribution: () => productDistribution || [],
      getSurveyResponses: (qNum) => processSurveyResponses(filteredData, qNum), // Process from filtered data

      // Client filtering methods (passed down to panel)
      setSelectedProducts: (products) => handleClientFilter('selectedProducts', products),
      setSelectedRetailers: (retailers) => handleClientFilter('selectedRetailers', retailers),
      setDateRange: (range) => handleClientFilter('dateRange', range),
      setStartDate: (date) => handleClientFilter('startDate', date),
      setEndDate: (date) => handleClientFilter('endDate', date),
      setSelectedMonth: (month) => handleClientFilter('selectedMonth', month),

      // Original filters (read-only)
      originalFilters: initialFilters || {},

      // Add validation info for debugging
      _dataSource: 'raw',
      _dataSampled: false, // Data is not sampled in this approach
    };
    console.log("[SharedView] Context value created:", {
       ...contextValue,
       salesData: `Array(${contextValue.salesData?.length})`, // Avoid logging large arrays
       filteredData: `Array(${contextValue.filteredData?.length})`
    });
    return contextValue;
  };

  // Download and process raw data from storage
  const downloadAndProcessData = async (storageId) => {
    console.log("[SharedView] Downloading raw data from storage:", storageId);
    try {
      const { data: blob, error: downloadError } = await supabase.downloadFromStorage('raw-datasets', storageId);

      if (downloadError) {
        console.error("[SharedView] Supabase storage download error:", downloadError);
        // Handle specific errors like "Object not found"
        if (downloadError.message?.includes('Object not found')) {
           throw new Error(`Shared data file not found in storage (ID: ${storageId}). It may have been deleted.`);
        }
        throw new Error(`Failed to download shared data: ${downloadError.message}`);
      }

      if (!blob) {
        throw new Error("Downloaded data is empty.");
      }

      console.log("[SharedView] Download successful, processing JSON...");
      const text = await blob.text();
      const parsedData = JSON.parse(text);
      console.log(`[SharedView] JSON parsed successfully. Records: ${parsedData?.length}`);

      // Basic validation
      if (!Array.isArray(parsedData)) {
        throw new Error("Downloaded data is not a valid array.");
      }

      return parsedData;

    } catch (err) {
      console.error("[SharedView] Error downloading or processing data:", err);
      throw new Error(`Failed to load or parse shared data: ${err.message}`);
    }
  };

  // Load shared configuration and raw data
  useEffect(() => {
    const fetchSharedData = async () => {
      console.log("[SharedView] useEffect triggered. Share ID:", shareId);
      try {
        if (!shareId) {
          throw new Error("No share ID provided");
        }

        setLoading(true);
        setRenderReady(false);
        setError(null);
        setRawData(null); // Reset raw data
        setShareMetadata(null); // Reset metadata
        setInitialFilters({}); // Reset initial filters
        setClientFilters({ // Reset client filters to default
           selectedProducts: ['all'],
           selectedRetailers: ['all'],
           dateRange: 'all',
           startDate: '',
           endDate: '',
           selectedMonth: ''
        });

        console.log("[SharedView] Fetching share config from Supabase:", shareId);
        const { expired, storageId, initialFilters: fetchedFilters, metadata } = await sharingService.getSharedDashboard(shareId);

        console.log("[SharedView] Fetched config:", { expired, storageId, fetchedFilters, metadata });
        inspectObject(metadata, "[SharedView] Fetched Metadata Inspection");
        inspectObject(fetchedFilters, "[SharedView] Fetched Initial Filters Inspection");


        if (expired) {
          console.log("Share link is expired.");
          setIsExpired(true);
          setShareMetadata(metadata); // Keep metadata for branding/message
          setLoading(false);
          return;
        }

        if (!storageId) {
          throw new Error("Share configuration is missing the data storage ID.");
        }

        // Store metadata and initial filters
        const currentMetadata = metadata || {};
        const currentInitialFilters = fetchedFilters || {};
        setShareMetadata(currentMetadata);
        setInitialFilters(currentInitialFilters);
        const clientFilteringEnabled = currentMetadata?.allowClientFiltering || false;
        setAllowClientFiltering(clientFilteringEnabled);
        console.log(`[SharedView] Client filtering allowed: ${clientFilteringEnabled}`);

        // Set client display name early
        const displayName = getClientDisplayName(currentMetadata);
        setClientDisplayName(displayName + ' Dashboard');
        console.log("[SharedView] Set client display name to:", displayName + ' Dashboard');

        // Download and process the raw data
        const downloadedRawData = await downloadAndProcessData(storageId);
        setRawData(downloadedRawData);

        // Set active tab from metadata, ensuring it's allowed
        const allowed = currentMetadata?.allowedTabs || ['summary'];
        const defaultTab = allowed[0];
        const targetTab = currentMetadata?.activeTab && allowed.includes(currentMetadata.activeTab) ? currentMetadata.activeTab : defaultTab;
        console.log("[SharedView] Setting active tab:", targetTab, "Allowed:", allowed);
        setActiveTab(targetTab);

        // Apply initial filters to client filter state as the starting point
        if (currentInitialFilters && Object.keys(currentInitialFilters).length > 0) {
           console.log("[SharedView] Setting initial filters as starting point for client state:", currentInitialFilters);
           setClientFilters(prev => ({
             ...prev, // Keep defaults like 'all'
             ...currentInitialFilters // Override with initial filters
           }));
        }

        // Mark rendering as ready
        setRenderReady(true);

      } catch (err) {
        console.error("[SharedView] Error loading shared dashboard:", err);
        // Provide more specific error messages
        let displayError = "Could not load the shared dashboard.";
        if (err.message === 'Shared dashboard not found') {
           displayError = "This shared dashboard link is invalid or has been deleted.";
        } else if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
           displayError = "Network error: Could not connect to the server.";
        } else if (err.message.includes('Shared data file not found')) {
           displayError = "The data associated with this share link could not be found. It might have been deleted.";
        } else {
           displayError = `An error occurred: ${err.message}`;
        }
        setError(displayError);
      } finally {
         setLoading(false); // Ensure loading is set to false in all cases
      }
    };

    fetchSharedData();
  }, [shareId, navigate]); // Added navigate to dependencies

  // Handle tab selection
  const handleTabChange = (tab) => {
    console.log("Changing active tab to:", tab);
    if (tab && shareMetadata?.allowedTabs?.includes(tab)) { // Check against metadata
      setActiveTab(tab);
    } else {
       console.warn("Attempted to switch to disallowed tab:", tab);
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-4`}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-pink-600 rounded-full animate-spin"></div>
          <p className="mt-4">Loading shared dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Display specific error messages
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-4`}>
        <div className={`w-full max-w-md p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center mb-4">Error Loading Dashboard</h2>
          <p className="text-center mb-6">{error}</p> {/* Display the specific error */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/')} // Navigate to base path
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              Go to Main Dashboard
            </button>
          </div>
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
          <h2 className="text-xl font-bold text-center mb-4">Dashboard Link Expired</h2>
          <p className="text-center mb-6">
            This link has expired. Please contact {shareMetadata?.branding?.companyName || 'the dashboard owner'} for an updated link.
          </p>
        </div>
      </div>
    );
  }

  // If data isn't ready (should be caught by loading/error states mostly)
  if (!renderReady || !rawData || !shareMetadata || !activeTab) {
     console.warn("[SharedView] Render readiness check failed:", { renderReady, rawData, shareMetadata, activeTab });
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-4`}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-pink-600 rounded-full animate-spin"></div>
          <p className="mt-4">Preparing dashboard data...</p>
        </div>
      </div>
    );
  }

  // Create the context value using the raw data and metadata
  const sharedDataContextValue = createSharedDataContext(rawData, shareMetadata);

  // Check if there's meaningful data to display
  const hasDisplayableData = sharedDataContextValue.hasData;
  console.log("[SharedView] hasDisplayableData check:", hasDisplayableData);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`w-full border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            {shareMetadata.branding?.showLogo && (
              <div
                className="h-10 w-10 rounded-full mr-3 flex items-center justify-center"
                style={{ backgroundColor: shareMetadata.branding.primaryColor || '#FF0066' }}
              >
                <span className="text-white font-bold text-lg">
                  {(shareMetadata.branding.companyName || 'C').slice(0, 1)}
                </span>
              </div>
            )}
            <div>
              <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {clientDisplayName}
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Shared by {shareMetadata.branding?.companyName || 'Shopmium Insights'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Client note */}
        {shareMetadata.clientNote && (
          <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-800'}`}>
            <p>{shareMetadata.clientNote}</p>
          </div>
        )}

        {/* Tabs navigation */}
        {shareMetadata.allowedTabs && shareMetadata.allowedTabs.length > 1 && (
          <div className={`mb-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-wrap">
              {shareMetadata.allowedTabs.map(tab => (
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

        {/* Main content area */}
        <div className={`bg-white dark:bg-gray-800 shadow rounded-lg ${!hasDisplayableData ? 'p-6' : ''}`}>
          {!hasDisplayableData ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className={`mt-2 text-base font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>No data available</h3>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                There is no data to display for this shared view{allowClientFiltering ? ' with the current filters' : ''}.
              </p>
            </div>
          ) : (
            <ErrorBoundary>
              {/* Provide the processed context value */}
              <ClientDataProvider clientData={sharedDataContextValue}>

                {/* Filter Panel - only show if client filtering is allowed */}
                {allowClientFiltering && (
                  <SharedFilterPanel
                    // Pass the FULL rawData for deriving filter options
                    salesData={rawData || []}
                    // Use client filter state
                    selectedProducts={clientFilters.selectedProducts}
                    selectedRetailers={clientFilters.selectedRetailers}
                    dateRange={clientFilters.dateRange}
                    startDate={clientFilters.startDate}
                    endDate={clientFilters.endDate}
                    selectedMonth={clientFilters.selectedMonth}
                    // Pass filter update handlers
                    setSelectedProducts={(products) => handleClientFilter('selectedProducts', products)}
                    setSelectedRetailers={(retailers) => handleClientFilter('selectedRetailers', retailers)}
                    setDateRange={(range) => handleClientFilter('dateRange', range)}
                    setStartDate={(date) => handleClientFilter('startDate', date)}
                    setEndDate={(date) => handleClientFilter('endDate', date)}
                    setSelectedMonth={(month) => handleClientFilter('selectedMonth', month)}
                    // Pass other necessary props
                    getAvailableMonths={() => {
                      if (!rawData) return [];
                      const months = new Set(rawData.map(item => item?.month).filter(Boolean));
                      return Array.from(months).sort();
                    }}
                    // Pass brandMapping derived in context creation
                    brandMapping={sharedDataContextValue.brandMapping || {}}
                    allowClientFiltering={allowClientFiltering}
                  />
                )}

                {/* Render the appropriate tab content */}
                {activeTab === 'summary' && <SummaryTab isSharedView={true} />}
                {activeTab === 'sales' && <SalesTab isSharedView={true} />}
                {activeTab === 'demographics' && <DemographicsTab isSharedView={true} />}
                {activeTab === 'offers' && <OffersTab isSharedView={true} />}

              </ClientDataProvider>
            </ErrorBoundary>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={`w-full border-t mt-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Shared by {shareMetadata?.branding?.companyName || 'Shopmium Insights'}
            </span>
             {/* Removed data sampled message */}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SharedDashboardView;
