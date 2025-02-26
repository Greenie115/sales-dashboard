import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import _ from 'lodash';

// Shopmium primary color with contrasting colors
const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800', '#607D8B', '#673AB7', '#3F51B5'];

const ExecutiveSummaryPanel = ({ 
  data, 
  timeframe = 'all', 
  comparisonMode = false,
  comparisonMetrics = null,
  metrics = null
}) => {
  // Calculate and memoize key stats
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    // Get top 5 retailers
    const retailerGroups = _.groupBy(data, 'chain');
    const topRetailers = Object.entries(retailerGroups)
      .map(([name, items]) => ({
        name: name || 'Unknown',
        value: items.length,
        percentage: (items.length / data.length) * 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    // Get top 5 products
    const productGroups = _.groupBy(data, 'product_name');
    const topProducts = Object.entries(productGroups)
      .map(([name, items]) => ({
        name: name || 'Unknown',
        value: items.length,
        percentage: (items.length / data.length) * 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    // Get day of week distribution
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayGroups = _.groupBy(data, 'day_of_week');
    const dayDistribution = dayNames.map((name, index) => {
      const items = dayGroups[index] || [];
      return {
        name: name.substring(0, 3), // Shortened day name
        value: items.length,
        percentage: (items.length / data.length) * 100
      };
    });
    
    // Calculate trend (last 7 days vs previous 7 days)
    const sortedByDate = _.sortBy(data, 'receipt_date');
    const dates = _.uniq(sortedByDate.map(item => item.receipt_date));
    
    let trend = null;
    
    if (dates.length > 14) {
      const last7Days = dates.slice(-7);
      const previous7Days = dates.slice(-14, -7);
      
      const last7DaysData = data.filter(item => last7Days.includes(item.receipt_date));
      const previous7DaysData = data.filter(item => previous7Days.includes(item.receipt_date));
      
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
        text: `${topRetailers[0].name} is your top retailer with ${topRetailers[0].percentage.toFixed(1)}% of redemptions`
      });
    }
    
    // Add insight about day of week
    const bestDay = _.maxBy(dayDistribution, 'value');
    if (bestDay) {
      insights.push({
        type: 'day',
        text: `${bestDay.name} is your best performing day with ${bestDay.percentage.toFixed(1)}% of redemptions`
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
  }, [data]);
  
  // Handle empty data
  if (!data || data.length === 0 || !stats || !metrics) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center mb-6">
        <h2 className="text-lg font-semibold text-gray-700">Executive Summary</h2>
        <p className="text-gray-500 mt-2">Load sales data to view your executive summary</p>
      </div>
    );
  }
  
  // Calculate performance change for comparison mode
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Executive Summary</h2>
        <div className="text-sm text-gray-500">
          {timeframe === 'all' ? 'All Time' : 
           timeframe === 'month' ? 'Monthly View' : 
           'Custom Date Range'}
        </div>
      </div>
      
      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-pink-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Redemptions</h3>
          {!comparisonMode ? (
            <p className="text-2xl font-bold text-pink-600">{metrics.totalUnits.toLocaleString()}</p>
          ) : (
            <div className="flex items-baseline justify-between">
              <p className="text-xl font-bold text-pink-600">{metrics.totalUnits.toLocaleString()}</p>
              {comparisonMetrics && (
                <div className={`ml-2 text-sm font-medium ${calculateChange(metrics.totalUnits, comparisonMetrics.totalUnits) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {calculateChange(metrics.totalUnits, comparisonMetrics.totalUnits) >= 0 ? '↑' : '↓'} 
                  {Math.abs(calculateChange(metrics.totalUnits, comparisonMetrics.totalUnits)).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-pink-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Average Per Day</h3>
          {!comparisonMode ? (
            <p className="text-2xl font-bold text-pink-600">{metrics.avgRedemptionsPerDay}</p>
          ) : (
            <div className="flex items-baseline justify-between">
              <p className="text-xl font-bold text-pink-600">{metrics.avgRedemptionsPerDay}</p>
              {comparisonMetrics && (
                <div className={`ml-2 text-sm font-medium ${calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(comparisonMetrics.avgRedemptionsPerDay)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(comparisonMetrics.avgRedemptionsPerDay)) >= 0 ? '↑' : '↓'} 
                  {Math.abs(calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(comparisonMetrics.avgRedemptionsPerDay))).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-pink-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Time Period</h3>
          <p className="text-sm font-medium text-gray-600">
            {metrics.uniqueDates[0]} to {metrics.uniqueDates[metrics.uniqueDates.length - 1]}
          </p>
          <p className="text-sm text-gray-500">({metrics.daysInRange} days)</p>
        </div>
        
        <div className="bg-pink-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Trend (Last 7 Days)</h3>
          {stats.trend ? (
            <div className="flex items-baseline">
              <p className={`text-lg font-bold ${stats.trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stats.trend.direction === 'up' ? '↑' : '↓'} {Math.abs(stats.trend.change).toFixed(1)}%
              </p>
              <p className="ml-2 text-sm text-gray-500">vs previous period</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Insufficient data for trend</p>
          )}
        </div>
      </div>
      
      {/* Key Insights Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Key Insights</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <ul className="space-y-2">
            {stats.insights.map((insight, index) => (
              <li key={index} className="flex items-start">
                <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center mr-2 ${
                  insight.status === 'positive' ? 'bg-green-100 text-green-600' : 
                  insight.status === 'negative' ? 'bg-red-100 text-red-600' : 
                  'bg-pink-100 text-pink-600'
                }`}>
                  {insight.status === 'positive' ? '↑' : 
                   insight.status === 'negative' ? '↓' : 
                   '•'}
                </div>
                <p className="text-sm text-gray-700">{insight.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Charts Section - Mini Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Retailers Mini Chart */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Top Retailers</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.topRetailers}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {stats.topRetailers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [value.toLocaleString(), props.payload.name]} />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Day of Week Mini Chart */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Day of Week Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.dayDistribution}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" scale="band" />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="value" fill="#0066CC" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummaryPanel;