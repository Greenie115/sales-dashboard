import React, { useMemo } from 'react';
import { useFilter } from '../../../context/FilterContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import _ from 'lodash';

/**
 * SummaryTab component displays the executive summary
 * This is now a dedicated tab rather than part of the Sales tab
 */
const SummaryTab = () => {
  const { 
    getFilteredData, 
    dateRange, 
    comparisonMode 
  } = useFilter();
  
  // Get filtered data
  const filteredData = getFilteredData();
  
  // Get comparison data if in comparison mode
  const comparisonData = comparisonMode ? getFilteredData(true) : null;
  
  // Calculate metrics
  const metrics = calculateMetrics(filteredData);
  
  // Calculate comparison metrics if needed
  const comparisonMetrics = comparisonMode && comparisonData ? 
    calculateMetrics(comparisonData) : null;
  
  // Calculate stats for visualizations
  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;
    
    // Get top 5 retailers
    const retailerGroups = _.groupBy(filteredData, 'chain');
    const topRetailers = Object.entries(retailerGroups)
      .map(([name, items]) => ({
        name: name || 'Unknown',
        value: items.length,
        percentage: (items.length / filteredData.length) * 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    // Get top 5 products
    const productGroups = _.groupBy(filteredData, 'product_name');
    const topProducts = Object.entries(productGroups)
      .map(([name, items]) => ({
        name: name || 'Unknown',
        value: items.length,
        percentage: (items.length / filteredData.length) * 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    // Get day of week distribution
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayGroups = _.groupBy(filteredData, 'day_of_week');
    const dayDistribution = dayNames.map((name, index) => {
      const items = dayGroups[index] || [];
      return {
        name: name.substring(0, 3), // Shortened day name
        value: items.length,
        percentage: (items.length / filteredData.length) * 100
      };
    });
    
    // Calculate trend (last 7 days vs previous 7 days)
    const sortedByDate = _.sortBy(filteredData, 'receipt_date');
    const dates = _.uniq(sortedByDate.map(item => item.receipt_date));
    
    let trend = null;
    
    if (dates.length > 14) {
      const last7Days = dates.slice(-7);
      const previous7Days = dates.slice(-14, -7);
      
      const last7DaysData = filteredData.filter(item => last7Days.includes(item.receipt_date));
      const previous7DaysData = filteredData.filter(item => previous7Days.includes(item.receipt_date));
      
      const last7Count = last7DaysData.length;
      const previous7Count = previous7DaysData.length;
      
      trend = {
        last7Count,
        previous7Count,
        change: previous7Count ? (last7Count - previous7Count) / previous7Count * 100 : null,
        direction: last7Count >= previous7Count ? 'up' : 'down'
      };
    }
    
    // Generate key insights based on the data
    const insights = [];
    
    // Add insight about top retailer
    if (topRetailers.length > 0) {
      insights.push({
        type: 'retailer',
        text: `${topRetailers[0].name} is your top retailer with ${topRetailers[0].percentage.toFixed(1)}% of redemptions`,
        data: topRetailers[0].percentage.toFixed(1) + '%'
      });
    }
    
    // Add insight about day of week
    const bestDay = _.maxBy(dayDistribution, 'value');
    if (bestDay) {
      insights.push({
        type: 'day',
        text: `${bestDay.name} is your best performing day with ${bestDay.percentage.toFixed(1)}% of redemptions`,
        data: bestDay.percentage.toFixed(1) + '%'
      });
    }
    
    // Add trend insight
    if (trend) {
      const trendText = trend.direction === 'up' 
        ? `Sales are up ${Math.abs(trend.change).toFixed(1)}% in the last 7 days`
        : `Sales are down ${Math.abs(trend.change).toFixed(1)}% in the last 7 days`;
      
      insights.push({
        type: 'trend',
        text: trendText,
        data: Math.abs(trend.change).toFixed(1) + '%',
        status: trend.direction === 'up' ? 'positive' : 'negative'
      });
    }
    
    return {
      topRetailers,
      topProducts,
      dayDistribution,
      trend,
      insights
    };
  }, [filteredData]);
  
  // Shopmium primary color with contrasting colors
  const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800', '#607D8B', '#673AB7', '#3F51B5'];
  
  // Handle empty data
  if (!filteredData || filteredData.length === 0 || !stats || !metrics) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm mb-6 flex items-center justify-center border border-gray-200">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-gray-700">Executive Summary</h2>
          <p className="mt-1 text-gray-500">Load sales data to view your executive summary</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Summary</h2>
        <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
          {dateRange === 'all' ? 'All Time' : 
           dateRange === 'month' ? 'Monthly View' : 
           'Custom Date Range'}
        </div>
      </div>
      
      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-6 rounded-lg shadow-sm border border-pink-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Redemptions</h3>
          {!comparisonMode ? (
            <div>
              <p className="text-2xl font-bold text-pink-600">{metrics.totalUnits.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total units redeemed</p>
            </div>
          ) : (
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xl font-bold text-pink-600">{metrics.totalUnits.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Current period</p>
              </div>
              {comparisonMetrics && (
                <div className={`ml-2 text-sm font-medium ${calculateChange(metrics.totalUnits, comparisonMetrics.totalUnits) >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                  {calculateChange(metrics.totalUnits, comparisonMetrics.totalUnits) >= 0 ? (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {Math.abs(calculateChange(metrics.totalUnits, comparisonMetrics.totalUnits)).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow-sm border border-blue-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Average Per Day</h3>
          {!comparisonMode ? (
            <div>
              <p className="text-2xl font-bold text-blue-600">{metrics.avgRedemptionsPerDay}</p>
              <p className="text-xs text-gray-500 mt-1">Units per day</p>
            </div>
          ) : (
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xl font-bold text-blue-600">{metrics.avgRedemptionsPerDay}</p>
                <p className="text-xs text-gray-500 mt-1">Current period</p>
              </div>
              {comparisonMetrics && (
                <div className={`ml-2 text-sm font-medium ${calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(comparisonMetrics.avgRedemptionsPerDay)) >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                  {calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(comparisonMetrics.avgRedemptionsPerDay)) >= 0 ? (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {Math.abs(calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(comparisonMetrics.avgRedemptionsPerDay))).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg shadow-sm border border-purple-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Time Period</h3>
          <p className="text-md font-medium text-purple-600">
            {metrics.uniqueDates[0]} to {metrics.uniqueDates[metrics.uniqueDates.length - 1]}
          </p>
          <p className="text-xs text-gray-500 mt-1">{metrics.daysInRange} days</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg shadow-sm border border-green-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Trend (Last 7 Days)</h3>
          {stats.trend ? (
            <div>
              <div className="flex items-center">
                <p className={`text-lg font-bold ${stats.trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.trend.direction === 'up' ? (
                    <svg className="h-5 w-5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {Math.abs(stats.trend.change).toFixed(1)}%
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">vs previous period</p>
            </div>
          ) : (
            <div className="flex items-center">
              <p className="text-md font-medium text-gray-500">Insufficient data</p>
              <p className="text-xs text-gray-500 mt-1">Need 14+ days</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Key Insights Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.insights.map((insight, index) => (
              <div 
                key={index} 
                className={`rounded-lg p-4 shadow-sm border flex items-start ${
                  insight.status === 'positive' ? 'bg-green-50 border-green-200' : 
                  insight.status === 'negative' ? 'bg-red-50 border-red-200' : 
                  'bg-white border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-4 ${
                  insight.status === 'positive' ? 'bg-green-100 text-green-600' : 
                  insight.status === 'negative' ? 'bg-red-100 text-red-600' : 
                  insight.type === 'retailer' ? 'bg-blue-100 text-blue-600' :
                  insight.type === 'day' ? 'bg-purple-100 text-purple-600' :
                  'bg-pink-100 text-pink-600'
                }`}>
                  {insight.status === 'positive' ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : insight.status === 'negative' ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  ) : insight.type === 'retailer' ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  ) : insight.type === 'day' ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{insight.text}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {insight.type === 'retailer' ? 'Top retailer by volume' : 
                     insight.type === 'day' ? 'Best performing day' : 
                     insight.status === 'positive' ? 'Positive trend' : 
                     insight.status === 'negative' ? 'Negative trend' : 
                     'Insight'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Charts Section - Mini Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Retailers Mini Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <svg className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Top Retailers
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.topRetailers}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                    return percent > 0.1 ? (
                      <text 
                        x={x} 
                        y={y} 
                        fill="#fff" 
                        textAnchor="middle" 
                        dominantBaseline="central"
                        fontSize={12}
                        fontWeight="bold"
                      >
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    ) : null;
                  }}
                >
                  {stats.topRetailers.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [value.toLocaleString(), props.payload.name]} />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  iconType="circle"
                  formatter={(value, entry, index) => (
                    <span className="text-xs text-gray-700">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Day of Week Mini Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <svg className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Day of Week Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.dayDistribution}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  scale="band" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString(), 'Redemptions']}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#0066CC" 
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                >
                  {stats.dayDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`rgba(0, 102, 204, ${0.5 + (entry.percentage / 100) * 0.5})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate metrics
const calculateMetrics = (filteredData) => {
  if (!filteredData || filteredData.length === 0) return null;
  
  // Get unique dates
  const uniqueDates = [...new Set(filteredData.map(item => item.receipt_date))].sort();
  const daysInRange = uniqueDates.length;
  
  // Calculate total value
  const totalValue = filteredData.reduce((sum, item) => sum + (item.receipt_total || 0), 0);
  
  // Calculate average per day
  const avgPerDay = daysInRange > 0 ? filteredData.length / daysInRange : 0;
  
  return {
    totalUnits: filteredData.length,
    uniqueDates,
    daysInRange,
    totalValue,
    avgRedemptionsPerDay: avgPerDay.toFixed(1)
  };
};

// Helper function to calculate percentage change
const calculateChange = (current, previous) => {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

export default SummaryTab;