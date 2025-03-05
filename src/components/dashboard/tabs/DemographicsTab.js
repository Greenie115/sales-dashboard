import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import _ from 'lodash';

// Custom colors for light and dark mode
const LIGHT_COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800'];
const DARK_COLORS = ['#FF4D94', '#4D94FF', '#FFD54F', '#4DD0E1', '#CE93D8', '#81C784', '#FFB74D'];

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

// Custom tooltip for bar charts with dark mode support
const CustomTooltip = ({ active, payload, label }) => {
  // Get darkMode from context - make sure it's accessible here
  const { darkMode } = useData();
  
  if (active && payload && payload.length) {
    return (
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-3 border shadow-md rounded`}>
        <p className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{`${label}`}</p>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{`Count: ${payload[0].value}`}</p>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{`Percentage: ${((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}%`}</p>
      </div>
    );
  }
  return null;
};

const DemographicsTab = () => {
  // Get data from context including dark mode
  const { salesData, darkMode } = useData();
  
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
  
  // Extract questions from data
  useEffect(() => {
    if (salesData && salesData.length > 0) {
      console.log("Extracting questions from salesData");
      // Check what fields are in the data
      const sampleRow = salesData[0];
      console.log("Sample row:", sampleRow);
      
      // Look for question fields
      const questionFields = [];
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
  }, [salesData]);

  // Set up mounted ref for cleanup
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
 // Process demographic data when responses are selected
 useEffect(() => {
  // Skip if unmounted
  if (!isMounted.current) return;
  
  console.log("Processing demographics useEffect triggered");
  console.log("Selected responses:", selectedResponses.length);
  
  // Only process if we have selected responses and survey data
  if (selectedResponses.length > 0 && salesData && salesData.length > 0) {
    // Set processing flag to true
    setIsProcessingDemographics(true);
    
    // Use setTimeout to ensure React has time to render the loading state
    setTimeout(() => {
      // Skip if component unmounted during timeout
      if (!isMounted.current) return;
      
      try {
        console.log("Processing demographic data...");
        // Get selected response text values
        const selectedResponseValues = selectedResponses.map(r => r.fullResponse);
        const propKey = `proposition_${selectedQuestionNumber}`;
        
        // Filter survey data for rows containing ANY of the selected responses
        // Modified to check if any of the selected responses are present in each comma-separated response
        const filteredData = salesData.filter(row => {
          const responseStr = row[propKey];
          if (!responseStr) return false;
          
          // Split by semicolon if it's a multiple-choice response 
          const responses = responseStr.split(';').map(r => r.trim());
          
          // Check if any of the selected responses are in this row's responses
          return responses.some(resp => selectedResponseValues.includes(resp));
        });
        
        console.log(`Filtered data: ${filteredData.length} rows match selected responses`);
        
        // Gender breakdown
        const genderCounts = {};
        filteredData.forEach(row => {
          const gender = row.gender || 'Not Specified';
          genderCounts[gender] = (genderCounts[gender] || 0) + 1;
        });
        
        const totalGender = Object.values(genderCounts).reduce((sum, count) => sum + count, 0);
        
        const genderData = Object.entries(genderCounts).map(([name, value]) => ({
          name,
          value,
          total: totalGender,
          percentage: ((value / totalGender) * 100).toFixed(1)
        }));
        
        console.log("Gender data processed:", genderData.length);
        
        // Age breakdown
        const ageCounts = {};
        filteredData.forEach(row => {
          // Log a sample row to debug data structure
          if (!window.loggedSampleRow) {
            console.log("Sample data row:", row);
            window.loggedSampleRow = true;
          }
          
          const age = row.age_group || 'Not Specified';
          let ageGroup = age;
          
          // If the age is a number, convert it to a group
          if (age && !isNaN(age)) {
            const ageNum = parseInt(age, 10);
            if (ageNum < 18) ageGroup = 'Under 18';
            else if (ageNum < 25) ageGroup = '18-24';
            else if (ageNum < 35) ageGroup = '25-34';
            else if (ageNum < 45) ageGroup = '35-44';
            else if (ageNum < 55) ageGroup = '45-54';
            else if (ageNum < 65) ageGroup = '55-64';
            else ageGroup = '65+';
          }
          
          ageCounts[ageGroup] = (ageCounts[ageGroup] || 0) + 1;
        });
        
        const totalAge = Object.values(ageCounts).reduce((sum, count) => sum + count, 0);
        
        const ageData = Object.entries(ageCounts).map(([name, value]) => ({
          name,
          value,
          total: totalAge,
          percentage: ((value / totalAge) * 100).toFixed(1)
        }));
        
        // Sort age groups in a logical order if possible
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
        
        console.log("Age data processed:", ageData.length, ageData);
        
        // Skip update if component unmounted
        if (!isMounted.current) return;
        
        // First update the data
        setResponseByGender(genderData);
        setResponseByAge(ageData);
        
        // Then remove processing flag to show the data
        setIsProcessingDemographics(false);
      } catch (error) {
        console.error("Error processing demographic data:", error);
        // Reset processing flag even on error
        if (isMounted.current) {
          setIsProcessingDemographics(false);
        }
      }
    }, 100); // Short delay to ensure state updates properly
  } else if (selectedResponses.length === 0) {
    // Only clear if no responses are selected
    console.log("No responses selected, clearing demographic data");
    setResponseByGender([]);
    setResponseByAge([]);
    setIsProcessingDemographics(false);
  }
}, [selectedResponses, salesData, selectedQuestionNumber]);
  // Handle user changing the selected question
  const handleQuestionChange = (e) => {
    const questionNum = e.target.value;
    console.log("Question selected:", questionNum);
    setSelectedQuestionNumber(questionNum);
    setSelectedResponses([]);
    
    if (questionNum) {
      // Find the question text
      const question = questions.find(q => q.number === questionNum);
      setQuestionText(question ? question.text : `Question ${parseInt(questionNum)}`);
      
      // Analyze responses for this question
      console.log("Analyzing responses for question:", questionNum);
      analyzeResponses(questionNum);
    } else {
      setQuestionText('');
      setResponseData([]);
    }
  };

  const analyzeResponses = (questionNum) => {
    console.log("analyzeResponses called for question:", questionNum);
    console.log("salesData available:", salesData ? salesData.length : 0);
    
    if (!salesData || salesData.length === 0) {
      console.log("No survey data available");
      return;
    }
    
    // Log a sample row to understand data structure
    console.log("Sample survey data row:", salesData[0]);
    
    // Define the key for this question's proposition
    const propKey = `proposition_${questionNum}`;
    
    // Check if the proposition field exists in the data
    const propExists = salesData.some(row => row[propKey] !== undefined);
    console.log(`Proposition field ${propKey} exists in data:`, propExists);
    
    if (!propExists) {
      console.log("Proposition field not found in data");
      setResponseData([]);
      return;
    }
    
    // Filter responses that have non-empty propositions
    const responses = salesData.filter(row => 
      row[propKey] !== undefined && 
      row[propKey] !== null && 
      row[propKey] !== '');
    
    console.log(`Found ${responses.length} responses for question ${questionNum}`);
    
    if (responses.length === 0) {
      console.log("No responses found for this question");
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
    
    console.log("Individual response counts:", individualResponseCounts);
    
    // Convert to array for display
    const responseArray = Object.entries(individualResponseCounts).map(([fullResponse, count]) => {
      const percentage = ((count / totalResponses) * 100).toFixed(1);
      return { fullResponse, count, percentage };
    });
    
    // Sort by count (descending)
    responseArray.sort((a, b) => b.count - a.count);
    
    console.log("Response array:", responseArray);
    setResponseData(responseArray);
  };

  // Handle user selecting a response
  const handleResponseClick = (response) => {
    console.log("Response clicked:", response.fullResponse);
    const isSelected = selectedResponses.some(r => r.fullResponse === response.fullResponse);
    
    if (isSelected) {
      console.log("Deselecting response");
      setSelectedResponses(prev => {
        const newSelection = prev.filter(r => r.fullResponse !== response.fullResponse);
        console.log("New selection count:", newSelection.length);
        return newSelection;
      });
    } else {
      console.log("Selecting response");
      setSelectedResponses(prev => {
        const newSelection = [...prev, response];
        console.log("New selection count:", newSelection.length);
        return newSelection;
      });
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (selectedQuestionNumber && responseData.length > 0) {
      // Create CSV content
      let csvContent = 'Response,Count,Percentage\n';
      
      responseData.forEach(item => {
        csvContent += `"${item.fullResponse}",${item.count},${item.percentage}%\n`;
      });
      
      // Add gender breakdown if available
      if (selectedResponses.length > 0 && responseByGender.length > 0) {
        csvContent += '\nGender Breakdown\n';
        csvContent += 'Gender,Count,Percentage\n';
        
        const total = responseByGender.reduce((sum, item) => sum + item.value, 0);
        responseByGender.forEach(item => {
          const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
          csvContent += `"${item.name}",${item.value},${percentage}%\n`;
        });
      }
      
      // Add age breakdown if available
      if (selectedResponses.length > 0 && responseByAge.length > 0) {
        csvContent += '\nAge Breakdown\n';
        csvContent += 'Age Group,Count,Percentage\n';
        
        const total = responseByAge.reduce((sum, item) => sum + item.value, 0);
        responseByAge.forEach(item => {
          const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
          csvContent += `"${item.name}",${item.value},${percentage}%\n`;
        });
      }
      
      // Create download link
      const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Question_${selectedQuestionNumber}_Responses.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : ''}`}>Demographics Insights</h2>
        <button
          onClick={exportToCSV}
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
            {/* Add dark mode styling to option elements */}
            <option value="" className={darkMode ? 'bg-gray-700 text-white' : ''}>Select a question</option>
            {questions.map(q => (
              <option 
                key={q.number} 
                value={q.number}
                className={darkMode ? 'bg-gray-700 text-white' : ''}
              >
                {q.text.length > 70 ? q.text.substring(0, 70) + "..." : q.text}
              </option>
            ))}
          </select>
          
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
                                backgroundColor: darkMode 
                                  ? DARK_COLORS[index % DARK_COLORS.length] 
                                  : LIGHT_COLORS[index % LIGHT_COLORS.length] 
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
                        {/* Gender Bar Chart - Direct implementation with dark mode */}
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={responseByGender}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={darkMode ? '#444444' : '#e5e5e5'} 
                              />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fill: darkMode ? '#e5e5e5' : '#333333' }}
                                axisLine={{ stroke: darkMode ? '#555555' : '#333333' }}
                              />
                              <YAxis 
                                tick={{ fill: darkMode ? '#e5e5e5' : '#333333' }}
                                axisLine={{ stroke: darkMode ? '#555555' : '#333333' }}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend 
                                wrapperStyle={{ color: darkMode ? '#e5e5e5' : '#333333' }} 
                              />
                              <Bar dataKey="value" name="Count">
                                {responseByGender.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={darkMode ? DARK_COLORS[index % DARK_COLORS.length] : LIGHT_COLORS[index % LIGHT_COLORS.length]} 
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
                                              backgroundColor: darkMode 
                                                ? DARK_COLORS[index % DARK_COLORS.length] 
                                                : LIGHT_COLORS[index % LIGHT_COLORS.length] 
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
                                stroke={darkMode ? '#444444' : '#e5e5e5'} 
                              />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fill: darkMode ? '#e5e5e5' : '#333333' }}
                                axisLine={{ stroke: darkMode ? '#555555' : '#333333' }}
                              />
                              <YAxis 
                                tick={{ fill: darkMode ? '#e5e5e5' : '#333333' }}
                                axisLine={{ stroke: darkMode ? '#555555' : '#333333' }}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend 
                                wrapperStyle={{ color: darkMode ? '#e5e5e5' : '#333333' }} 
                              />
                              <Bar dataKey="value" name="Count">
                                {responseByAge.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={darkMode ? DARK_COLORS[(index + 4) % DARK_COLORS.length] : LIGHT_COLORS[(index + 4) % LIGHT_COLORS.length]} 
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
                                              backgroundColor: darkMode 
                                                ? DARK_COLORS[(index + 4) % DARK_COLORS.length] 
                                                : LIGHT_COLORS[(index + 4) % LIGHT_COLORS.length] 
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