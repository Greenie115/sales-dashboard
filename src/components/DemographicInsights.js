import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

// Generate colors for responses/age groups - Shopmium branded colors with better contrast
const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800'];

const DemographicInsights = ({ data }) => {
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState('08');
  const [selectedResponses, setSelectedResponses] = useState([]);
  const [responseData, setResponseData] = useState([]);
  const [ageDistribution, setAgeDistribution] = useState([]);
  const [uniqueResponses, setUniqueResponses] = useState([]);
  
  // Find repurchase-related questions
  const findRepurchaseQuestion = () => {
    const repurchaseKeywords = ['purchase again', 'buy again', 'repurchase', 'reorder'];
    
    const questions = getAvailableQuestionNumbers();
    
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
  
  useEffect(() => {
    if (data && data.length > 0) {
      const repurchaseQuestion = findRepurchaseQuestion();
      if (repurchaseQuestion) {
        setSelectedQuestionNumber(repurchaseQuestion);
      }
    }
  }, [data]);
  
  useEffect(() => {
    if (selectedQuestionNumber) {
      analyzeQuestionData();
    }
  }, [selectedQuestionNumber, data]);
  
  useEffect(() => {
    if (selectedResponses.length > 0) {
      generateAgeDistribution();
    } else {
      // Clear the age distribution if no responses selected
      setAgeDistribution([]);
    }
  }, [selectedResponses]);
  
  // Get all question numbers that have corresponding propositions
  const getAvailableQuestionNumbers = () => {
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
  
  // Get the actual question text for the current question number
  const getCurrentQuestionText = () => {
    const questionKey = `question_${selectedQuestionNumber}`;
    const questionFromData = data.find(item => item[questionKey] && item[questionKey].trim() !== '');
    
    if (questionFromData) {
      return questionFromData[questionKey];
    }
    
    // Fall back to a generic label
    return `Question ${selectedQuestionNumber}`;
  };
  
  // Handle response selection
  const handleResponseSelection = (response) => {
    if (selectedResponses.includes(response)) {
      // Remove if already selected
      setSelectedResponses(selectedResponses.filter(r => r !== response));
    } else {
      // Add if not selected
      setSelectedResponses([...selectedResponses, response]);
    }
  };
  
  // Analyze the selected question data
  const analyzeQuestionData = () => {
    // Exit if no data or question
    if (!data.length || !selectedQuestionNumber) return;
    
    const questionKey = `question_${selectedQuestionNumber}`;
    const propositionKey = `proposition_${selectedQuestionNumber}`;
    
    // Filter out rows with empty responses
    const filteredData = data.filter(item => 
      item[questionKey] && item[questionKey].trim() !== '' &&
      item[propositionKey] && item[propositionKey].trim() !== '' &&
      item.age_group
    );
    
    // Get unique responses
    const responses = _.uniq(filteredData.map(item => item[propositionKey])).filter(Boolean);
    setUniqueResponses(responses);
    
    // Reset selected responses when changing questions
    if (selectedQuestionNumber) {
      setSelectedResponses([]);
    }
    
    // Calculate response stats by age group
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
  const generateAgeDistribution = () => {
    if (!selectedResponses.length || !data.length) return;
    
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
          }
          ageGroupData[responseValue]++;
        }
      });
    });
    
    // Sort by the defined age group order
    setAgeDistribution(_.sortBy(ageDistributionData, 'sortOrder'));
  };
  
  return (
    <div className="p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Demographic Insights</h2>
        
        {/* Question Selector */}
        <div className="mb-6 p-4 bg-white rounded-xl shadow-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Question</label>
          <select
            value={selectedQuestionNumber}
            onChange={(e) => {
              setSelectedQuestionNumber(e.target.value);
              setSelectedResponses([]); // Reset responses when question changes
            }}
            className="block w-full p-2 border rounded mb-2 focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none"
          >
            {getAvailableQuestionNumbers().map(number => {
              const questionKey = `question_${number}`;
              const questionText = data.find(item => item[questionKey])
                ? data.find(item => item[questionKey])[questionKey]
                : `Question ${number}`;
              
              return (
                <option key={number} value={number}>
                  {`Question ${number}: ${questionText.length > 50 ? questionText.substring(0, 50) + '...' : questionText}`}
                </option>
              );
            })}
          </select>
          
          <p className="text-sm text-gray-600 mb-2">
            {getCurrentQuestionText()}
          </p>
        </div>
        
        {/* Response Analysis */}
        {responseData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Response List */}
            <div className="lg:col-span-1">
              <div className="p-4 bg-white rounded-xl shadow-md h-full">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Responses</h3>
                <ul className="divide-y divide-gray-200">
                  {responseData.map((item, index) => (
                    <li 
                      key={item.response}
                      className={`py-3 px-2 cursor-pointer hover:bg-pink-50 rounded-lg transition-colors ${
                        selectedResponses.includes(item.response) ? 'bg-pink-50' : ''
                      }`}
                      onClick={() => handleResponseSelection(item.response)}
                      style={{ 
                        borderLeft: selectedResponses.includes(item.response) 
                          ? '4px solid #FF0066' 
                          : '4px solid transparent'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="font-medium">{item.response}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.total} ({Math.round(item.percentage)}%)
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Age Distribution */}
            <div className="lg:col-span-2">
              {selectedResponses.length > 0 ? (
                <div className="p-4 bg-white rounded-xl shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    Age Distribution: {selectedResponses.map(resp => `"${resp}"`).join(', ')}
                  </h3>
                  
                  {ageDistribution.length > 0 ? (
                    <>
                      <div className="h-64 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={ageDistribution}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="ageGroup" />
                            <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value) => [value, 'Count']} />
                            <Legend />
                            {selectedResponses.length > 0 && selectedResponses.map((response, index) => (
                              <Bar 
                                key={response} 
                                dataKey={response} 
                                name={response} 
                                stackId="a"
                                fill={COLORS[index % COLORS.length]} 
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-pink-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Age Group</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Total Count</th>
                              {selectedResponses.map(response => (
                                <th key={response} className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                  {response}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {ageDistribution.map((row, idx) => {
                              return (
                                <tr 
                                  key={row.ageGroup} 
                                  className="transition-colors hover:bg-pink-50 cursor-pointer"
                                  style={{ borderLeft: `4px solid ${COLORS[idx % COLORS.length]}` }}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.ageGroup}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.count}</td>
                                  {selectedResponses.map((response, responseIdx) => (
                                    <td key={response} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {row[response] || 0}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-600">No age data available for the selected responses.</p>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl shadow-md flex items-center justify-center h-full">
                  <p className="text-gray-600">Select one or more responses to see age distribution</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-white rounded-xl shadow-md text-center text-gray-600">
            No responses found for the selected question.
          </div>
        )}
      </div>
    </div>
  );
};

export default DemographicInsights;