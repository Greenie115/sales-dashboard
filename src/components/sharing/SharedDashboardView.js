import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import _ from 'lodash';
import { useTheme } from '../../context/ThemeContext';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';
import { ClientDataProvider } from '../../context/ClientDataContext';
import SummaryTab from '../dashboard/tabs/SummaryTab';
import SalesTab from '../dashboard/tabs/SalesTab';
import DemographicsTab from '../dashboard/tabs/DemographicsTab';
import OffersTab from '../dashboard/tabs/OffersTab';
import ErrorBoundary from '../ErrorBoundary';
import sharingService from '../../services/sharingService';

// Create a more reliable function for getting client name with proper fallbacks
const getClientDisplayName = (config) => {
  // First try metadata.clientName as it's the most authoritative
  if (config.metadata?.clientName) {
    return config.metadata.clientName;
  }
  
  // Then try brandNames from various sources
  if (config.metadata?.brandNames && config.metadata.brandNames.length > 0) {
    return config.metadata.brandNames.join(', ');
  }
  
  if (config.brandNames && config.brandNames.length > 0) {
    return config.brandNames.join(', ');
  }
  
  // Try the precomputed data
  if (config.precomputedData?.clientName) {
    return config.precomputedData.clientName;
  }
  
  if (config.precomputedData?.brandNames && config.precomputedData.brandNames.length > 0) {
    return config.precomputedData.brandNames.join(', ');
  }
  
  // Default fallback
  return 'Client';
};

// This function ensures demographic data is available in the client data context
const enhanceDemographicData = (clientData) => {
  if (!clientData) return clientData;
  
  // Create a deep copy to avoid reference issues
  const enhancedData = _.cloneDeep(clientData);
  
  // Check if demographicData exists, if not, try to create it from available data
  if (!enhancedData.demographicData && enhancedData.salesData && enhancedData.salesData.length > 0) {
    try {
      // Extract gender distribution
      const genderGroups = _.groupBy(
        enhancedData.salesData.filter(item => item.gender),
        'gender'
      );
      
      const genderDistribution = Object.keys(genderGroups).length > 0 
        ? Object.entries(genderGroups)
            .map(([gender, items]) => ({
              name: gender,
              value: items.length,
              percentage: (items.length / enhancedData.salesData.length) * 100
            }))
            .sort((a, b) => b.value - a.value)
        : [];
      
      // Extract age distribution
      const ageGroups = _.groupBy(
        enhancedData.salesData.filter(item => item.age_group),
        'age_group'
      );
      
      const ageDistribution = Object.keys(ageGroups).length > 0
        ? Object.entries(ageGroups)
            .map(([ageGroup, items]) => ({
              ageGroup,
              count: items.length,
              percentage: (items.length / enhancedData.salesData.length) * 100
            }))
            .sort((a, b) => b.count - a.count)
        : [];
        
      enhancedData.demographicData = {
        genderDistribution,
        ageDistribution
      };
    } catch (err) {
      console.error("Error generating demographic data:", err);
    }
  }
  
  // Make sure survey data is available for demographics tab
  if (!enhancedData.surveyData && enhancedData.salesData && enhancedData.salesData.length > 0) {
    try {
      const surveyData = {
        questions: {},
        meta: { totalResponses: 0, questionCount: 0 }
      };
      
      // Check for question fields in the data
      const sampleRow = enhancedData.salesData[0];
      const questionColumns = Object.keys(sampleRow || {}).filter(key => key.startsWith('question_'));
      const propColumns = Object.keys(sampleRow || {}).filter(key => key.startsWith('proposition_'));
      
      const availableQuestions = [];
      
      // Find matching question numbers
      propColumns.forEach(propCol => {
        const questionNumber = propCol.replace('proposition_', '');
        const questionCol = `question_${questionNumber}`;
        
        if (questionColumns.includes(questionCol)) {
          availableQuestions.push(questionNumber);
        }
      });
      
      // Process each available question
      availableQuestions.forEach(questionNum => {
        const questionKey = `question_${questionNum}`;
        const propKey = `proposition_${questionNum}`;
        
        // Get question text
        let questionText = `Question ${parseInt(questionNum)}`;
        const questionRow = enhancedData.salesData.find(row => row[questionKey] && typeof row[questionKey] === 'string' && row[questionKey].trim() !== '');
        if (questionRow) {
          questionText = questionRow[questionKey];
        }
        
        // Count responses
        const validResponses = enhancedData.salesData.filter(row => 
          row[propKey] && typeof row[propKey] === 'string' && row[propKey].trim() !== ''
        );
        
        const counts = {};
        let totalResponses = 0;
        
        validResponses.forEach(row => {
          const responseStr = row[propKey];
          if (!responseStr) return;
          
          // Split by semicolon if it's a multiple-choice response
          const responses = responseStr.split(';').map(r => r.trim());
          
          responses.forEach(response => {
            if (response) {
              counts[response] = (counts[response] || 0) + 1;
              totalResponses++;
            }
          });
        });
        
        // Create basic demographics structure
        const responsesByGender = {};
        const responsesByAge = {};
        
        // Process gender breakdown
        const genders = _.uniq(enhancedData.salesData.filter(row => row.gender).map(row => row.gender));
        genders.forEach(gender => {
          const genderRows = enhancedData.salesData.filter(row => row.gender === gender);
          
          responsesByGender[gender] = {
            total: genderRows.length,
            responseBreakdown: {}
          };
          
          // Count responses by gender
          Object.keys(counts).forEach(response => {
            responsesByGender[gender].responseBreakdown[response] = genderRows.filter(row => {
              const responseStr = row[propKey];
              if (!responseStr) return false;
              
              const responses = responseStr.split(';').map(r => r.trim());
              return responses.includes(response);
            }).length;
          });
        });
        
        // Process age breakdown
        const ageGroups = _.uniq(enhancedData.salesData.filter(row => row.age_group).map(row => row.age_group));
        ageGroups.forEach(ageGroup => {
          const ageRows = enhancedData.salesData.filter(row => row.age_group === ageGroup);
          
          responsesByAge[ageGroup] = {
            total: ageRows.length,
            responseBreakdown: {}
          };
          
          // Count responses by age
          Object.keys(counts).forEach(response => {
            responsesByAge[ageGroup].responseBreakdown[response] = ageRows.filter(row => {
              const responseStr = row[propKey];
              if (!responseStr) return false;
              
              const responses = responseStr.split(';').map(r => r.trim());
              return responses.includes(response);
            }).length;
          });
        });
        
        // Add to survey data
        surveyData.questions[questionNum] = {
          questionText,
          totalResponses,
          counts,
          demographics: {
            gender: responsesByGender,
            age: responsesByAge
          }
        };
        
        surveyData.meta.questionCount++;
        surveyData.meta.totalResponses += totalResponses;
      });
      
      enhancedData.surveyData = surveyData;
    } catch (err) {
      console.error("Error generating survey data:", err);
    }
  }
  
  return enhancedData;
};

// This component acts as a bridge between the ClientDataContext and the tab components
const createSharedDataContext = (clientData) => {
  if (!clientData) return {};

  return {
    // Pass through all data from clientData
    ...clientData,
    
    // Ensure essential methods exist even if not provided in clientData
    getFilteredData: () => clientData.filteredData || clientData.salesData || [],
    calculateMetrics: () => clientData.metrics || null,
    getRetailerDistribution: () => clientData.retailerData || [],
    getProductDistribution: () => clientData.productDistribution || [],
    
    // Add this method specifically for demographic data
    getSurveyResponses: (questionNumber) => {
      // First try to get from precomputed survey data
      if (clientData.surveyData && clientData.surveyData.questions && 
          clientData.surveyData.questions[questionNumber]) {
        return clientData.surveyData.questions[questionNumber];
      }
      
      // If not available in precomputed data, process from salesData
      if (clientData.salesData && Array.isArray(clientData.salesData)) {
        return processSurveyResponses(clientData.salesData, questionNumber);
      }
      
      return { responseData: [] };
    },
    
    // Flags and metadata
    isSharedView: true,
    hasData: Boolean(clientData.filteredData?.length || clientData.salesData?.length),
    
    // For backward compatibility, ensure these exist
    selectedProducts: clientData.filters?.selectedProducts || ['all'],
    selectedRetailers: clientData.filters?.selectedRetailers || ['all'],
    dateRange: clientData.filters?.dateRange || 'all',
    startDate: clientData.filters?.startDate || '',
    endDate: clientData.filters?.endDate || '',
    selectedMonth: clientData.filters?.selectedMonth || '',
    
    // Empty functions for methods that shouldn't do anything in shared view
    setSelectedProducts: () => {},
    setSelectedRetailers: () => {},
    setDateRange: () => {},
    setActiveTab: () => {},
  };
};

// Process survey response data for a specific question
const processSurveyResponses = (salesData, questionNumber) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0 || !questionNumber) {
    return { responseData: [], ageDistribution: [], genderDistribution: [] };
  }
  
  try {
    const propKey = `proposition_${questionNumber}`;
    const questionKey = `question_${questionNumber}`;
    
    // Extract responses that have valid data for this question
    const validResponses = salesData.filter(row => 
      row[propKey] && typeof row[propKey] === 'string' && row[propKey].trim() !== ''
    );
    
    if (validResponses.length === 0) return { responseData: [] };
    
    // Get response distribution
    const responseCount = {};
    validResponses.forEach(row => {
      const response = row[propKey];
      responseCount[response] = (responseCount[response] || 0) + 1;
    });
    
    // Format response data
    const responseData = Object.entries(responseCount).map(([fullResponse, count]) => {
      return {
        fullResponse,
        count,
        percentage: ((count / validResponses.length) * 100).toFixed(1)
      };
    }).sort((a, b) => b.count - a.count);
    
    return {
      responseData,
      questionText: validResponses[0][questionKey] || `Question ${questionNumber}`,
      validResponses
    };
  } catch (error) {
    console.error("Error processing survey responses:", error);
    return { responseData: [] };
  }
};

const SharedDashboardView = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { transformDataForSharing } = useSharing();
  
  // Destructure only what we need from the DataContext
  const { 
    setSalesData,
    setSelectedProducts,
    setSelectedRetailers,
    setDateRange,
    setStartDate,
    setEndDate,
    setSelectedMonth
  } = useData();
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareConfig, setShareConfig] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isSupabaseMode, setIsSupabaseMode] = useState(true);
  const [clientData, setClientData] = useState(null);
  const [clientDisplayName, setClientDisplayName] = useState('Client Dashboard');
  const [excludedDates, setExcludedDates] = useState([]);
  
  // Check if the share ID looks like Base64 (fallback mode) or UUID (Supabase mode)
  const isBase64ShareId = (id) => {
    // If it contains characters that aren't valid in a UUID but are in Base64
    return /[+/]/.test(id) || id.length > 40;
  };
  
  // Load shared configuration from either Supabase or fallback method
  useEffect(() => {
    const fetchSharedDashboard = async () => {
      try {
        if (!shareId) {
          throw new Error("No share ID provided");
        }
        
        setLoading(true);
    
        // Determine if we should use Supabase or fallback method based on share ID format
        const useSupabase = !isBase64ShareId(shareId);
        setIsSupabaseMode(useSupabase);
        
        let config;
        let expired = false;
        
        console.log("Loading shared dashboard with ID:", shareId);
        console.log("Using Supabase mode:", useSupabase);
        
        if (useSupabase) {
          try {
            // Try Supabase first
            console.log("Using Supabase to fetch dashboard");
            const result = await sharingService.getSharedDashboard(shareId);
            expired = result.expired;
            config = result.config;
            console.log("Supabase result:", result);
          } catch (err) {
            console.error("Supabase fetch failed, trying fallback:", err);
            // If Supabase fails, try fallback method
            try {
              // We need to add padding to ensure valid base64
              let paddedShareId = shareId;
              while (paddedShareId.length % 4 !== 0) {
                paddedShareId += '=';
              }
              
              const decodedConfig = JSON.parse(atob(paddedShareId));
              config = decodedConfig;
              
              // Check if share link is expired (fallback mode)
              if (decodedConfig.expiryDate) {
                const expiryDate = new Date(decodedConfig.expiryDate);
                const now = new Date();
                expired = expiryDate < now;
              }
              
              setIsSupabaseMode(false);
              console.log("Fallback decode successful:", config);
            } catch (fallbackErr) {
              console.error("Fallback decode failed:", fallbackErr);
              throw new Error("Invalid or corrupted share link");
            }
          }
        } else {
          // Directly use fallback method (Base64 encoded)
          console.log("Using fallback mode to fetch dashboard");
          try {
            // We need to add padding to ensure valid base64
            let paddedShareId = shareId;
            while (paddedShareId.length % 4 !== 0) {
              paddedShareId += '=';
            }
            
            const decodedConfig = JSON.parse(atob(paddedShareId));
            config = decodedConfig;
            
            // Check if share link is expired (fallback mode)
            if (decodedConfig.expiryDate) {
              const expiryDate = new Date(decodedConfig.expiryDate);
              const now = new Date();
              expired = expiryDate < now;
            }
            
            console.log("Fallback decoded config:", config);
          } catch (err) {
            console.error("Error decoding fallback share:", err);
            throw new Error("Invalid or corrupted share link");
          }
        }
        
        // Check if share link is expired
        if (expired) {
          setIsExpired(true);
          setShareConfig(config); // Still set the config for branding display
          setLoading(false);
          return;
        }
        
        setShareConfig(config);
      
        // Set active tab from config, ensuring it's in the allowed tabs
        if (config.activeTab && config.allowedTabs && config.allowedTabs.includes(config.activeTab)) {
          console.log("Setting active tab to config value:", config.activeTab);
          setActiveTab(config.activeTab);
        } else if (config.allowedTabs && config.allowedTabs.length > 0) {
          console.log("Setting active tab to first allowed tab:", config.allowedTabs[0]);
          setActiveTab(config.allowedTabs[0]);
        } else {
          console.log("No valid tabs found, defaulting to summary");
          setActiveTab('summary');
        }

        console.log("Shared dashboard configuration:", {
          activeTab: config.activeTab,
          allowedTabs: config.allowedTabs,
          setActiveTabTo: activeTab
        });

        // Set client display name
        const displayName = getClientDisplayName(config);
        setClientDisplayName(displayName + ' Dashboard');
        console.log("Set client display name to:", displayName + ' Dashboard');
        
        // Important: Store the client data directly from the precomputed data
        if (config.precomputedData) {
          // Create a deep copy to prevent reference issues
          const precomputedData = _.cloneDeep(config.precomputedData);
          
          // Ensure clientName is properly set in the data
          if (!precomputedData.clientName || precomputedData.clientName === 'Client') {
            precomputedData.clientName = displayName;
          }
          
          // Enhance the client data with demographic information
          const enhancedClientData = enhanceDemographicData({
            ...precomputedData,
            filters: config.filters || {},
            brandMapping: precomputedData.brandMapping || {},
            brandNames: precomputedData.brandNames || [], 
            clientName: displayName,
            shareConfig: config,
            isSharedView: true
          });
          
          console.log("Setting enhanced client data:", enhancedClientData);
          setClientData(enhancedClientData);
          
          // If we have salesData in precomputedData, set it in the DataContext
          if (precomputedData.salesData && Array.isArray(precomputedData.salesData)) {
            console.log("Setting salesData in DataContext from precomputedData");
            setSalesData(precomputedData.salesData);
          }
        } else {
          console.warn("No precomputed data found in share config");
        }
        
        // Apply filters from the shared config
        if (config.filters) {
          if (config.filters.selectedProducts) setSelectedProducts(config.filters.selectedProducts);
          if (config.filters.selectedRetailers) setSelectedRetailers(config.filters.selectedRetailers);
          if (config.filters.dateRange) setDateRange(config.filters.dateRange);
          if (config.filters.startDate) setStartDate(config.filters.startDate);
          if (config.filters.endDate) setEndDate(config.filters.endDate);
          if (config.filters.selectedMonth) setSelectedMonth(config.filters.selectedMonth);
        }
        
        // Set excluded dates from config
        if (config.customExcludedDates && Array.isArray(config.customExcludedDates)) {
          setExcludedDates(config.customExcludedDates);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading shared dashboard:", err);
        setError("Invalid or expired share link");
        setLoading(false);
      }
    };
    
    fetchSharedDashboard();
  }, [shareId, setSalesData, setSelectedProducts, setSelectedRetailers, setDateRange, setStartDate, setEndDate, setSelectedMonth]);

  // Handle tab selection
  const handleTabChange = (tab) => {
    console.log("Changing active tab to:", tab);
    if (tab && shareConfig.allowedTabs.includes(tab)) {
      setActiveTab(tab);
    }
  };
  
  // Handle adding an excluded date
  const handleAddExcludedDate = (date) => {
    setExcludedDates(prev => [...prev, date]);
  };
  
  // Handle removing an excluded date
  const handleRemoveExcludedDate = (date) => {
    setExcludedDates(prev => prev.filter(d => d !== date));
  };
  
  // If still loading
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
            Please contact {shareConfig.branding?.companyName || 'the dashboard owner'} for an updated link.
          </p>
        </div>
      </div>
    );
  }
  
  if (!shareConfig) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-4`}>
        <div className={`w-full max-w-md p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold text-center mb-4">Dashboard Not Found</h2>
          <p className="text-center mb-6">
            The dashboard you're looking for doesn't exist or may have been deleted.
          </p>
        </div>
      </div>
    );
  }
  
  // Ensure we have clientData to work with
  if (!clientData) {
    console.error("Missing client data for shared dashboard");
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-4`}>
        <div className={`w-full max-w-md p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Dashboard Data</h2>
          <p className="mb-4">The dashboard data could not be loaded.</p>
        </div>
      </div>
    );
  }
  
  // Create a proper shared data context with all necessary methods for the ClientDataProvider
  const sharedDataContext = createSharedDataContext(clientData);
  
  // Transform data based on sharing config
  const transformedData = transformDataForSharing ? 
    transformDataForSharing({...sharedDataContext, shareConfig}) : 
    sharedDataContext;
  
  // Check if there's data to display
  const hasData = transformedData?.filteredData?.length > 0 || (transformedData?.salesData?.length > 0);
  
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Storage type indicator - Only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`fixed top-0 right-0 m-4 z-50 px-3 py-1 rounded-full text-xs font-medium ${
          isSupabaseMode 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
        }`}>
          {isSupabaseMode ? 'Supabase Mode' : 'Fallback Mode'}
        </div>
      )}
      
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
                {clientDisplayName}
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Shared by {shareConfig.branding?.companyName || 'Shopmium Insights'}
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
        {shareConfig.allowedTabs && shareConfig.allowedTabs.length > 1 && (
          <div className={`mb-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-wrap">
              {shareConfig.allowedTabs.map(tab => (
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
              <ClientDataProvider clientData={{
                ...transformedData,
                hiddenCharts: transformedData.hiddenCharts || [],
                // Explicitly pass through all data needed for demographics
                salesData: transformedData.salesData || [], 
                surveyData: transformedData.surveyData,
                // Add any filter context that might be needed
                filters: transformedData.filters || {},
                // Make sure we're passing the right functions
                getFilteredData: () => transformedData.filteredData || transformedData.salesData || [],
                calculateMetrics: () => transformedData.metrics || {},
                // Set flag to ensure we're using client data
                isSharedView: true
              }}>
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
              Shared with you by {shareConfig.branding?.companyName || 'Shopmium Insights'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SharedDashboardView;