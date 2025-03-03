import React, { createContext, useContext, useState, useCallback } from 'react';
import _ from 'lodash';

// Create the context
const DemographicsContext = createContext();

// Custom hook to use the demographics context
export const useDemographics = () => useContext(DemographicsContext);

// Define the Demographics Provider component
export const DemographicsProvider = ({ children }) => {
  // State for demographic data
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedResponses, setSelectedResponses] = useState([]);
  const [responseData, setResponseData] = useState([]);
  const [ageDistribution, setAgeDistribution] = useState([]);
  const [uniqueResponses, setUniqueResponses] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);

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

  // Function to analyze demographic data
  const analyzeDemographics = useCallback((data) => {
    if (!data || data.length === 0) return;

    // Extract available questions
    const questions = [];
    if (data[0]) {
      Object.keys(data[0]).forEach(key => {
        if (key.startsWith('question_')) {
          const questionNum = key.replace('question_', '');
          if (data.some(item => item[`proposition_${questionNum}`])) {
            questions.push(questionNum);
          }
        }
      });
    }
    setAvailableQuestions(questions);

    // Set default selected question if none is set
    if (!selectedQuestion && questions.length > 0) {
      setSelectedQuestion(questions[0]);
    }
  }, [selectedQuestion]);

  // Function to analyze a specific question
  const analyzeQuestion = useCallback((data, questionNumber) => {
    if (!data || data.length === 0 || !questionNumber) return;

    const questionKey = `question_${questionNumber}`;
    const propositionKey = `proposition_${questionNumber}`;

    // Filter valid responses
    const filteredData = data.filter(item => 
      item[questionKey] && item[questionKey].trim() !== '' &&
      item[propositionKey] && item[propositionKey].trim() !== '' &&
      item.age_group
    );

    // Get unique responses
    const responses = _.uniq(filteredData.map(item => item[propositionKey])).filter(Boolean);
    setUniqueResponses(responses);

    // Reset selected responses
    setSelectedResponses([]);

    // Calculate response stats
    const groupedByResponse = _.groupBy(filteredData, propositionKey);
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
  }, []);

  // Function to generate age distribution for selected responses
  const generateAgeDistribution = useCallback((data, questionNumber, responses) => {
    if (!responses.length || !data || !data.length || !questionNumber) return;
    
    const propositionKey = `proposition_${questionNumber}`;
    
    // Get unique age groups
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
    responses.forEach(responseValue => {
      totalResponseCounts[responseValue] = data.filter(item => 
        item[propositionKey] === responseValue
      ).length;
    });
    
    // Process each selected response
    responses.forEach(responseValue => {
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
  }, [AGE_GROUP_ORDER]);

  // Function to get current question text
  const getQuestionText = useCallback((data, questionNumber) => {
    if (!data || !questionNumber) return '';
    
    const questionKey = `question_${questionNumber}`;
    const questionFromData = data.find(item => item[questionKey] && item[questionKey].trim() !== '');
    
    if (questionFromData) {
      return questionFromData[questionKey];
    }
    
    return `Question ${questionNumber}`;
  }, []);

  // Function to handle response selection
  const handleResponseSelection = useCallback((response) => {
    setSelectedResponses(prev => {
      if (prev.includes(response)) {
        // Remove if already selected
        return prev.filter(r => r !== response);
      } else {
        // Add if not selected
        return [...prev, response];
      }
    });
  }, []);

  // Function to export demographic data
  const exportDemographicData = useCallback(() => {
    return {
      responseData,
      selectedResponses,
      ageDistribution,
      uniqueResponses,
      selectedQuestion
    };
  }, [responseData, selectedResponses, ageDistribution, uniqueResponses, selectedQuestion]);

  // Value object to be provided to consumers
  const value = {
    selectedQuestion,
    setSelectedQuestion,
    selectedResponses,
    setSelectedResponses,
    responseData,
    ageDistribution,
    uniqueResponses,
    availableQuestions,
    AGE_GROUP_ORDER,
    analyzeDemographics,
    analyzeQuestion,
    generateAgeDistribution,
    getQuestionText,
    handleResponseSelection,
    exportDemographicData
  };

  return (
    <DemographicsContext.Provider value={value}>
      {children}
    </DemographicsContext.Provider>
  );
};

export default DemographicsContext;