// src/components/dashboard/tabs/DemographicsTab.js
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useTheme } from '../../../context/ThemeContext';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useFormattedData } from '../../../hooks/useFormattedData';
import { useDateHandling } from '../../../hooks/useDateHandling';
import performanceMonitor from '../../../utils/performanceMonitor';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import _ from 'lodash';

// Age group sort order
const AGE_GROUP_ORDER = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Under 18'
];

const DemographicsTab = ({ isSharedView }) => {
  // Track performance
  useEffect(() => {
    performanceMonitor.startTimer('DemographicsTab-render');
    return () => {
      performanceMonitor.endTimer('DemographicsTab-render');
    };
  });
  
  // Get hooks
  const { darkMode } = useTheme();
  const { colors } = useThemeColors();
  const { formatDate } = useDateHandling();
  const { formatNumber, formatPercentage } = useFormattedData();
  
  // Get data from context
  const { 
    filteredData, 
    brandNames, 
    clientName,
    getFilteredData
  } = useData();
  
  // Local state for survey question handling
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [responseData, setResponseData] = useState([]);
  const [selectedResponses, setSelectedResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [responseByGender, setResponseByGender] = useState([]);
  const [responseByAge, setResponseByAge] = useState([]);
  const [isProcessingDemographics, setIsProcessingDemographics] = useState(false);
  
  // Get survey data from the filtered data
  useEffect(() => {
    if (!filteredData || filteredData.length === 0) return;
    
    // Extract available questions
    const questionFields = [];
    const sampleRow = filteredData[0];
    
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
    
    // Create question objects
    const extractedQuestions = [];
    questionFields.forEach(field => {
      // Try to get the question text from the data
      let questionText = `Question ${parseInt(field.number)}`;
      
      // Find the first row with a non-empty question text
      for (const row of filteredData) {
        if (row[field.questionKey] && typeof row[field.questionKey] === 'string' && row[field.questionKey].trim() !== '') {
          questionText = row[field.questionKey];
          break;
        }
      }
      
      // Only add if there are propositions for this question
      const hasPropositions = filteredData.some(row => 
        row[field.propKey] && 
        typeof row[field.propKey] === 'string' && 
        row[field.propKey].trim() !== ''
      );
      
      if (hasPropositions) {
        extractedQuestions.push({ 
          number: field.number, 
          text: questionText
        });
      }
    });
    
    setQuestions(extractedQuestions);
    setAvailableQuestions(extractedQuestions.map(q => q.number));
    
    // Auto-select the first question if none is selected
    if ((!selectedQuestionNumber || selectedQuestionNumber === '') && extractedQuestions.length > 0) {
      setSelectedQuestionNumber(extractedQuestions[0].number);
    }
  }, [filteredData, selectedQuestionNumber]);
  
  // Process responses when a question is selected
  useEffect(() => {
    if (!selectedQuestionNumber) return;
    
    // Find the question text
    const question = questions.find(q => q.number === selectedQuestionNumber);
    setQuestionText(question ? question.text : `Question ${parseInt(selectedQuestionNumber)}`);
    
    // Analyze responses
    analyzeResponses(selectedQuestionNumber);
  }, [selectedQuestionNumber, questions]);
  
  // Process demographic data for selected responses
  useEffect(() => {
    if (selectedResponses.length > 0) {
      processResponseDemographics(selectedQuestionNumber, selectedResponses);
    }
  }, [selectedResponses, selectedQuestionNumber]);
  
  // Analyze responses for a question
  const analyzeResponses = (questionNum) => {
    if (!filteredData || filteredData.length === 0) {
      return;
    }
    
    const propKey = `proposition_${questionNum}`;
    
    // Check if the proposition field exists in the data
    const propExists = filteredData.some(row => row[propKey] !== undefined);
    
    if (!propExists) {
      setResponseData([]);
      return;
    }
    
    // Filter responses that have non-empty propositions
    const responses = filteredData.filter(row => 
      row[propKey] !== undefined && 
      row[propKey] !== null && 
      row[propKey] !== '');
    
    if (responses.length === 0) {
      setResponseData([]);
      return;
    }
    
    // Count occurrences of each response
    const responseCount = {};
    
    responses.forEach(row => {
      const responseStr = row[propKey];
      if (!responseStr) return;
      
      // Split by semicolon if it's a multiple-choice response
      const individualResponses = responseStr.split(';').map(r => r.trim());
      
      // Count each individual response
      individualResponses.forEach(response => {
        if (!response) return;
        responseCount[response] = (responseCount[response] || 0) + 1;
      });
    });
    
    // Convert to array for display
    const responseArray = Object.entries(responseCount).map(([fullResponse, count]) => {
      const percentage = ((count / responses.length) * 100).toFixed(1);
      return { fullResponse, count, percentage };
    });
    
    // Sort by count
    responseArray.sort((a, b) => b.count - a.count);
    
    setResponseData(responseArray);
  };
  
  // Process demographics for selected responses
  const processResponseDemographics = (questionNumber, selectedResps) => {
    if (!questionNumber || !selectedResps || selectedResps.length === 0 || !filteredData) return;
    
    setIsProcessingDemographics(true);
    
    try {
      const propKey = `proposition_${questionNumber}`;
      
      // Filter data for the selected responses
      const responseRows = filteredData.filter(row => {
        if (!row[propKey]) return false;
        return selectedResps.some(resp => row[propKey] === resp.fullResponse);
      });
      
      if (responseRows.length === 0) {
        setResponseByGender([]);
        setResponseByAge([]);
        setIsProcessingDemographics(false);
        return;
      }
      
      // Process gender breakdown
      const genderGroups = _.groupBy(
        responseRows.filter(row => row.gender),
        'gender'
      );
      
      const genderData = Object.entries(genderGroups).map(([gender, items]) => ({
        name: gender,
        value: items.length,
        total: responseRows.length,
        percentage: ((items.length / responseRows.length) * 100).toFixed(1)
      })).sort((a, b) => b.value - a.value);
      
      setResponseByGender(genderData);
      
      // Process age breakdown
      const ageGroups = _.groupBy(
        responseRows.filter(row => row.age_group),
        'age_group'
      );
      
      const ageData = Object.entries(ageGroups).map(([ageGroup, items]) => ({
        name: ageGroup,
        value: items.length,
        total: responseRows.length,
        percentage: ((items.length / responseRows.length) * 100).toFixed(1)
      }));
      
      // Sort by preferred age group order
      ageData.sort((a, b) => {
        const aIndex = AGE_GROUP_ORDER.indexOf(a.name);
        const bIndex = AGE_GROUP_ORDER.indexOf(b.name);
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        return a.name.localeCompare(b.name);
      });
      
      setResponseByAge(ageData);
    } catch (error) {
      console.error("Error processing response demographics:", error);
    } finally {
      setIsProcessingDemographics(false);
    }
  };
  
  // Handle question selection change
  const handleQuestionChange = (e) => {
    const questionNum = e.target.value;
    setSelectedQuestionNumber(questionNum);
    setSelectedResponses([]);
  };
  
  // Handle response selection
  const handleResponseClick = (response) => {
    const isSelected = selectedResponses.some(r => r.fullResponse === response.fullResponse);
    
    if (isSelected) {
      setSelectedResponses(prev => prev.filter(r => r.fullResponse !== response.fullResponse));
    } else {
      setSelectedResponses(prev => [...prev, response]);
    }
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-block w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {`Percentage: ${((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}%`}
          </p>
        </div>
      );
    }
    return null;
  };
  
  // If no data or no questions, show empty state
  if (!filteredData || filteredData.length === 0 || availableQuestions.length === 0) {
    return (
      <div className={`flex justify-center items-center h-64 ${darkMode ? 'bg-gray-900 text-gray-200' : 'text-gray-900'}`}>
        <div className="text-center">
          <svg className={`mx-auto h-12 w-12 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className={`mt-2 text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>No survey data available</h3>
          <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Please upload an items_purchased.CSV file for sales data.</p>
        </div>
      </div>
    );
  }
  
  // Render full component
  // ...the rest of the component rendering code...
  
  return (
    <div className={`demographics-tab p-4 ${darkMode ? 'bg-gray-900 text-white' : ''}`}>
      {/* Component UI */}
      {/* Question dropdown, response analysis, demographic charts, etc. */}
    </div>
  );
};

export default React.memo(DemographicsTab);