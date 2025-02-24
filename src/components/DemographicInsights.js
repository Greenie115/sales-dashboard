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

const DemographicInsights = ({ data }) => {
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState('08');
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [responseData, setResponseData] = useState([]);
  const [ageDistribution, setAgeDistribution] = useState([]);
  const [uniqueResponses, setUniqueResponses] = useState([]);
  
  // Try to find repurchase-related questions
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
    analyzeQuestionData();
  }, [selectedQuestionNumber, data]);
  
  useEffect(() => {
    if (selectedResponse) {
      generateAgeDistribution();
    }
  }, [selectedResponse, responseData]);
  
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
    
    // Set default selected response if not set or if previous one is no longer valid
    if (!selectedResponse || !responses.includes(selectedResponse)) {
      setSelectedResponse(responses.length > 0 ? responses[0] : null);
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
  
  // Generate age distribution for selected response
  const generateAgeDistribution = () => {
    if (!selectedResponse || !data.length) return [];
    
    const propositionKey = `proposition_${selectedQuestionNumber}`;
    
    // Filter to only the selected response
    const filteredData = data.filter(item => 
      item[propositionKey] === selectedResponse &&
      item.age_group
    );
    
    // Group by age
    const groupedByAge = _.groupBy(filteredData, 'age_group');
    
    // Get count and percentage for each age group
    const distribution = Object.entries(groupedByAge).map(([ageGroup, items]) => {
      return {
        ageGroup,
        count: items.length,
        // Add sort order for proper age group sequencing
        sortOrder: AGE_GROUP_ORDER.indexOf(ageGroup) !== -1 
          ? AGE_GROUP_ORDER.indexOf(ageGroup) 
          : 999
      };
    });
    
    // Sort by the defined age group order
    setAgeDistribution(_.sortBy(distribution, 'sortOrder'));
  };
  
  // Generate colors for responses/age groups
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

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
  
  return (
    <div className="p-6 bg-gray-50">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Demographic Insights</h2>
        
        {/* Question Selector */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Question</label>
          <select
            value={selectedQuestionNumber}
            onChange={(e) => {
              setSelectedQuestionNumber(e.target.value);
              setSelectedResponse(null); // Reset response when question changes
            }}
            className="block w-full p-2 border rounded mb-2"
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
              <div className="p-4 bg-white rounded-lg shadow h-full">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Responses</h3>
                <ul className="divide-y divide-gray-200">
                  {responseData.map((item, index) => (
                    <li 
                      key={item.response}
                      className={`py-3 px-2 cursor-pointer hover:bg-gray-50 rounded ${
                        selectedResponse === item.response ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedResponse(item.response)}
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
              {selectedResponse ? (
                <div className="p-4 bg-white rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    Age Distribution: "{selectedResponse}"
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
                            <Bar dataKey="count" name="Count">
                              {ageDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Group</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {ageDistribution.map((row, idx) => {
                              const totalForResponse = _.sumBy(ageDistribution, 'count');
                              const percentage = (row.count / totalForResponse) * 100;
                              
                              return (
                                <tr 
                                  key={row.ageGroup} 
                                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors hover:bg-blue-50 cursor-pointer`}
                                  style={{ borderLeft: `4px solid ${COLORS[idx % COLORS.length]}` }}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.ageGroup}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.count}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${Math.round(percentage)}%`}</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-blue-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{_.sumBy(ageDistribution, 'count')}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">100%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-600">No age data available for this response.</p>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-white rounded-lg shadow flex items-center justify-center h-full">
                  <p className="text-gray-600">Select a response to see age distribution</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-white rounded-lg shadow text-center text-gray-600">
            No responses found for the selected question.
          </div>
        )}
      </div>
    </div>
  );
};

export default DemographicInsights;