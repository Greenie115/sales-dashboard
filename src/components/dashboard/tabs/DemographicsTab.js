import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import _ from 'lodash';

// Custom colors
const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800'];

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

const DemographicsTab = ({ surveyData, questions }) => {
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
  const [genderData, setGenderData] = useState([]);
  const [uniqueResponses, setUniqueResponses] = useState([]);
  
  // Define the getFilteredData function first
  const getFilteredData = (data, questionNumber, selectedRespons) => {
    if (!data || !questionNumber || !selectedRespons || selectedRespons.length === 0) {
      return [];
    }
    
    // Get selected response text values
    const selectedResponseValues = selectedRespons.map(r => r.fullResponse);
    
    // Filter survey data for rows containing selected responses
    return data.filter(row => {
      const response = row[`Q${questionNumber}`];
      return selectedResponseValues.includes(response);
    });
  };
  
  // Now use the function with the right parameters
  const filteredData = selectedResponses.length > 0 ? 
    getFilteredData(surveyData, selectedQuestionNumber, selectedResponses) : 
    [];

  // Helper to extract cleaner question content
  const extractCleanQuestionContent = (data, questionKey) => {
    const questionItems = data.filter(item => item[questionKey] && item[questionKey].trim() !== '');
    
    if (questionItems.length === 0) return '';
    
    // Get the most common question text
    const questionTexts = _.countBy(questionItems, questionKey);
    const mostCommonQuestionText = Object.entries(questionTexts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    return mostCommonQuestionText;
  };

  // Helper to extract clean response values
  const extractCleanResponses = (data, responseKey) => {
    // Get all responses
    const responses = data
      .map(item => item[responseKey])
      .filter(response => response && response.trim() !== '');
    
    if (responses.length === 0) return [];
    
    // Find unique responses by checking for common delimiters
    const possibleDelimiters = [';', '|', ',', '/', '\\'];
    let cleanResponses = [...responses];
    
    // Check if responses contain any of the delimiters
    for (const delimiter of possibleDelimiters) {
      if (responses.some(r => r.includes(delimiter))) {
        // Extract individual responses by splitting by delimiter
        const splitResponses = [];
        responses.forEach(response => {
          const parts = response.split(delimiter)
            .map(part => part.trim())
            .filter(part => part !== '');
          splitResponses.push(...parts);
        });
        
        cleanResponses = splitResponses;
        break;
      }
    }
    
    // Get unique clean responses
    return [...new Set(cleanResponses)];
  };// Analyze available questions when data loads

  useEffect(() => {
    console.log("surveyData available:", surveyData ? surveyData.length : 0);
    console.log("Sample survey data:", surveyData && surveyData.length > 0 ? surveyData[0] : "None");
  }, [surveyData]);

  // Set up mounted ref for cleanup
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (surveyData && surveyData.length > 0) {
      // Extract available question numbers
      const questionNums = questions.map(q => q.number.toString());
      setAvailableQuestions(questionNums);
    }
  }, [surveyData, questions]);
  
  // Process demographic data when responses are selected
  useEffect(() => {
    // Skip if unmounted
    if (!isMounted.current) return;
    
    console.log("Processing demographics useEffect triggered");
    console.log("Selected responses:", selectedResponses.length);
    
    // Only process if we have selected responses and survey data
    if (selectedResponses.length > 0 && surveyData && surveyData.length > 0) {
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
          
          // Filter survey data for rows containing selected responses
          const filteredData = surveyData.filter(row => {
            const response = row[`Q${selectedQuestionNumber}`];
            return selectedResponseValues.includes(response);
          });
          
          console.log(`Filtered data: ${filteredData.length} rows match selected responses`);
          
          // Gender breakdown
          const genderCounts = {};
          filteredData.forEach(row => {
            const gender = row.Gender || 'Not Specified';
            genderCounts[gender] = (genderCounts[gender] || 0) + 1;
          });
          
          const genderData = Object.entries(genderCounts).map(([name, value]) => ({
            name,
            value
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
            
            const age = row.Age || 'Not Specified';
            let ageGroup = 'Not Specified';
            
            // Create age groups
            if (age && !isNaN(age)) {
              // Handle both number and numeric string
              const ageNum = typeof age === 'string' ? parseInt(age, 10) : age;
              if (ageNum < 18) ageGroup = 'Under 18';
              else if (ageNum < 25) ageGroup = '18-24';
              else if (ageNum < 35) ageGroup = '25-34';
              else if (ageNum < 45) ageGroup = '35-44';
              else if (ageNum < 55) ageGroup = '45-54';
              else if (ageNum < 65) ageGroup = '55-64';
              else ageGroup = '65+';
            } else if (typeof age === 'string' && age.trim() !== '') {
              // If age is already provided as a group in string format
              ageGroup = age;
            }
            
            ageCounts[ageGroup] = (ageCounts[ageGroup] || 0) + 1;
          });
          
          const ageData = Object.entries(ageCounts).map(([name, value]) => ({
            name,
            value
          }));
          
          // Sort age groups in a logical order
          const ageOrder = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Not Specified'];
          ageData.sort((a, b) => {
            return ageOrder.indexOf(a.name) - ageOrder.indexOf(b.name);
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
  }, [selectedResponses, surveyData, selectedQuestionNumber]);

  // Analyze gender data by grouping and counting
  const analyzeGenderData = () => {
    if (!filteredData || filteredData.length === 0) return;
    
    const possibleGenderFields = ['gender', 'Gender', 'GENDER'];
    let genderField = null;
    
    // Find the first valid gender field
    for (const field of possibleGenderFields) {
      if (filteredData[0] && filteredData[0][field] !== undefined) {
        genderField = field;
        break;
      }
    }
    
    if (!genderField) {
      setGenderData([]);
      return;
    }
    
    const itemsWithGender = filteredData.filter(item => item[genderField] && item[genderField].trim() !== '');
    
    if (itemsWithGender.length === 0) {
      setGenderData([]);
      return;
    }
    
    const genderGroups = _.groupBy(itemsWithGender, genderField);
    const genderStats = Object.entries(genderGroups).map(([gender, items]) => ({
      name: gender,
      value: items.length,
      percentage: ((items.length / itemsWithGender.length) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value);
    
    setGenderData(genderStats);
  };

  // Analyze responses for the selected question
  const analyzeResponseData = () => {
    if (!selectedQuestionNumber || !filteredData || filteredData.length === 0) return;
    
    // Determine the question and response keys to use
    const questionKey = `question_${selectedQuestionNumber}`;
    const propKey = `proposition_${selectedQuestionNumber}`;
    
    // Get the question text first
    const question = extractCleanQuestionContent(filteredData, questionKey);
    setQuestionText(question);
    
    // Determine where the responses are stored
    const hasPropositionData = filteredData.some(item => item[propKey] && item[propKey].trim() !== '');
    const responseKey = hasPropositionData ? propKey : questionKey;
    
    // Get clean response values
    const cleanResponses = extractCleanResponses(filteredData, responseKey);
    setUniqueResponses(cleanResponses);
    
    // For each clean response, count occurrences in the data
    const responseCounts = {};
    cleanResponses.forEach(response => {
      responseCounts[response] = 0;
    });
    
    // Count occurrences
    filteredData.forEach(item => {
      if (!item[responseKey]) return;
      
      const itemResponse = item[responseKey].trim();
      
      // Direct match
      if (cleanResponses.includes(itemResponse)) {
        responseCounts[itemResponse] += 1;
        return;
      }
      
      // Check if this response contains any of the clean responses
      for (const cleanResponse of cleanResponses) {
        // Look for the clean response as a substring, but ensure it's a full word
        // by checking for word boundaries or common delimiters
        const delimiters = [';', '|', ',', '/', '\\', ' '];
        
        for (const delimiter of delimiters) {
          if (itemResponse.includes(`${delimiter}${cleanResponse}${delimiter}`) ||
              itemResponse.includes(`${delimiter}${cleanResponse}`) ||
              itemResponse.includes(`${cleanResponse}${delimiter}`) ||
              itemResponse === cleanResponse) {
            responseCounts[cleanResponse] += 1;
            break;
          }
        }
      }
    });
    
    // Create response data for chart
    const totalResponses = Object.values(responseCounts).reduce((a, b) => a + b, 0);
    const responseArray = Object.entries(responseCounts)
      .map(([response, count]) => ({
        response: response.length > 50 ? `${response.substring(0, 47)}...` : response,
        fullResponse: response,
        count,
        percentage: totalResponses > 0 ? (count / totalResponses * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.count - a.count);
    
    setResponseData(responseArray);
  };
  // Analyze response breakdowns by gender
  const analyzeResponseBreakdowns = () => {
    if (!selectedQuestionNumber || !filteredData || filteredData.length === 0 || !selectedResponses.length) return;
    
    const questionKey = `question_${selectedQuestionNumber}`;
    const propKey = `proposition_${selectedQuestionNumber}`;
    const hasPropositionData = filteredData.some(item => item[propKey] && item[propKey].trim() !== '');
    const responseKey = hasPropositionData ? propKey : questionKey;
    
    // Get gender field
    const genderField = filteredData[0]?.gender !== undefined ? 'gender' : 
                        filteredData[0]?.Gender !== undefined ? 'Gender' : null;
    
    if (!genderField) {
      setResponseByGender([]);
      return;
    }
    
    // Filter data based on selected responses
    const selectedResponseData = filteredData.filter(item => {
      if (!item[responseKey] || !item[genderField]) return false;
      
      const itemResponse = item[responseKey].trim();
      
      // Check if this item's response matches any of the selected responses
      return selectedResponses.some(selectedResponse => {
        // Direct match
        if (itemResponse === selectedResponse.fullResponse) return true;
        
        // Check for the response as part of a delimited list
        const delimiters = [';', '|', ',', '/', '\\', ' '];
        for (const delimiter of delimiters) {
          if (itemResponse.includes(`${delimiter}${selectedResponse.fullResponse}${delimiter}`) ||
              itemResponse.includes(`${delimiter}${selectedResponse.fullResponse}`) ||
              itemResponse.includes(`${selectedResponse.fullResponse}${delimiter}`)) {
            return true;
          }
        }
        
        return false;
      });
    });
    
    // Group by gender
    const genderGroups = _.groupBy(selectedResponseData, genderField);
    const genderBreakdown = Object.entries(genderGroups)
      .map(([gender, items]) => ({
        name: gender,
        value: items.length
      }))
      .sort((a, b) => b.value - a.value);
    
    setResponseByGender(genderBreakdown);
  };

  // Handle user changing the selected question
const handleQuestionChange = (e) => {
  const questionNum = e.target.value;
  console.log("Question selected:", questionNum);
  setSelectedQuestionNumber(questionNum);
  setSelectedResponses([]);
  
  if (questionNum) {
    // Find the question text
    const question = questions.find(q => q.number.toString() === questionNum);
    setQuestionText(question ? question.text : '');
    
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
  console.log("surveyData available:", surveyData ? surveyData.length : 0);
  
  if (!surveyData || surveyData.length === 0) {
    console.log("No survey data available");
    return;
  }
  
  // Log a sample row to understand data structure
  console.log("Sample survey data row:", surveyData[0]);
  
  // Check if the question exists in the data
  const questionExists = surveyData.some(row => row[`Q${questionNum}`] !== undefined);
  console.log(`Question Q${questionNum} exists in data:`, questionExists);
  
  // Filter responses for the selected question
  const responses = surveyData
    .filter(row => {
      const hasQuestion = row[`Q${questionNum}`] !== undefined && 
                         row[`Q${questionNum}`] !== null && 
                         row[`Q${questionNum}`] !== '';
      return hasQuestion;
    });
  
  console.log(`Found ${responses.length} responses for question ${questionNum}`);
  
  if (responses.length === 0) {
    console.log("No responses found for this question");
    setResponseData([]);
    return;
  }
  
  // Count occurrences of each response
  const responseCounts = {};
  responses.forEach(row => {
    const response = row[`Q${questionNum}`];
    responseCounts[response] = (responseCounts[response] || 0) + 1;
  });
  
  console.log("Response counts:", responseCounts);
  
  // Convert to array for display
  const responseArray = Object.entries(responseCounts).map(([fullResponse, count]) => {
    const percentage = ((count / responses.length) * 100).toFixed(1);
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



  return (
    <div className="demographics-tab p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Demographics Insights</h2>
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
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label htmlFor="question-select" className="block text-sm font-medium text-gray-700 mb-2">Select Question:</label>
          <select 
            id="question-select" 
            value={selectedQuestionNumber} 
            onChange={handleQuestionChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
          >
            <option value="">Select a question</option>
            {availableQuestions.map(num => (
              <option key={num} value={num}>Question {num}</option>
            ))}
          </select>
          
          {questionText && (
            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
              <p className="text-sm text-gray-700"><span className="font-medium">Question text:</span> {questionText}</p>
            </div>
          )}
        </div>
      )}

      {/* Response Analysis */}
      {selectedQuestionNumber && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium mb-4">Response Analysis for Question {selectedQuestionNumber}</h3>
          <p className="mb-2 text-sm text-gray-600">Select one or more responses to see demographic breakdowns</p>
          
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
                            ? 'bg-pink-50 border-pink-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-sm font-medium text-gray-900">{item.fullResponse}</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-900">{item.count}</span>
                            <span className="text-sm font-medium text-gray-500">{item.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Response Breakdowns */}
              {selectedResponses.length > 0 && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium mb-4 text-pink-600">
                    {selectedResponses.length === 1 
                      ? `Breakdown for "${selectedResponses[0].fullResponse}"` 
                      : `Breakdown for ${selectedResponses.length} selected responses`}
                  </h4>
                  
                  {/* Gender Breakdown */}
                  {responseByGender.length > 0 && (
                    <div className="mt-6">
                      <h5 className="text-md font-medium mb-3">Gender Breakdown</h5>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {responseByGender.map((item, index) => {
                                const total = responseByGender.reduce((sum, i) => sum + i.value, 0);
                                const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
                                
                                return (
                                  <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      <div className="flex items-center">
                                        <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        {item.name}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.value}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{percentage}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Age Breakdown - with forced rendering */}
                  <div className="mt-6">
                    <h5 className="text-md font-medium mb-3">Age Breakdown</h5>
                    {responseByAge.length > 0 ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Group</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {responseByAge.map((item, index) => {
                                const total = responseByAge.reduce((sum, i) => sum + i.value, 0);
                                const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
                                
                                return (
                                  <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      <div className="flex items-center">
                                        <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: COLORS[(index + 4) % COLORS.length] }}></div>
                                        {item.name}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.value}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{percentage}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-center h-20">
                        <p className="text-gray-500">
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
            <div className="flex items-center justify-center h-60 bg-gray-50 rounded">
              <p className="text-gray-500">No response data available for this question</p>
            </div>
          )}
        </div>
      )}
      
      {/* Explanation text at the bottom */}
      {selectedResponses.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg shadow mt-4 border border-blue-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">How to interpret this data</h3>
              <div className="mt-2 text-sm text-blue-700">
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
  )};

export default DemographicsTab;