import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import _ from 'lodash';

const DemographicInsights = ({ data }) => {
  const [selectedQuestion, setSelectedQuestion] = useState('question_01');
  
  // Get all questions that have responses
  const getAvailableQuestions = () => {
    const questionKeys = Object.keys(data[0] || {}).filter(key => key.startsWith('question_') && !key.includes('undefined'));
    return questionKeys;
  };

  // Calculate response distribution by age group
  const calculateDistribution = () => {
    const groupedByAge = _.groupBy(data, 'age_group');
    
    const distribution = Object.entries(groupedByAge).map(([ageGroup, groupData]) => {
      const totalInGroup = groupData.length;
      const responses = _.countBy(groupData, selectedQuestion);
      
      // Calculate percentages for each response
      const responsePercentages = Object.entries(responses).reduce((acc, [response, count]) => {
        acc[response] = (count / totalInGroup) * 100;
        return acc;
      }, {});

      return {
        ageGroup,
        totalResponses: totalInGroup,
        ...responsePercentages
      };
    });

    return _.sortBy(distribution, 'ageGroup');
  };

  const chartData = calculateDistribution();
  const availableQuestions = getAvailableQuestions();
  
  // Get unique responses for the selected question
  const uniqueResponses = _.uniq(data.map(item => item[selectedQuestion])).filter(Boolean);

  // Generate colors for responses
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Demographic Insights</h2>
        
        {/* Question Selector */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Question</label>
          <select
            value={selectedQuestion}
            onChange={(e) => setSelectedQuestion(e.target.value)}
            className="block w-full p-2 border rounded"
          >
            {availableQuestions.map(question => (
              <option key={question} value={question}>
                {`Question ${question.split('_')[1]}`}
              </option>
            ))}
          </select>
        </div>

        {/* Response Distribution Chart */}
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Response Distribution by Age Group</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ageGroup" />
                <YAxis label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {uniqueResponses.map((response, index) => (
                  <Bar
                    key={response}
                    dataKey={response}
                    name={`Response: ${response}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Response Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Responses</th>
                  {uniqueResponses.map(response => (
                    <th key={response} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {`Response: ${response}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartData.map((row, idx) => (
                  <tr key={row.ageGroup} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.ageGroup}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.totalResponses}</td>
                    {uniqueResponses.map(response => (
                      <td key={response} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {`${row[response]?.toFixed(1)}%` || '0%'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemographicInsights;