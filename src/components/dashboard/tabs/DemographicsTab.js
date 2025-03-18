import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { useTheme } from '../../../context/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useClientData } from '../../../context/ClientDataContext';
import { useExport } from '../../../hooks/useExport';
import { useDateHandling } from '../../../hooks/useDateHandling';
import { useFormattedData } from '../../../hooks/useFormattedData';
import { useThemeColors } from '../../../hooks';
import _ from 'lodash';

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

const DemographicsTab = ({ isSharedView }) => {
  console.log("DemographicsTab rendering, isSharedView:", isSharedView);
  
  // Use hooks for theme and colors
  const { darkMode } = useTheme();
  const { colors } = useThemeColors();
  const { exportToCSV } = useExport();
  const { formatDate } = useDateHandling();
  const { formatPercentage, formatNumber } = useFormattedData();
  
  // Use client data or main data context based on isSharedView
  const dataContext = useData();
  const clientContext = useClientData();
  
  // Log available context data to help debug
  console.log("Data context available:", {
    salesDataLength: dataContext?.salesData?.length,
    hasClientContext: !!clientContext
  });
  
  if (isSharedView && clientContext) {
    console.log("Client context details:", {
      hasSalesData: !!clientContext.salesData?.length,
      hasSurveyData: !!clientContext.surveyData,
      hasFilteredData: !!clientContext.filteredData?.length
    });
    
    if (clientContext.surveyData) {
      console.log("Survey data available questions:", Object.keys(clientContext.surveyData.questions || {}));
    }
  }
  
  const contextData = isSharedView ? clientContext : dataContext;
  
  // More debug logging
  if (!contextData) {
    console.error("No context data available!");
  }
  
  // Get data from context
  const { 
    salesData,
    filteredData: directFilteredData,
    surveyData
  } = contextData || {};
  
  console.log("Demographics Tab data received:", {
    hasSalesData: !!salesData?.length,
    hasFilteredData: !!directFilteredData?.length,
    hasSurveyData: !!surveyData
  });
  
  // Use refs to track component mounting state
  const isMounted = useRef(true);
  
  // State variables
  const [responseByGender, setResponseByGender] = useState([]);
  const [responseByAge, setResponseByAge] = useState([]); 
  const [isProcessingDemographics, setIsProcessingDemographics] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [responseData, setResponseData] = useState([]);
  const [selectedResponses, setSelectedResponses] = useState([]);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (isSharedView && contextData?.surveyData?.questions) {
      console.log("Setting up questions from surveyData");
      
      const questionData = contextData.surveyData.questions;
      const questionNumbers = Object.keys(questionData);
      
      // Set available questions
      setAvailableQuestions(questionNumbers);
      
      // Create formatted question objects for rendering
      const extractedQuestions = questionNumbers.map(num => {
        const qData = questionData[num];
        return {
          number: num,
          text: qData.questionText || `Question ${parseInt(num)}`
        };
      });
      
      console.log("Formatted questions for dropdown:", extractedQuestions);
      setQuestions(extractedQuestions);
      
      // Auto-select the first question if none is selected
      if ((!selectedQuestionNumber || selectedQuestionNumber === '') && questionNumbers.length > 0) {
        console.log("Auto-selecting first question:", questionNumbers[0]);
        setSelectedQuestionNumber(questionNumbers[0]);
        
        // Also pre-load the question data
        if (questionData[questionNumbers[0]]) {
          const firstQuestionData = questionData[questionNumbers[0]];
          setQuestionText(firstQuestionData.questionText || `Question ${parseInt(questionNumbers[0])}`);
          
          // Format response data
          const formattedResponses = Object.entries(firstQuestionData.counts || {}).map(([response, count]) => {
            const percentage = ((count / firstQuestionData.totalResponses) * 100).toFixed(1);
            return {
              fullResponse: response,
              count,
              percentage
            };
          }).sort((a, b) => b.count - a.count);
          
          setResponseData(formattedResponses);
        }
      }
    }
  }, [isSharedView, contextData?.surveyData]);

  
  // Extract questions from data
  useEffect(() => {
    if (salesData && salesData.length > 0) {
      // For shared view, check if we have precomputed survey data
      if (isSharedView && contextData.surveyData) {
        console.log("Using precomputed survey data in shared view", contextData.surveyData);
        const surveyData = contextData.surveyData;
        
        // Get available questions from the survey data
        const questionNumbers = Object.keys(surveyData.questions);
        console.log("Found question numbers:", questionNumbers);
        setAvailableQuestions(questionNumbers);
        
        // Set default selected question if none is set
        if ((!selectedQuestionNumber || selectedQuestionNumber === '') && questionNumbers.length > 0) {
          console.log("Setting default question to:", questionNumbers[0]);
          setSelectedQuestionNumber(questionNumbers[0]);
        }
      } else {
        // Original code for analyzing the data in the main dashboard
        console.log("Extracting questions from raw data");
        
        // Look for question fields
        const questionFields = [];
        const sampleRow = salesData[0];
        
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
        
        // Create question objects
        const extractedQuestions = [];
        questionFields.forEach(field => {
          // Try to get the question text from the data
          let questionText = `Question ${parseInt(field.number)}`;
          
          // Find the first row with a non-empty question text
          for (const row of salesData) {
            if (row[field.questionKey] && typeof row[field.questionKey] === 'string' && row[field.questionKey].trim() !== '') {
              questionText = row[field.questionKey];
              break;
            }
          }
          
          // Only add if there are propositions for this question
          const hasPropositions = salesData.some(row => 
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
        
        console.log("Extracted questions:", extractedQuestions);
        setQuestions(extractedQuestions);
        setAvailableQuestions(extractedQuestions.map(q => q.number));
      }
    }
  }, [salesData, isSharedView, contextData, selectedQuestionNumber]);

  // Set up mounted ref for cleanup
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
 // Process demographic data when responses are selected
 useEffect(() => {
  if (selectedQuestionNumber) {
    // Find the question text
    let questionText = '';
    
    // Handle both shared view and regular context
    if (isSharedView && contextData.surveyData && 
        contextData.surveyData.questions && 
        contextData.surveyData.questions[selectedQuestionNumber]) {
        
      // Get data from precomputed survey data
      const questionData = contextData.surveyData.questions[selectedQuestionNumber];
      questionText = questionData.questionText || `Question ${parseInt(selectedQuestionNumber)}`;
      
      // Format response data for the UI
      const formattedResponses = Object.entries(questionData.counts || {}).map(([response, count]) => {
        const percentage = ((count / (questionData.totalResponses || 1)) * 100).toFixed(1);
        return {
          fullResponse: response,
          count,
          percentage
        };
      }).sort((a, b) => b.count - a.count);
      
      setResponseData(formattedResponses);
    } else {
      // If we don't have precomputed data, analyze it from scratch
      
      // First try to find the question from the loaded questions
      const question = questions.find(q => q.number === selectedQuestionNumber);
      questionText = question ? question.text : `Question ${parseInt(selectedQuestionNumber)}`;
      
      // Analyze responses for this question from the available sales data
      analyzeResponses(selectedQuestionNumber);
    }
    
    setQuestionText(questionText);
  } else {
    setQuestionText('');
    setResponseData([]);
  }
}, [selectedQuestionNumber, questions, isSharedView, contextData]);

const processSharedResponseDemographics = (questionData, selectedResps) => {
  if (!questionData || !selectedResps || selectedResps.length === 0) return;
  
  setIsProcessingDemographics(true);
  
  try {
    // Get gender breakdown for the selected responses
    const genderData = [];
    const genderBreakdown = questionData.demographics.gender;
    
    if (genderBreakdown) {
      // Calculate totals for the selected responses by gender
      const selectedResponsesByGender = {};
      
      // Initialize counts for each gender
      Object.keys(genderBreakdown).forEach(gender => {
        selectedResponsesByGender[gender] = 0;
        
        // Count occurrences of selected responses for this gender
        selectedResps.forEach(selectedResp => {
          const respBreakdown = genderBreakdown[gender].responseBreakdown;
          if (respBreakdown[selectedResp.fullResponse]) {
            selectedResponsesByGender[gender] += respBreakdown[selectedResp.fullResponse];
          }
        });
      });
      
      // Calculate total across all selected responses
      const totalSelected = Object.values(selectedResponsesByGender).reduce((sum, count) => sum + count, 0);
      
      // Format for UI
      Object.entries(selectedResponsesByGender).forEach(([gender, count]) => {
        if (count > 0) {
          genderData.push({
            name: gender,
            value: count,
            total: totalSelected,
            percentage: ((count / totalSelected) * 100).toFixed(1)
          });
        }
      });
      
      // Sort by count
      genderData.sort((a, b) => b.value - a.value);
      setResponseByGender(genderData);
    }
    
    // Get age breakdown for the selected responses
    const ageData = [];
    const ageBreakdown = questionData.demographics.age;
    
    if (ageBreakdown) {
      // Calculate totals for the selected responses by age group
      const selectedResponsesByAge = {};
      
      // Initialize counts for each age group
      Object.keys(ageBreakdown).forEach(ageGroup => {
        selectedResponsesByAge[ageGroup] = 0;
        
        // Count occurrences of selected responses for this age group
        selectedResps.forEach(selectedResp => {
          const respBreakdown = ageBreakdown[ageGroup].responseBreakdown;
          if (respBreakdown[selectedResp.fullResponse]) {
            selectedResponsesByAge[ageGroup] += respBreakdown[selectedResp.fullResponse];
          }
        });
      });
      
      // Calculate total across all selected responses
      const totalSelected = Object.values(selectedResponsesByAge).reduce((sum, count) => sum + count, 0);
      
      // Format for UI
      Object.entries(selectedResponsesByAge).forEach(([ageGroup, count]) => {
        if (count > 0) {
          ageData.push({
            name: ageGroup,
            value: count,
            total: totalSelected,
            percentage: ((count / totalSelected) * 100).toFixed(1)
          });
        }
      });
      
      // Sort by age group in a logical order if possible
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
    }
  } catch (error) {
    console.error("Error processing shared demographic data:", error);
  } finally {
    setIsProcessingDemographics(false);
  }
};

  // Handle user changing the selected question
  const handleQuestionChange = (e) => {
    const questionNum = e.target.value;
    setSelectedQuestionNumber(questionNum);
    setSelectedResponses([]);
    
    if (questionNum) {
      if (isSharedView && contextData.surveyData && contextData.surveyData.questions[questionNum]) {
        console.log("Loading shared question data for:", questionNum);
        // Get data from precomputed survey data
        const questionData = contextData.surveyData.questions[questionNum];
        setQuestionText(questionData.questionText || `Question ${parseInt(questionNum)}`);
        
        // Format response data for the UI
        const formattedResponses = Object.entries(questionData.counts).map(([response, count]) => {
          const percentage = ((count / questionData.totalResponses) * 100).toFixed(1);
          return {
            fullResponse: response,
            count,
            percentage
          };
        }).sort((a, b) => b.count - a.count);
        
        console.log("Formatted responses for shared view:", formattedResponses);
        setResponseData(formattedResponses);
      } else {
        // Find the question text
        const question = questions.find(q => q.number === questionNum);
        setQuestionText(question ? question.text : `Question ${parseInt(questionNum)}`);
        
        // Analyze responses for this question
        analyzeResponses(questionNum);
      }
    } else {
      setQuestionText('');
      setResponseData([]);
    }
  };

  const analyzeResponses = (questionNum) => {
    if (!salesData || salesData.length === 0) {
      return;
    }
    
    // Define the key for this question's proposition
    const propKey = `proposition_${questionNum}`;
    
    // Check if the proposition field exists in the data
    const propExists = salesData.some(row => row[propKey] !== undefined);
    
    if (!propExists) {
      setResponseData([]);
      return;
    }
    
    // Filter responses that have non-empty propositions
    const responses = salesData.filter(row => 
      row[propKey] !== undefined && 
      row[propKey] !== null && 
      row[propKey] !== '');
    
    if (responses.length === 0) {
      setResponseData([]);
      return;
    }
    
    // Set the total number of respondents
    const totalResponses = responses.length;
    
    // Count occurrences of each INDIVIDUAL response
    const individualResponseCounts = {};
    
    responses.forEach(row => {
      const responseStr = row[propKey];
      if (!responseStr) return;
      
      // Split by semicolon if it's a multiple-choice response
      const individualResponses = responseStr.split(';').map(r => r.trim());
      
      // Count each individual response
      individualResponses.forEach(response => {
        // Skip empty responses
        if (!response) return;
        individualResponseCounts[response] = (individualResponseCounts[response] || 0) + 1;
      });
    });
    
    // Convert to array for display
    const responseArray = Object.entries(individualResponseCounts).map(([fullResponse, count]) => {
      const percentage = ((count / totalResponses) * 100).toFixed(1);
      return { fullResponse, count, percentage };
    });
    
    // Sort by count (descending)
    responseArray.sort((a, b) => b.count - a.count);
    
    setResponseData(responseArray);
  };

  // Handle user selecting a response
  const handleResponseClick = (response) => {
    const isSelected = selectedResponses.some(r => r.fullResponse === response.fullResponse);
    
    if (isSelected) {
      setSelectedResponses(prev => {
        const newSelection = prev.filter(r => r.fullResponse !== response.fullResponse);
        return newSelection;
      });
    } else {
      setSelectedResponses(prev => {
        const newSelection = [...prev, response];
        return newSelection;
      });
    }
  };

  // Export data to CSV using the useExport hook
  const exportDemographicsData = () => {
    if (selectedQuestionNumber && responseData.length > 0) {
      const exportData = {
        title: `Question ${parseInt(selectedQuestionNumber)} Responses Analysis`,
        sections: [
          {
            title: 'Response Distribution',
            data: responseData.map(item => ({
              Response: item.fullResponse,
              Count: item.count,
              Percentage: `${item.percentage}%`
            }))
          }
        ]
      };
      
      // Add gender breakdown if available
      if (selectedResponses.length > 0 && responseByGender.length > 0) {
        exportData.sections.push({
          title: 'Gender Distribution',
          data: responseByGender.map(item => ({
            Gender: item.name,
            Count: item.value,
            Percentage: `${item.percentage}%`
          }))
        });
      }
      
      // Add age breakdown if available
      if (selectedResponses.length > 0 && responseByAge.length > 0) {
        exportData.sections.push({
          title: 'Age Distribution',
          data: responseByAge.map(item => ({
            'Age Group': item.name,
            Count: item.value,
            Percentage: `${item.percentage}%`
          }))
        });
      }
      
      exportToCSV(exportData, `Question_${selectedQuestionNumber}_Analysis`);
    }
  };

  // Custom tooltip for charts with dark mode support
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700`}>
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
  if (!salesData || salesData.length === 0 || availableQuestions.length === 0) {
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

  return (
    <div className={`demographics-tab p-4 ${darkMode ? 'bg-gray-900 text-white' : ''}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Demographics Insights</h2>
        <button
          onClick={exportDemographicsData}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-md shadow-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Data
        </button>
      </div>
      
      {availableQuestions.length > 0 && (
        <div className={`mb-6 p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}>
          <label htmlFor="question-select" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Select Question:</label>
    
           {/* Enhanced dropdown with proper dark mode styling */}
            <select 
              id="question-select" 
              value={selectedQuestionNumber} 
              onChange={handleQuestionChange}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500' 
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-pink-500 focus:border-pink-500'
              } sm:text-sm rounded-md`}
              style={{
                boxShadow: darkMode ? 'none' : undefined
              }}
            >
              {questions.length > 0 ? (
                questions.map(q => (
                  <option 
                    key={q.number} 
                    value={q.number}
                    className={darkMode ? 'bg-gray-700 text-white' : ''}
                  >
                    {q.text.length > 70 ? q.text.substring(0, 70) + "..." : q.text}
                  </option>
                ))
              ) : (
                <option value="" disabled className={darkMode ? 'bg-gray-700 text-white' : ''}>No questions available</option>
              )}
            </select>
            
            {/* Show debug details in dev mode */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Available questions: {availableQuestions.join(', ')}
                <br/>
                Questions array length: {questions.length}
              </div>
            )}
            
            {questionText && (
              <div className={`mt-3 p-3 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} rounded border`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="font-medium">Question:</span> {questionText}
                </p>
              </div>
            )}
          </div>
        )}

      {/* Response Analysis */}
      {selectedQuestionNumber && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow mb-6`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : ''}`}>Response Analysis for Question {parseInt(selectedQuestionNumber)}</h3>
          <p className={`mb-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Select one or more responses to see demographic breakdowns</p>
          
          {responseData.length > 0 ? (
            <div className="overflow-hidden">
              <div className="mb-6">
                <div className="overflow-x-auto max-h-96">
                  <div className="grid grid-cols-1 gap-2">
                    {responseData.map((item, index) => (
                      <div 
                        key={index} 
                        onClick={() => handleResponseClick(item)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedResponses.some(r => r.fullResponse === item.fullResponse)
                            ? darkMode 
                              ? 'bg-pink-900 border-pink-700' 
                              : 'bg-pink-50 border-pink-300'
                            : darkMode
                              ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3" 
                              style={{ 
                                backgroundColor: colors.colorPalette[index % colors.colorPalette.length] 
                              }}
                            ></div>
                            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.fullResponse}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.count}
                            </span>
                            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Response Breakdowns */}
              {selectedResponses.length > 0 && (
                <div className={`mt-8 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-6`}>
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>
                    {selectedResponses.length === 1 
                      ? `Breakdown for "${selectedResponses[0].fullResponse}"` 
                      : `Breakdown for ${selectedResponses.length} selected responses`}
                  </h4>
                  
                  {/* Gender Breakdown */}
                  {responseByGender.length > 0 && (
                    <div className="mt-6">
                      <h5 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : ''}`}>Gender Breakdown</h5>
                      
                      {/* Gender Breakdown - Chart and Table side by side */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={responseByGender}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={darkMode ? colors.gridColor : colors.gridColor} 
                              />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fill: darkMode ? colors.textSecondary : colors.textSecondary }}
                                axisLine={{ stroke: darkMode ? colors.axisColor : colors.axisColor }}
                              />
                              <YAxis 
                                tick={{ fill: darkMode ? colors.textSecondary : colors.textSecondary }}
                                axisLine={{ stroke: darkMode ? colors.axisColor : colors.axisColor }}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend 
                                wrapperStyle={{ color: darkMode ? colors.textSecondary : colors.textSecondary }} 
                              />
                              <Bar dataKey="value" name="Count">
                                {responseByGender.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={colors.colorPalette[index % colors.colorPalette.length]} 
                                    stroke={darkMode ? "#374151" : "#fff"}
                                    strokeWidth={1}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Gender Table */}
                        <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                          <div className="overflow-x-auto">
                            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                              <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                                <tr>
                                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Gender</th>
                                  <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Count</th>
                                  <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Percentage</th>
                                </tr>
                              </thead>
                              <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                                {responseByGender.map((item, index) => {
                                  const total = responseByGender.reduce((sum, i) => sum + i.value, 0);
                                  const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
                                  
                                  return (
                                    <tr key={index}>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        <div className="flex items-center">
                                          <div 
                                            className="h-3 w-3 rounded-full mr-2" 
                                            style={{ 
                                              backgroundColor: colors.colorPalette[index % colors.colorPalette.length] 
                                            }}
                                          ></div>
                                          {item.name}
                                        </div>
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{item.value}</td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{percentage}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Age Breakdown */}
                  <div className="mt-6">
                    <h5 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : ''}`}>Age Breakdown</h5>
                    {responseByAge.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Age Bar Chart - Direct implementation with dark mode */}
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={responseByAge}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={darkMode ? colors.gridColor : colors.gridColor} 
                              />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fill: darkMode ? colors.textSecondary : colors.textSecondary }}
                                axisLine={{ stroke: darkMode ? colors.axisColor : colors.axisColor }}
                              />
                              <YAxis 
                                tick={{ fill: darkMode ? colors.textSecondary : colors.textSecondary }}
                                axisLine={{ stroke: darkMode ? colors.axisColor : colors.axisColor }}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend 
                                wrapperStyle={{ color: darkMode ? colors.textSecondary : colors.textSecondary }} 
                              />
                              <Bar dataKey="value" name="Count">
                                {responseByAge.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={colors.colorPalette[(index + 4) % colors.colorPalette.length]} 
                                    stroke={darkMode ? "#374151" : "#fff"}
                                    strokeWidth={1}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Age Table */}
                        <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                          <div className="overflow-x-auto">
                            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                              <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                                <tr>
                                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Age Group</th>
                                  <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Count</th>
                                  <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Percentage</th>
                                </tr>
                              </thead>
                              <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                                {responseByAge.map((item, index) => {
                                  const total = responseByAge.reduce((sum, i) => sum + i.value, 0);
                                  const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
                                  
                                  return (
                                    <tr key={index}>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        <div className="flex items-center">
                                          <div 
                                            className="h-3 w-3 rounded-full mr-2" 
                                            style={{ 
                                              backgroundColor: colors.colorPalette[(index + 4) % colors.colorPalette.length] 
                                            }}
                                          ></div>
                                          {item.name}
                                        </div>
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{item.value}</td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{percentage}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg flex items-center justify-center h-20`}>
                        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                          {selectedResponses.length > 0 
                            ? isProcessingDemographics ? "Loading age data..." : "No age data available"
                            : "Select a response to view age breakdown"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`flex items-center justify-center h-60 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No response data available for this question</p>
            </div>
          )}
        </div>
      )}
      
      {/* Explanation text at the bottom */}
      {selectedResponses.length > 0 && (
        <div className={`${darkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg shadow mt-4 border`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>How to interpret this data</h3>
              <div className={`mt-2 text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                <p>
                  The demographic breakdowns show the distribution of genders and age groups among respondents who
                  selected the highlighted response(s).
                </p>
                <p className="mt-1">
                  You can select multiple responses to compare demographic distributions across different answers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemographicsTab;