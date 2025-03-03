import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { useFilter } from './FilterContext';

// Create context
const DemographicsContext = createContext();

// Custom hook for using this context
export const useDemographics = () => useContext(DemographicsContext);

// Define the preferred sorting order for age groups
const AGE_GROUP_ORDER = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Under 18'
];

// Provider component
export const DemographicsProvider = ({ children }) => {
  const { getFilteredData } = useFilter();
  
  // State for demographic insights
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState('08');
  const [selectedResponses, setSelectedResponses] = useState([]);
  const [responseData, setResponseData] = useState([]);
  const [ageDistribution, setAgeDistribution] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [uniqueResponses, setUniqueResponses] = useState([]);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  
  // State for export
  const [exportState, setExportState] = useState(null);
  
  // Ref to track if this is an export operation
  const isExportingRef = useRef(false);
  
  // Cache the demographic data in sessionStorage for export
  const cacheForExport = () => {
    isExportingRef.current = true;
    
    const state = {
      selectedQuestionNumber,
      selectedResponses,
      responseData,
      ageDistribution,
      genderData,
      ageData,
      uniqueResponses,
      currentQuestionText
    };
    
    setExportState(state);
    sessionStorage.setItem('demographicsExportState', JSON.stringify(state));
  };
  
  // Get data for export
  const getExportData = () => {
    try {
      // Try to get cached state first
      if (exportState) {
        return exportState;
      }
      
      // Try session storage next
      const storedState = sessionStorage.getItem('demographicsExportState');
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        // Clean up
        sessionStorage.removeItem('demographicsExportState');
        return parsedState;
      }
    } catch (e) {
      console.error('Error retrieving demographic export state:', e);
    }
    
    // Fall back to current state if nothing else is available
    return {
      selectedQuestionNumber,
      selectedResponses,
      responseData,
      ageDistribution,
      genderData,
      ageData,
      uniqueResponses,
      currentQuestionText
    };
  };
  
  // Clear the export state
  const clearExportState = () => {
    setExportState(null);
    sessionStorage.removeItem('demographicsExportState');
    isExportingRef.current = false;
  };
  
  // Reset export state when switching away from demographics tab
  useEffect(() => {
    return () => {
      clearExportState();
    };
  }, []);
  
  // Handle response selection without losing state during export
  const handleResponseSelection = (response) => {
    // Skip if we're in the middle of an export operation
    if (isExportingRef.current) return;
    
    setSelectedResponses(prev => {
      if (prev.includes(response)) {
        // Remove if already selected
        return prev.filter(r => r !== response);
      } else {
        // Add if not selected
        return [...prev, response];
      }
    });
  };
  
  // Process data to extract demographic insights
  const analyzeDemographicData = (data) => {
    if (!data || data.length === 0) return;
    
    // Process gender data
    const genderGroups = _.groupBy(data.filter(item => item.gender), 'gender');
    const genderStats = Object.entries(genderGroups).map(([gender, items]) => ({
      name: gender,
      value: items.length,
      percentage: (items.length / data.length) * 100
    })).sort((a, b) => b.value - a.value);
    setGenderData(genderStats);
    
    // Process age group data
    const ageGroups = _.groupBy(data.filter(item => item.age_group), 'age_group');
    const ageStats = Object.entries(ageGroups).map(([ageGroup, items]) => ({
      name: ageGroup,
      value: items.length,
      percentage: (items.length / data.length) * 100
    })).sort((a, b) => {
      // Sort by the defined order, if available
      const aIndex = AGE_GROUP_ORDER.indexOf(a.name);
      const bIndex = AGE_GROUP_ORDER.indexOf(b.name);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
    setAgeData(ageStats);
  };
  
  // Analyze question data based on selected question
  const analyzeQuestionData = (data) => {
    // Skip if no data or question
    if (!data || data.length === 0 || !selectedQuestionNumber) return;
    
    const questionKey = `question_${selectedQuestionNumber}`;
    const propositionKey = `proposition_${selectedQuestionNumber}`;
    
    // Find the question text
    const questionItem = data.find(item => item[questionKey] && item[questionKey].trim() !== '');
    if (questionItem) {
      setCurrentQuestionText(questionItem[questionKey]);
    } else {
      setCurrentQuestionText(`Question ${selectedQuestionNumber}`);
    }
    
    // Filter out rows with empty responses
    const filteredData = data.filter(item => 
      item[questionKey] && item[questionKey].trim() !== '' &&
      item[propositionKey] && item[propositionKey].trim() !== ''
    );
    
    // Get unique responses
    const responses = _.uniq(filteredData.map(item => item[propositionKey])).filter(Boolean);
    setUniqueResponses(responses);
    
    // Calculate response stats
    const groupedByResponse = _.groupBy(filteredData, propositionKey);
    
    // Prepare response data for each response
    const responseStats = responses.map(response => {
      const respondents = groupedByResponse[response] || [];
      const totalForResponse = respondents.length;
      
      return {
        response,
        total: totalForResponse,
        percentage: (totalForResponse / filteredData.length) * 100
      };
    });
    
    // Sort by count (highest first)
    setResponseData(_.orderBy(responseStats, ['total'], ['desc']));
  };
  
  // Generate age distribution for selected responses
  const generateAgeDistribution = (data) => {
    if (!selectedResponses.length || !data.length) {
      setAgeDistribution([]);
      return;
    }
    
    const propositionKey = `proposition_${selectedQuestionNumber}`;
    
    // Get unique age groups from the data
    const uniqueAgeGroups = _.uniq(
      data
        .filter(item => item.age_group && item.age_group.trim() !== '')
        .map(item => item.age_group)
    );
    
    // Initialize age distribution data structure
    const ageDistributionData = uniqueAgeGroups.map(ageGroup => ({
      ageGroup,
      count: 0,
      // Add sort order for proper age group sequencing
      sortOrder: AGE_GROUP_ORDER.indexOf(ageGroup) !== -1 
        ? AGE_GROUP_ORDER.indexOf(ageGroup) 
        : 999
    }));
    
    // Get total counts by age group for percentage calculation
    const totalsByAgeGroup = {};
    uniqueAgeGroups.forEach(ageGroup => {
      totalsByAgeGroup[ageGroup] = data.filter(item => item.age_group === ageGroup).length;
    });
    
    // Count total responses by selected options
    const totalResponseCounts = {};
    selectedResponses.forEach(responseValue => {
      totalResponseCounts[responseValue] = data.filter(item => 
        item[propositionKey] === responseValue
      ).length;
    });
    
    // Process each selected response
    selectedResponses.forEach(responseValue => {
      // Filter data to the selected response
      const filteredData = data.filter(item => 
        item[propositionKey] === responseValue &&
        item.age_group
      );
      
      // Count by age group
      filteredData.forEach(item => {
        const ageGroupData = ageDistributionData.find(d => d.ageGroup === item.age_group);
        if (ageGroupData) {
          ageGroupData.count++;
          if (!ageGroupData[responseValue]) {
            ageGroupData[responseValue] = 0;
            ageGroupData[`${responseValue}_percent`] = 0;
            ageGroupData[`${responseValue}_percent_of_total`] = 0;
          }
          ageGroupData[responseValue]++;
          
          // Calculate percentage within age group
          if (totalsByAgeGroup[item.age_group] > 0) {
            ageGroupData[`${responseValue}_percent`] = 
              (ageGroupData[responseValue] / totalsByAgeGroup[item.age_group]) * 100;
          }
          
          // Calculate percentage of total for this response
          if (totalResponseCounts[responseValue] > 0) {
            ageGroupData[`${responseValue}_percent_of_total`] = 
              (ageGroupData[responseValue] / totalResponseCounts[responseValue]) * 100;
          }
        }
      });
    });
    
    // Sort by the defined age group order
    setAgeDistribution(_.sortBy(ageDistributionData, 'sortOrder'));
  };
  
  // Find available question numbers in the data
  const getAvailableQuestionNumbers = (data) => {
    const availableNumbers = [];
    
    // Find all question keys that start with "question_" and have corresponding proposition keys
    if (data && data.length > 0) {
      const sampleRow = data[0];
      Object.keys(sampleRow).forEach(key => {
        if (key.startsWith('question_')) {
          const num = key.replace('question_', '');
          const propositionKey = `proposition_${num}`;
          
          // Check if both question and proposition exist in the data
          if (propositionKey in sampleRow && 
              data.some(row => row[key] && row[propositionKey])) {
            availableNumbers.push(num);
          }
        }
      });
    }
    
    return availableNumbers;
  };
  
  // Find repurchase-related questions
  const findRepurchaseQuestion = (data) => {
    const repurchaseKeywords = ['purchase again', 'buy again', 'repurchase', 'reorder'];
    
    const questions = getAvailableQuestionNumbers(data);
    
    // Look for questions containing repurchase keywords
    for (const num of questions) {
      const questionKey = `question_${num}`;
      const questionText = data.find(item => item[questionKey] && item[questionKey].trim() !== '')
        ? data.find(item => item[questionKey] && item[questionKey].trim() !== '')[questionKey]
        : '';
      
      if (questionText && repurchaseKeywords.some(keyword => 
        questionText.toLowerCase().includes(keyword))) {
        return num;
      }
    }
    
    // Default to first question if no repurchase question found
    return questions.length > 0 ? questions[0] : null;
  };
  
  // Update demographic data when filtered data changes
  const updateDemographicData = () => {
    const filteredData = getFilteredData();
    
    // Exit if no data
    if (!filteredData || filteredData.length === 0) return;
    
    // Analyze basic demographics
    analyzeDemographicData(filteredData);
    
    // Find repurchase question if needed
    if (!selectedQuestionNumber || selectedQuestionNumber === '08') {
      const repurchaseQuestion = findRepurchaseQuestion(filteredData);
      if (repurchaseQuestion) {
        setSelectedQuestionNumber(repurchaseQuestion);
      }
    }
    
    // Analyze question data
    analyzeQuestionData(filteredData);
    
    // Generate age distribution for selected responses
    if (selectedResponses.length > 0) {
      generateAgeDistribution(filteredData);
    }
  };
  
  // All demographic data for export
  const getAllDemographicData = () => {
    // Use export state if available, otherwise use current state
    const data = isExportingRef.current ? getExportData() : {
      selectedQuestionNumber,
      selectedResponses,
      responseData,
      ageDistribution,
      genderData,
      ageData,
      uniqueResponses,
      currentQuestionText
    };
    
    return {
      ...data,
      getCurrentQuestionText: data.currentQuestionText
    };
  };
  
  return (
    <DemographicsContext.Provider value={{
      // State
      selectedQuestionNumber,
      setSelectedQuestionNumber,
      selectedResponses,
      setSelectedResponses,
      responseData,
      ageDistribution,
      genderData,
      ageData,
      uniqueResponses,
      currentQuestionText,
      
      // Methods
      handleResponseSelection,
      analyzeDemographicData,
      analyzeQuestionData,
      generateAgeDistribution,
      getAvailableQuestionNumbers,
      findRepurchaseQuestion,
      updateDemographicData,
      
      // Export helpers
      cacheForExport,
      getExportData,
      clearExportState,
      getAllDemographicData
    }}>
      {children}
    </DemographicsContext.Provider>
  );
};

export default DemographicsContext;