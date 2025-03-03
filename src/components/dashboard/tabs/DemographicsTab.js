// src/components/dashboard/tabs/DemographicsTab.js
import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../../context/DashboardContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

// Branded colors for possible future use
const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800'];

const DemographicsTab = () => {
  const { state } = useDashboard();
  const { filteredData } = state;

  // Local state
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState('');
  const [responseData, setResponseData] = useState([]);
  const [ageDistribution, setAgeDistribution] = useState([]);
  const [uniqueResponses, setUniqueResponses] = useState([]);
  const [genderData, setGenderData] = useState([]);

  // Run initial analysis when data is loaded
  useEffect(() => {
    if (filteredData && filteredData.length > 0) {
      const repurchaseQuestion = findRepurchaseQuestion();
      if (repurchaseQuestion) {
        setSelectedQuestionNumber(repurchaseQuestion);
      }
      analyzeGenderData();
      analyzeAgeDistribution();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData]);

  // Recalculate response analysis whenever the selected question changes
  useEffect(() => {
    if (selectedQuestionNumber && filteredData && filteredData.length > 0) {
      analyzeResponseData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuestionNumber, filteredData]);

  // Extract available question numbers from the first data item
  const getAvailableQuestionNumbers = () => {
    if (!filteredData || filteredData.length === 0) return [];
    const firstItem = filteredData[0];
    return Object.keys(firstItem)
      .filter(key => key.startsWith('question_'))
      .map(key => key.replace('question_', ''))
      .sort((a, b) => a - b); // sort numerically
  };

  // Find the first question that mentions repurchase keywords; default to the first available if none
  const findRepurchaseQuestion = () => {
    const repurchaseKeywords = ['purchase again', 'buy again', 'repurchase', 'reorder'];
    const questions = getAvailableQuestionNumbers();

    for (const num of questions) {
      const questionKey = `question_${num}`;
      // Find the first instance with a non-empty question text
      const item = filteredData.find(item => item[questionKey] && item[questionKey].trim() !== '');
      const questionText = item ? item[questionKey] : '';
      if (questionText && repurchaseKeywords.some(keyword => questionText.toLowerCase().includes(keyword))) {
        return num;
      }
    }
    return questions.length > 0 ? questions[0] : null;
  };

  // Analyze gender data by grouping and counting, then computing percentages
  const analyzeGenderData = () => {
    if (!filteredData || filteredData.length === 0) return;
    const itemsWithGender = filteredData.filter(item => item.gender && item.gender.trim() !== '');
    const genderGroups = _.groupBy(itemsWithGender, 'gender');
    const genderStats = Object.entries(genderGroups).map(([gender, items]) => ({
      name: gender,
      value: items.length,
      percentage: ((items.length / itemsWithGender.length) * 100).toFixed(1)
    }));
    setGenderData(genderStats);
  };

  // Analyze age distribution assuming each item has an "ageGroup" field
  const analyzeAgeDistribution = () => {
    if (!filteredData || filteredData.length === 0) return;
    const itemsWithAge = filteredData.filter(item => item.ageGroup && item.ageGroup.trim() !== '');
    const ageGroups = _.groupBy(itemsWithAge, 'ageGroup');
    // Map over the preferred order to keep consistent ordering
    const ageStats = AGE_GROUP_ORDER.map(group => ({
      ageGroup: group,
      count: ageGroups[group] ? ageGroups[group].length : 0
    })).filter(item => item.count > 0); // optional: filter out groups with no data
    setAgeDistribution(ageStats);
  };

  // Analyze responses for the selected question by counting unique answers
  const analyzeResponseData = () => {
    // Assuming the response is stored under the key "question_{selectedQuestionNumber}"
    const responseKey = `question_${selectedQuestionNumber}`;
    const responses = filteredData
      .map(item => item[responseKey])
      .filter(response => response && response.trim() !== '');
    const responseCount = _.countBy(responses);
    const responseArray = Object.entries(responseCount).map(([response, count]) => ({
      response,
      count
    }));
    setUniqueResponses(Object.keys(responseCount));
    setResponseData(responseArray);
  };

  // Handle user changing the selected question
  const handleQuestionChange = (e) => {
    setSelectedQuestionNumber(e.target.value);
  };

  return (
    <div className="demographics-tab">
      <h2>Demographics Insights</h2>
      
      <div className="question-selector">
        <label htmlFor="question-select">Select Question: </label>
        <select id="question-select" value={selectedQuestionNumber} onChange={handleQuestionChange}>
          {getAvailableQuestionNumbers().map(num => (
            <option key={num} value={num}>
              Question {num}
            </option>
          ))}
        </select>
      </div>

      <div className="chart-section">
        <h3>Gender Distribution</h3>
        {genderData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={genderData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>No gender data available.</p>
        )}
      </div>

      <div className="chart-section">
        <h3>Age Distribution</h3>
        {ageDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageGroup" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#82ca9d" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>No age distribution data available.</p>
        )}
      </div>

      <div className="chart-section">
        <h3>Response Analysis for Question {selectedQuestionNumber}</h3>
        {responseData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={responseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="response" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#ff7300" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>No responses data available.</p>
        )}
      </div>
    </div>
  );
};

export default DemographicsTab;
