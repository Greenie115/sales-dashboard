import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useData } from './DataContext';
import getSurveyResponseData from '../utils/getSurveyResponseData';
import sharingService from '../services/sharingService';
import _ from 'lodash';

// Create context
const SharingContext = createContext();

// Custom hook for using this context
export const useSharing = () => useContext(SharingContext);

export const SharingProvider = ({ children }) => {
  // Get data from DataContext with safe fallbacks to prevent destructuring errors
  const dataContext = useData() || {};
  
  // Safely destructure with fallbacks for each property
  const { 
    salesData = [], 
    activeTab = 'summary', 
    brandNames = [], 
    clientName = '',
    brandMapping = {},
    getFilteredData = () => [],
    calculateMetrics = () => null,
    getRetailerDistribution = () => [],
    getProductDistribution = () => [],
    selectedProducts = ['all'],
    selectedRetailers = ['all'],
    dateRange = 'all',
    startDate = '',
    endDate = '',
    selectedMonth = ''
  } = dataContext;
  
  // UI State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [shareError, setShareError] = useState(null);
  
  // Share Configuration - Single Source of Truth
  const [shareConfig, setShareConfig] = useState({
    allowedTabs: ['summary'],
    activeTab: 'summary',
    hideRetailers: false,
    hideTotals: false,
    showOnlyPercent: false,
    clientNote: '',
    expiryDate: null,
    branding: {
      showLogo: true,
      primaryColor: '#FF0066',
      companyName: 'Shopmium Insights',
    },
    filters: {
      selectedProducts: ['all'],
      selectedRetailers: ['all'],
      dateRange: 'all',
      startDate: '',
      endDate: '',
      selectedMonth: '',
    },
    customExcludedDates: [],
    hiddenCharts: [],
    precomputedData: null
  });
  
  // Shared dashboards list
  const [sharedDashboards, setSharedDashboards] = useState([]);
  const [loadingSharedDashboards, setLoadingSharedDashboards] = useState(false);

  // Generate demographic data
  const generateDemographicData = useCallback(() => {
    if (!Array.isArray(salesData) || salesData.length === 0) {
      return {};
    }
    
    // Extract gender distribution if gender field exists
    const genderGroups = _.groupBy(
      salesData.filter(item => item.gender),
      'gender'
    );
    
    const genderDistribution = Object.keys(genderGroups).length > 0 
      ? Object.entries(genderGroups)
          .map(([gender, items]) => ({
            name: gender,
            value: items.length,
            percentage: (items.length / salesData.length) * 100
          }))
          .sort((a, b) => b.value - a.value)
      : [];
    
    // Extract age distribution if age_group field exists
    const ageGroups = _.groupBy(
      salesData.filter(item => item.age_group),
      'age_group'
    );
    
    const ageDistribution = Object.keys(ageGroups).length > 0
      ? Object.entries(ageGroups)
          .map(([ageGroup, items]) => ({
            ageGroup,
            count: items.length,
            percentage: (items.length / salesData.length) * 100
          }))
          .sort((a, b) => b.count - a.count)
      : [];
    
    // Check for question fields
    const questionFields = [];
    const sampleRow = salesData[0];
    
    if (sampleRow) {
      for (let i = 1; i <= 10; i++) {
        const paddedNum = i.toString().padStart(2, '0');
        const questionKey = `question_${paddedNum}`;
        const propKey = `proposition_${paddedNum}`;
        
        if (sampleRow[questionKey] !== undefined || sampleRow[propKey] !== undefined) {
          questionFields.push({
            number: paddedNum,
            questionKey,
            propKey
          });
        }
      }
    }
    
    // Process survey questions to get available questions and question texts
    const availableQuestions = questionFields.map(q => q.number);
    const questionTexts = {};
    
    questionFields.forEach(field => {
      const questionEntry = salesData.find(
        row => row[field.questionKey] && row[field.questionKey].trim() !== ''
      );
      
      if (questionEntry) {
        questionTexts[field.number] = questionEntry[field.questionKey];
      } else {
        questionTexts[field.number] = `Question ${parseInt(field.number)}`;
      }
    });
    
    return {
      genderDistribution,
      ageDistribution,
      availableQuestions,
      questionTexts,
      questionFields
    };
  }, [salesData]);

  // Initialize share config when modal opens
  useEffect(() => {
    if (isShareModalOpen) {
      const mainTab = activeTab || 'summary';
      
      setShareConfig(prev => ({
        ...prev,
        activeTab: mainTab,
        allowedTabs: prev.allowedTabs.includes(mainTab) 
          ? prev.allowedTabs 
          : [...prev.allowedTabs, mainTab]
      }));
    }
  }, [isShareModalOpen, activeTab]);
  
  // Load shared dashboards from the server
  useEffect(() => {
    if (isShareModalOpen) {
      loadSharedDashboards();
    }
  }, [isShareModalOpen]);
  
  // Load shared dashboards
  const loadSharedDashboards = async () => {
    setLoadingSharedDashboards(true);
    try {
      const dashboards = await sharingService.listSharedDashboards();
      setSharedDashboards(dashboards);
      setShareError(null);
    } catch (error) {
      console.error('Error loading shared dashboards:', error);
      setShareError('Failed to load shared dashboards');
    } finally {
      setLoadingSharedDashboards(false);
    }
  };

  // Update share config - maintain immutability and stable references
  const updateShareConfig = useCallback((updates) => {
    setShareConfig(prev => {
      // Create a new config object
      const newConfig = { ...prev };
      
      // Update top-level properties
      Object.keys(updates).forEach(key => {
        // Handle nested objects specially
        if (key === 'filters' && updates.filters) {
          newConfig.filters = { ...prev.filters, ...updates.filters };
        } else if (key === 'branding' && updates.branding) {
          newConfig.branding = { ...prev.branding, ...updates.branding };
        } else {
          // Update normal properties
          newConfig[key] = updates[key];
        }
      });
      
      return newConfig;
    });
  }, []);

  // Clear visible error
  const clearError = useCallback(() => {
    setShareError(null);
  }, []);

  // Toggle share modal
  const toggleShareModal = useCallback(() => {
    setIsShareModalOpen(prev => !prev);
    if (isShareModalOpen) {
      setIsPreviewMode(false);
    }
  }, [isShareModalOpen]);

  // Save current filters from DataContext
  const saveCurrentFilters = useCallback(() => {
    updateShareConfig({
      filters: {
        selectedProducts: [...selectedProducts],
        selectedRetailers: [...selectedRetailers],
        dateRange,
        startDate,
        endDate,
        selectedMonth
      }
    });
  }, [
    updateShareConfig,
    selectedProducts, 
    selectedRetailers, 
    dateRange, 
    startDate, 
    endDate, 
    selectedMonth
  ]);

  // Generate shareable link - recompute data for the dashboard
  const generateShareableLink = useCallback(async () => {
    try {
      setShareError(null);
      
      // Create deep copy of the share config to avoid reference issues
      const configToShare = JSON.parse(JSON.stringify(shareConfig));
      
      // Ensure we have at least one tab
      if (configToShare.allowedTabs.length === 0) {
        configToShare.allowedTabs = ['summary'];
      }
      
      // Ensure active tab is in allowed tabs
      if (!configToShare.allowedTabs.includes(configToShare.activeTab)) {
        configToShare.activeTab = configToShare.allowedTabs[0];
      }
      
      // Add metadata
      configToShare.metadata = {
        createdAt: new Date().toISOString(),
        brandNames: brandNames || [],
        clientName: clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client'),
        datasetSize: Array.isArray(salesData) ? salesData.length : 0,
      };
      
      // Process survey data with complete dataset
      const surveyData = getSurveyResponseData(salesData, configToShare.filters, getFilteredData);
      
      // Precompute data for the client view - safely call these functions
      configToShare.precomputedData = {
        filteredData: typeof getFilteredData === 'function' ? 
          getFilteredData(configToShare.filters) : [],
        metrics: typeof calculateMetrics === 'function' ? 
          calculateMetrics() : null,
        retailerData: typeof getRetailerDistribution === 'function' ? 
          getRetailerDistribution() : [],
        productDistribution: typeof getProductDistribution === 'function' ? 
          getProductDistribution() : [],
        brandMapping: brandMapping || {},
        brandNames: brandNames || [],
        clientName: clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client'),
        
        // CRITICAL FIX: Include complete salesData, not just a subset
        // The problem was likely that we were only including a slice of the first 1000 records
        salesData: salesData,
        
        // Add the survey data for demographics with complete dataset
        surveyData: surveyData
      };
      
      // Create the shared dashboard in database
      const { url } = await sharingService.createSharedDashboard(
        configToShare, 
        configToShare.expiryDate ? new Date(configToShare.expiryDate) : null
      );
      
      setShareableLink(url);
      await loadSharedDashboards();
      
      return url;
    } catch (error) {
      console.error("Error generating share link:", error);
      setShareError('Failed to generate share link');
      return "";
    }
  }, [
    shareConfig, 
    brandNames, 
    clientName, 
    salesData, 
    getFilteredData, 
    calculateMetrics, 
    getRetailerDistribution, 
    getProductDistribution,
    brandMapping
  ]);
  
  
  // Delete a shared dashboard
  const deleteSharedDashboard = useCallback(async (shareId) => {
    try {
      setShareError(null);
      await sharingService.deleteSharedDashboard(shareId);
      setSharedDashboards(prev => 
        prev.filter(dashboard => dashboard.share_id !== shareId)
      );
      return true;
    } catch (error) {
      console.error('Error deleting shared dashboard:', error);
      setShareError('Failed to delete shared dashboard');
      return false;
    }
  }, []);
  
  const transformDataForSharing = useCallback((data) => {
    if (!data) return data;
    
    try {
      // Create deep copy to avoid modifying original data
      const clientData = JSON.parse(JSON.stringify(data));
      const config = clientData.shareConfig || shareConfig;
      
      // Apply transformations based on share config
      if (config.hideRetailers && Array.isArray(clientData.retailerData)) {
        clientData.retailerData = clientData.retailerData.map((item, index) => ({
          ...item,
          name: `Retailer ${index + 1}`
        }));
      }
      
      if (config.hideTotals) {
        // Remove total values from metrics
        if (clientData.metrics) {
          if (clientData.metrics.totalUnits) {
            clientData.metrics.totalUnits = '—';
          }
          if (clientData.metrics.totalValue) {
            clientData.metrics.totalValue = '—';
          }
        }
        
        // Remove count values if showOnlyPercent is true
        if (config.showOnlyPercent) {
          if (Array.isArray(clientData.retailerData)) {
            clientData.retailerData = clientData.retailerData.map(item => ({
              ...item,
              value: '—'
            }));
          }
          
          if (Array.isArray(clientData.productDistribution)) {
            clientData.productDistribution = clientData.productDistribution.map(item => ({
              ...item,
              count: '—'
            }));
          }
        }
      }
      
      // IMPORTANT: Ensure hiddenCharts array exists and is properly passed to the client data
      if (config.hiddenCharts && Array.isArray(config.hiddenCharts)) {
        // Make sure we're using a new array to avoid reference issues
        clientData.hiddenCharts = [...config.hiddenCharts];
      } else {
        // Initialize with empty array if missing
        clientData.hiddenCharts = [];
      }
      
      // Apply date exclusions to time trend data
      if (Array.isArray(clientData.trendData) && clientData.trendData.length > 0 && 
          Array.isArray(config.customExcludedDates) && config.customExcludedDates.length > 0) {
        
        // Create a Set of dates to exclude for efficient lookup
        const excludeDates = new Set(config.customExcludedDates);
        
        // Filter out excluded dates from trend data
        clientData.trendData = clientData.trendData.filter(item => {
          return !excludeDates.has(item.date);
        });
      }
      
      // Ensure demographic data is properly transferred
      if (!clientData.demographicData && data.demographicData) {
        clientData.demographicData = {...data.demographicData};
      } else if (!clientData.demographicData && clientData.precomputedData?.demographicData) {
        clientData.demographicData = {...clientData.precomputedData.demographicData};
      }
      
      return clientData;
    } catch (err) {
      console.error('Error in transformDataForSharing:', err);
      return data;
    }
  }, [shareConfig]);
  
  // Set active tab in share config
  const setShareActiveTab = useCallback((tab) => {
    if (tab && shareConfig.allowedTabs.includes(tab)) {
      updateShareConfig({ activeTab: tab });
    }
  }, [shareConfig.allowedTabs, updateShareConfig]);
  
  // Update allowed tabs in share config
  const setShareAllowedTabs = useCallback((tabs) => {
    if (Array.isArray(tabs) && tabs.length > 0) {
      const newConfig = { allowedTabs: tabs };
      
      // If current active tab isn't in the new allowed tabs, update it
      if (!tabs.includes(shareConfig.activeTab)) {
        newConfig.activeTab = tabs[0];
      }
      
      updateShareConfig(newConfig);
    }
  }, [shareConfig.activeTab, updateShareConfig]);
  
  // Create preview data for SharedDashboardPreview
  const getPreviewData = useCallback(() => {
    // Create a copy of the current shareConfig
    const previewConfig = { ...shareConfig };
    
    // Process survey/demographic data
    const processSurveyData = () => {
      // Helper to check if we have survey data in the sales data
      const hasSurveyData = salesData && salesData.some(row => {
        // Check for any question_ fields
        return Object.keys(row).some(key => key.startsWith('question_') || key.startsWith('proposition_'));
      });
      
      if (!hasSurveyData) return null;
      
      try {
        // Create survey data structure
        const surveyData = {
          questions: {}
        };
        
        // Find all available questions
        const availableQuestions = [];
        
        // Check what fields are in the data
        if (salesData && salesData.length > 0) {
          const sampleRow = salesData[0];
          
          // Look for question fields
          for (let i = 1; i <= 10; i++) {
            const paddedNum = i.toString().padStart(2, '0');
            const questionKey = `question_${paddedNum}`;
            const propKey = `proposition_${paddedNum}`;
            
            if (sampleRow[questionKey] !== undefined || sampleRow[propKey] !== undefined) {
              availableQuestions.push(paddedNum);
            }
          }
        }
        
        // Process each available question
        availableQuestions.forEach(questionNum => {
          const questionKey = `question_${questionNum}`;
          const propKey = `proposition_${questionNum}`;
          
          // Get question text
          let questionText = `Question ${parseInt(questionNum)}`;
          const questionRow = salesData.find(row => row[questionKey] && row[questionKey].trim() !== '');
          if (questionRow) {
            questionText = questionRow[questionKey];
          }
          
          // Count responses
          const validResponses = salesData.filter(row => 
            row[propKey] && row[propKey].trim() !== ''
          );
          
          const responseCounts = {};
          let totalResponses = 0;
          
          validResponses.forEach(row => {
            const responseStr = row[propKey];
            if (!responseStr) return;
            
            // Split by semicolon if it's a multiple-choice response
            const responses = responseStr.split(';').map(r => r.trim());
            
            responses.forEach(response => {
              if (response) {
                responseCounts[response] = (responseCounts[response] || 0) + 1;
                totalResponses++;
              }
            });
          });
          
          // Get demographics for each response
          const demographics = {
            gender: {},
            age: {}
          };
          
          // Process gender breakdown
          const genders = _.uniq(salesData.filter(row => row.gender).map(row => row.gender));
          genders.forEach(gender => {
            const genderRows = salesData.filter(row => row.gender === gender);
            
            demographics.gender[gender] = {
              total: genderRows.length,
              responseBreakdown: {}
            };
            
            // Count responses by gender
            Object.keys(responseCounts).forEach(response => {
              demographics.gender[gender].responseBreakdown[response] = genderRows.filter(row => {
                const responseStr = row[propKey];
                if (!responseStr) return false;
                
                const responses = responseStr.split(';').map(r => r.trim());
                return responses.includes(response);
              }).length;
            });
          });
          
          // Process age breakdown
          const ageGroups = _.uniq(salesData.filter(row => row.age_group).map(row => row.age_group));
          ageGroups.forEach(ageGroup => {
            const ageRows = salesData.filter(row => row.age_group === ageGroup);
            
            demographics.age[ageGroup] = {
              total: ageRows.length,
              responseBreakdown: {}
            };
            
            // Count responses by age
            Object.keys(responseCounts).forEach(response => {
              demographics.age[ageGroup].responseBreakdown[response] = ageRows.filter(row => {
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
            counts: responseCounts,
            demographics
          };
        });
        
        return surveyData;
      } catch (error) {
        console.error("Error processing survey data:", error);
        return null;
      }
    };
    
    // Generate survey data
    const surveyData = processSurveyData();
    
    // Add precomputed data for the preview if it doesn't exist
    if (!previewConfig.precomputedData) {
      previewConfig.precomputedData = {
        filteredData: typeof getFilteredData === 'function' ? 
          getFilteredData(previewConfig.filters) : [],
        metrics: typeof calculateMetrics === 'function' ? 
          calculateMetrics() : null,
        retailerData: typeof getRetailerDistribution === 'function' ? 
          getRetailerDistribution() : [],
        productDistribution: typeof getProductDistribution === 'function' ? 
          getProductDistribution() : [],
        salesData: salesData,
        brandNames: brandNames || [],
        brandMapping: brandMapping || {},
        clientName: clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client'),
        // Add the survey data
        surveyData
      };
    } else if (!previewConfig.precomputedData.surveyData && surveyData) {
      // Add survey data if it doesn't exist
      previewConfig.precomputedData.surveyData = surveyData;
    }
    
    return previewConfig;
  }, [
    shareConfig, 
    getFilteredData, 
    calculateMetrics, 
    getRetailerDistribution, 
    getProductDistribution,
    salesData,
    brandNames,
    brandMapping,
    clientName
  ]);

  // Provide value to consumers
  const value = {
    // UI State
    isShareModalOpen,
    isPreviewMode,
    shareableLink,
    shareError,
    sharedDashboards,
    loadingSharedDashboards,
    
    // Share configuration
    shareConfig,
    
    // Actions
    toggleShareModal,
    setIsPreviewMode,
    setShareableLink,
    generateShareableLink,
    deleteSharedDashboard,
    updateShareConfig,
    setShareActiveTab,
    setShareAllowedTabs,
    saveCurrentFilters,
    clearError,
    
    // Helper methods
    transformDataForSharing,
    getPreviewData,
    
    // Data generators
    generateDemographicData
  };

  return (
    <SharingContext.Provider value={value}>
      {children}
    </SharingContext.Provider>
  );
};

export default SharingContext;