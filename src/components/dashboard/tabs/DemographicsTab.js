import React, { useState, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

const DemographicsTab = () => {
  const { getFilteredData } = useData();
  
  // Local state
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState('');
  const [responseData, setResponseData] = useState([]);
  const [ageDistribution, setAgeDistribution] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [uniqueResponses, setUniqueResponses] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [questionText, setQuestionText] = useState('');
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [responseByAge, setResponseByAge] = useState([]);
  const [responseByGender, setResponseByGender] = useState([]);

  // Get filtered data
  const filteredData = getFilteredData ? getFilteredData() : [];

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
  };

  // Analyze available questions when data loads
  useEffect(() => {
    if (filteredData && filteredData.length > 0) {
      // Get available questions
      const questions = [];
      const firstItem = filteredData[0];
      
      if (firstItem) {
        // Get all keys that might contain questions
        const questionKeys = Object.keys(firstItem).filter(key => 
          key.startsWith('question_') || 
          key.startsWith('proposition_')
        );
        
        // Group keys by question number
        const questionGroups = {};
        questionKeys.forEach(key => {
          const parts = key.split('_');
          if (parts.length >= 2) {
            const num = parts[1];
            if (!questionGroups[num]) {
              questionGroups[num] = [];
            }
            questionGroups[num].push(key);
          }
        });
        
        // Create list of valid question numbers
        Object.entries(questionGroups).forEach(([num, keys]) => {
          // Check if at least one item has data for this question
          const hasData = filteredData.some(item => 
            keys.some(key => item[key] && item[key].trim() !== '')
          );
          
          if (hasData) {
            questions.push(num);
          }
        });
        
        setAvailableQuestions(questions.sort((a, b) => parseInt(a) - parseInt(b)));
        
        // Set default selected question
        if (questions.length > 0 && !selectedQuestionNumber) {
          setSelectedQuestionNumber(questions[0]);
        }
      }
      
      // Analyze gender and age data
      analyzeGenderData();
      analyzeAgeDistribution();
    }
  }, [filteredData, selectedQuestionNumber]);

  // Recalculate response analysis whenever the selected question changes
  useEffect(() => {
    if (selectedQuestionNumber && filteredData && filteredData.length > 0) {
      analyzeResponseData();
      setSelectedResponse(null); // Reset selected response when question changes
    }
  }, [selectedQuestionNumber, filteredData]);

  // Analyze response breakdowns when a response is selected
  useEffect(() => {
    if (selectedResponse && selectedQuestionNumber && filteredData && filteredData.length > 0) {
      analyzeResponseBreakdowns(selectedResponse);
    }
  }, [selectedResponse, selectedQuestionNumber, filteredData]);

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

  // Analyze age distribution
  const analyzeAgeDistribution = () => {
    if (!filteredData || filteredData.length === 0) return;
    
    // Check possible age field names
    const possibleAgeFields = ['age_group', 'ageGroup', 'age', 'Age', 'AGE'];
    let ageField = null;
    
    // Find the first valid age field
    for (const field of possibleAgeFields) {
      if (filteredData[0] && filteredData[0][field] !== undefined) {
        ageField = field;
        break;
      }
    }
    
    if (!ageField) {
      setAgeDistribution([]);
      return;
    }
    
    const itemsWithAge = filteredData.filter(item => item[ageField] && item[ageField].toString().trim() !== '');
    
    if (itemsWithAge.length === 0) {
      setAgeDistribution([]);
      return;
    }
    
    const ageGroups = _.groupBy(itemsWithAge, ageField);
    
    // Get all unique age groups from data
    const uniqueAgeGroups = Object.keys(ageGroups);
    
    // Create age stats using both predefined order and any additional groups found in data
    const allAgeGroups = [...new Set([...AGE_GROUP_ORDER, ...uniqueAgeGroups])];
    
    const ageStats = allAgeGroups
      .map(group => ({
        ageGroup: group,
        count: ageGroups[group] ? ageGroups[group].length : 0
      }))
      .filter(item => item.count > 0) // Filter out groups with no data
      .sort((a, b) => {
        // Sort by the predefined order, or alphabetically for custom groups
        const indexA = AGE_GROUP_ORDER.indexOf(a.ageGroup);
        const indexB = AGE_GROUP_ORDER.indexOf(b.ageGroup);
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.ageGroup.localeCompare(b.ageGroup);
      });
    
    setAgeDistribution(ageStats);
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

  // Analyze response breakdowns by age and gender
  const analyzeResponseBreakdowns = (selectedResponseObj) => {
    if (!selectedQuestionNumber || !filteredData || filteredData.length === 0 || !selectedResponseObj) return;
    
    const questionKey = `question_${selectedQuestionNumber}`;
    const propKey = `proposition_${selectedQuestionNumber}`;
    const hasPropositionData = filteredData.some(item => item[propKey] && item[propKey].trim() !== '');
    const responseKey = hasPropositionData ? propKey : questionKey;
    
    // Get age field
    const ageField = filteredData[0]?.age_group !== undefined ? 'age_group' : 
                     filteredData[0]?.ageGroup !== undefined ? 'ageGroup' : null;
    
    // Get gender field
    const genderField = filteredData[0]?.gender !== undefined ? 'gender' : 
                        filteredData[0]?.Gender !== undefined ? 'Gender' : null;
    
    // Filter data for the selected response
    const selectedResponseData = filteredData.filter(item => {
      if (!item[responseKey]) return false;
      
      const itemResponse = item[responseKey].trim();
      
      // Direct match
      if (itemResponse === selectedResponseObj.fullResponse) return true;
      
      // Check for the response as part of a delimited list
      const delimiters = [';', '|', ',', '/', '\\', ' '];
      for (const delimiter of delimiters) {
        if (itemResponse.includes(`${delimiter}${selectedResponseObj.fullResponse}${delimiter}`) ||
            itemResponse.includes(`${delimiter}${selectedResponseObj.fullResponse}`) ||
            itemResponse.includes(`${selectedResponseObj.fullResponse}${delimiter}`)) {
          return true;
        }
      }
      
      return false;
    });
    
    // Age breakdown
    if (ageField) {
      const ageGroups = _.groupBy(
        selectedResponseData.filter(item => item[ageField]), 
        ageField
      );
      
      // Get all unique age groups
      const uniqueAgeGroups = [...new Set([...AGE_GROUP_ORDER, ...Object.keys(ageGroups)])];
      
      // Create age breakdown data
      const ageBreakdown = uniqueAgeGroups
        .map(group => ({
          name: group,
          value: ageGroups[group] ? ageGroups[group].length : 0
        }))
        .filter(item => item.value > 0) // Filter out groups with no data
        .sort((a, b) => {
          // Sort by the predefined order, or alphabetically for custom groups
          const indexA = AGE_GROUP_ORDER.indexOf(a.name);
          const indexB = AGE_GROUP_ORDER.indexOf(b.name);
          
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
      
      setResponseByAge(ageBreakdown);
    } else {
      setResponseByAge([]);
    }
    
    // Gender breakdown
    if (genderField) {
      const genderGroups = _.groupBy(
        selectedResponseData.filter(item => item[genderField]), 
        genderField
      );
      
      // Create gender breakdown data
      const genderBreakdown = Object.entries(genderGroups)
        .map(([gender, items]) => ({
          name: gender,
          value: items.length
        }))
        .sort((a, b) => b.value - a.value);
      
      setResponseByGender(genderBreakdown);
    } else {
      setResponseByGender([]);
    }
  };

  // Handle user changing the selected question
  const handleQuestionChange = (e) => {
    setSelectedQuestionNumber(e.target.value);
    setSelectedResponse(null);
  };

  // Handle user selecting a response
  const handleResponseClick = (response) => {
    setSelectedResponse(response === selectedResponse ? null : response);
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0 || !selectedQuestionNumber) return;
    
    try {
      // Create CSV content
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Add question info
      csvContent += `"Question ${selectedQuestionNumber}: ${questionText.replace(/"/g, '""')}"\n\n`;
      
      // Add response data
      csvContent += 'Response,Count,Percentage\n';
      responseData.forEach(item => {
        csvContent += `"${item.fullResponse.replace(/"/g, '""')}",${item.count},${item.percentage}%\n`;
      });
      
      // Add age distribution
      if (ageDistribution.length > 0) {
        csvContent += '\nAge Distribution\n';
        csvContent += 'Age Group,Count\n';
        ageDistribution.forEach(item => {
          csvContent += `${item.ageGroup},${item.count}\n`;
        });
      }
      
      // Add gender distribution
      if (genderData.length > 0) {
        csvContent += '\nGender Distribution\n';
        csvContent += 'Gender,Count,Percentage\n';
        genderData.forEach(item => {
          csvContent += `${item.name},${item.value},${item.percentage}%\n`;
        });
      }
      
      // Add selected response breakdowns
      if (selectedResponse) {
        csvContent += `\nBreakdown for Response: "${selectedResponse.fullResponse.replace(/"/g, '""')}"\n`;
        
        if (responseByAge.length > 0) {
          csvContent += '\nAge Breakdown\n';
          csvContent += 'Age Group,Count\n';
          responseByAge.forEach(item => {
            csvContent += `${item.name},${item.value}\n`;
          });
        }
        
        if (responseByGender.length > 0) {
          csvContent += '\nGender Breakdown\n';
          csvContent += 'Gender,Count\n';
          responseByGender.forEach(item => {
            csvContent += `${item.name},${item.value}\n`;
          });
        }
      }
      
      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `demographics_question${selectedQuestionNumber}_${timestamp}.csv`;
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting data. See console for details.");
    }
  };

  // If no data, show loading/empty state
  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No demographic data</h3>
          <p className="mt-1 text-sm text-gray-500">Please load data with demographic information.</p>
        </div>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Gender Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Gender Distribution</h3>
          {genderData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} users`, `Count`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-60 bg-gray-50 rounded">
              <p className="text-gray-500">No gender data available</p>
            </div>
          )}
        </div>

        {/* Age Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Age Distribution</h3>
          {ageDistribution.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ageDistribution}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="ageGroup" type="category" />
                  <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                  <Legend />
                  <Bar dataKey="count" name="Users" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-60 bg-gray-50 rounded">
              <p className="text-gray-500">No age distribution data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Response Analysis */}
      {selectedQuestionNumber && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium mb-4">Response Analysis for Question {selectedQuestionNumber}</h3>
          <p className="mb-2 text-sm text-gray-600">Click on a response to see its breakdown by age and gender</p>
          
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
                          selectedResponse && selectedResponse.fullResponse === item.fullResponse
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
              {selectedResponse && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium mb-4 text-pink-600">
                    Breakdown for "{selectedResponse.fullResponse}"
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Age Breakdown */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="text-md font-medium mb-3">Age Breakdown</h5>
                      {responseByAge.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={responseByAge}
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" />
                              <Tooltip formatter={(value) => [`${value} responses`, 'Count']} />
                              <Bar dataKey="value" name="Count" fill="#FF0066" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-40 bg-white rounded">
                          <p className="text-gray-500">No age breakdown available</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Gender Breakdown */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="text-md font-medium mb-3">Gender Breakdown</h5>
                      {responseByGender.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={responseByGender}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name}`}
                              >
                                {responseByGender.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} responses`, 'Count']} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-40 bg-white rounded">
                        <p className="text-gray-500">No gender breakdown available</p>
                      </div>
                    )}
                  </div>
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
  </div>
);
};

export default DemographicsTab;