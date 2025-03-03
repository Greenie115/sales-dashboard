import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import _ from 'lodash';
import ExportButton from '../export/ExportButton';

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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-gray-600">
            <span className="inline-block w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DemographicsTab = () => {
  const { getFilteredData } = useData();
  
  // Local state
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState('');
  const [responseData, setResponseData] = useState([]);
  const [ageDistribution, setAgeDistribution] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [uniqueResponses, setUniqueResponses] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('age'); // 'age', 'gender', 'response'
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [chartView, setChartView] = useState('pie'); // 'pie' or 'bar'

  // Get filtered data
  const filteredData = useMemo(() => {
    return getFilteredData ? getFilteredData() : [];
  }, [getFilteredData]);
  
  // Run initial analysis when data is loaded
  useEffect(() => {
    if (filteredData && filteredData.length > 0) {
      analyzeGenderData();
      analyzeAgeDistribution();
      
      // Get available questions using both question and proposition keys
      const questions = [];
      const firstItem = filteredData[0];
      
      if (firstItem) {
        // Extract from both question and proposition keys
        Object.keys(firstItem).forEach(key => {
          if (key.startsWith('proposition_')) {
            const questionNum = key.replace('proposition_', '');
            if (!questions.includes(questionNum)) {
              questions.push(questionNum);
            }
          }
        });
        
        setAvailableQuestions(questions);
        
        // Set default selected question
        if (questions.length > 0 && !selectedQuestionNumber) {
          setSelectedQuestionNumber(questions[0]);
        }
      }
    }
  }, [filteredData, selectedQuestionNumber]);

  // Recalculate response analysis whenever the selected question changes
  useEffect(() => {
    if (selectedQuestionNumber && filteredData && filteredData.length > 0) {
      analyzeResponseData();
    }
  }, [selectedQuestionNumber, filteredData]);

  // Analyze gender data by grouping and counting, then computing percentages
  const analyzeGenderData = () => {
    if (!filteredData || filteredData.length === 0) return;
    
    const itemsWithGender = filteredData.filter(item => item.gender && item.gender.trim() !== '');
    
    if (itemsWithGender.length === 0) {
      setGenderData([]);
      return;
    }
    
    const genderGroups = _.groupBy(itemsWithGender, 'gender');
    const genderStats = Object.entries(genderGroups).map(([gender, items]) => ({
      name: gender,
      value: items.length,
      percentage: ((items.length / itemsWithGender.length) * 100).toFixed(1)
    }));
    
    setGenderData(genderStats);
  };

  // Analyze age distribution 
  const analyzeAgeDistribution = () => {
    if (!filteredData || filteredData.length === 0) return;
    
    // Use age_group field if it exists, otherwise use ageGroup
    const ageField = filteredData[0]?.age_group !== undefined ? 'age_group' : 'ageGroup';
    const itemsWithAge = filteredData.filter(item => item[ageField] && item[ageField].trim() !== '');
    
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
      .filter(item => item.count > 0); // Filter out groups with no data
    
    setAgeDistribution(ageStats);
  };

  // Analyze responses for the selected question by counting unique answers
  const analyzeResponseData = () => {
    if (!selectedQuestionNumber || !filteredData || filteredData.length === 0) return;
    
    // Always use proposition key for the selected question number
    const responseKey = `proposition_${selectedQuestionNumber}`;
    
    // Check if any data exists with this proposition key
    if (!filteredData.some(item => item[responseKey] !== undefined)) {
      setResponseData([]);
      setUniqueResponses([]);
      return;
    }
    
    const responses = filteredData
      .map(item => item[responseKey])
      .filter(response => response && response.trim() !== '');
    
    const responseCount = _.countBy(responses);
    const responseArray = Object.entries(responseCount).map(([response, count]) => ({
      response,
      count,
      percentage: (count / responses.length * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);
    
    setUniqueResponses(Object.keys(responseCount));
    setResponseData(responseArray);
  };
  
  // Toggle chart view between pie and bar
  const toggleChartView = useCallback(() => {
    setChartView(prev => prev === 'pie' ? 'bar' : 'pie');
  }, []);
  
  // Handle filter selection
  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
  };
  
  // Handle gender selection for detailed view
  const handleGenderClick = (gender) => {
    setSelectedGender(prevGender => 
      prevGender && prevGender.name === gender.name ? null : gender
    );
  };
  
  // Handle age group selection for detailed view
  const handleAgeGroupClick = (ageGroup) => {
    setSelectedAgeGroup(prevAgeGroup =>
      prevAgeGroup && prevAgeGroup.ageGroup === ageGroup.ageGroup ? null : ageGroup
    );
  };
  
  // Handle response selection for detailed view
  const handleResponseClick = (response) => {
    setSelectedResponse(prevResponse =>
      prevResponse && prevResponse.response === response.response ? null : response
    );
  };

  // Handle user changing the selected question
  const handleQuestionChange = (e) => {
    setSelectedQuestionNumber(e.target.value);
    setSelectedResponse(null);
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
  
  // Get export data
  const exportData = {
    genderData,
    ageDistribution,
    responseData
  };

  return (
    <div className="demographics-tab p-4">
      {/* Actions Bar with Export Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Demographics Analysis</h2>
        <ExportButton activeTab="demographics" tabData={exportData} />
      </div>
      
      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => handleFilterChange('age')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              selectedFilter === 'age'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Age Distribution
          </button>
          <button
            onClick={() => handleFilterChange('gender')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              selectedFilter === 'gender'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Gender Distribution
          </button>
          <button
            onClick={() => handleFilterChange('response')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              selectedFilter === 'response'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Response Analysis
          </button>
        </nav>
      </div>
      
      {/* Question Selector (only show when response tab is active) */}
      {selectedFilter === 'response' && availableQuestions.length > 0 && (
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
        </div>
      )}
      
      {/* Chart Toggle Button */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={toggleChartView}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          {chartView === 'pie' ? (
            <>
              <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" />
                <path d="M8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4z" />
                <path d="M14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              Bar Chart
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.5A1.5 1.5 0 017.5 7h-1A1.5 1.5 0 015 5.5V5a1 1 0 00-2 0v.5A3.5 3.5 0 006.5 9h1a3.5 3.5 0 003.5-3.5V5a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Pie Chart
            </>
          )}
        </button>
      </div>
      
      {/* Content based on selected filter */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {/* Age Distribution */}
        {selectedFilter === 'age' && (
          <div>
            <h3 className="text-lg font-medium mb-4 text-pink-600">Age Distribution</h3>
            {ageDistribution.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartView === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={ageDistribution}
                          dataKey="count"
                          nameKey="ageGroup"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          onClick={(data) => handleAgeGroupClick(data)}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {ageDistribution.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              style={{ 
                                opacity: selectedAgeGroup && selectedAgeGroup.ageGroup !== entry.ageGroup ? 0.7 : 1,
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          formatter={(value) => `${value}`}
                          onClick={(data) => handleAgeGroupClick(ageDistribution.find(item => item.ageGroup === data.value))}
                        />
                      </PieChart>
                    ) : (
                      <BarChart
                        data={ageDistribution}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis 
                          dataKey="ageGroup" 
                          type="category" 
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                        <Legend />
                        <Bar 
                          dataKey="count" 
                          name="Users"
                          onClick={(data) => handleAgeGroupClick(data)}
                          style={{ cursor: 'pointer' }}
                        >
                          {ageDistribution.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              style={{ 
                                opacity: selectedAgeGroup && selectedAgeGroup.ageGroup !== entry.ageGroup ? 0.7 : 1
                              }}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <div className="overflow-auto max-h-80">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Group</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ageDistribution.map((item, index) => {
                          const total = ageDistribution.reduce((sum, i) => sum + i.count, 0);
                          const percentage = ((item.count / total) * 100).toFixed(1);
                          
                          return (
                            <tr 
                              key={index} 
                              className={`hover:bg-gray-50 cursor-pointer ${
                                selectedAgeGroup && selectedAgeGroup.ageGroup === item.ageGroup ? 'bg-pink-50' : ''
                              }`}
                              onClick={() => handleAgeGroupClick(item)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                  <div className="text-sm font-medium text-gray-900">{item.ageGroup}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Selected Age Group Detail */}
                  {selectedAgeGroup && (
                    <div className="mt-4 p-4 bg-pink-50 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-medium text-pink-800">Age Group: {selectedAgeGroup.ageGroup}</h4>
                        <button 
                          onClick={() => setSelectedAgeGroup(null)}
                          className="text-pink-500 hover:text-pink-700"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Users</span>
                          <p className="text-lg font-semibold text-gray-900">{selectedAgeGroup.count}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Percentage</span>
                          <p className="text-lg font-semibold text-gray-900">
                            {((selectedAgeGroup.count / ageDistribution.reduce((sum, i) => sum + i.count, 0)) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-60 bg-gray-50 rounded">
                <p className="text-gray-500">No age distribution data available</p>
              </div>
            )}
          </div>
        )}
        
        {/* Gender Distribution */}
        {selectedFilter === 'gender' && (
          <div>
            <h3 className="text-lg font-medium mb-4 text-blue-600">Gender Distribution</h3>
            {genderData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartView === 'pie' ? (
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
                          onClick={(data) => handleGenderClick(data)}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {genderData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              style={{ 
                                opacity: selectedGender && selectedGender.name !== entry.name ? 0.7 : 1,
                                cursor: 'pointer' 
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} users`, `Count`]} />
                        <Legend 
                          formatter={(value) => `${value}`}
                          onClick={(data) => handleGenderClick(genderData.find(item => item.name === data.value))}
                        />
                      </PieChart>
                    ) : (
                      <BarChart
                        data={genderData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                        <Legend />
                        <Bar 
                          dataKey="value" 
                          name="Users"
                          onClick={(data) => handleGenderClick(data)}
                          style={{ cursor: 'pointer' }}
                        >
                          {genderData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]}
                              style={{ 
                                opacity: selectedGender && selectedGender.name !== entry.name ? 0.7 : 1 
                              }}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <div className="overflow-auto max-h-80">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {genderData.map((item, index) => (
                          <tr 
                            key={index} 
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedGender && selectedGender.name === item.name ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleGenderClick(item)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.value}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Selected Gender Detail */}
                  {selectedGender && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-medium text-blue-800">Gender: {selectedGender.name}</h4>
                        <button 
                          onClick={() => setSelectedGender(null)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Users</span>
                          <p className="text-lg font-semibold text-gray-900">{selectedGender.value}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Percentage</span>
                          <p className="text-lg font-semibold text-gray-900">{selectedGender.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-60 bg-gray-50 rounded">
                <p className="text-gray-500">No gender data available</p>
              </div>
            )}
          </div>
        )}
        
        {/* Response Analysis */}
        {selectedFilter === 'response' && selectedQuestionNumber && (
          <div>
            <h3 className="text-lg font-medium mb-4 text-purple-600">Response Analysis for Question {selectedQuestionNumber}</h3>
            {responseData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartView === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={responseData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="response"
                          onClick={(data) => handleResponseClick(data)}
                          label={({ name, percent }) => 
                            name.length > 15 ? `${name.substring(0, 15)}...: ${(percent * 100).toFixed(0)}%` : `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {responseData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              style={{ 
                                opacity: selectedResponse && selectedResponse.response !== entry.response ? 0.7 : 1,
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} responses`, 'Count']} />
                        <Legend 
                          formatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                          onClick={(data) => handleResponseClick(responseData.find(item => item.response === data.value))}
                        />
                      </PieChart>
                    ) : (
                      <BarChart
                        data={responseData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis 
                          dataKey="response" 
                          type="category" 
                          width={150}
                          tick={{
                            angle: 0,
                            textAnchor: 'end',
                            width: 100,
                            fontSize: 12
                          }}
                        />
                        <Tooltip formatter={(value) => [`${value} responses`, 'Count']} />
                        <Legend />
                        <Bar 
                          dataKey="count" 
                          name="Responses" 
                          fill="#9C27B0"
                          onClick={(data) => handleResponseClick(data)}
                          style={{ cursor: 'pointer' }}
                        >
                          {responseData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]}
                              style={{ 
                                opacity: selectedResponse && selectedResponse.response !== entry.response ? 0.7 : 1 
                              }}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <div className="overflow-auto max-h-80">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {responseData.map((item, index) => (
                          <tr 
                            key={index} 
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedResponse && selectedResponse.response === item.response ? 'bg-purple-50' : ''
                            }`}
                            onClick={() => handleResponseClick(item)}
                          >
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{item.response}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Selected Response Detail */}
                  {selectedResponse && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-medium text-purple-800">Selected Response</h4>
                        <button 
                          onClick={() => setSelectedResponse(null)}
                          className="text-purple-500 hover:text-purple-700"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="mb-2 p-2 bg-white rounded border border-purple-100">
                        <p className="text-sm text-gray-900">{selectedResponse.response}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Count</span>
                          <p className="text-lg font-semibold text-gray-900">{selectedResponse.count}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Percentage</span>
                          <p className="text-lg font-semibold text-gray-900">{selectedResponse.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-60 bg-gray-50 rounded">
                <p className="text-gray-500">No response data available for this question</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DemographicsTab;