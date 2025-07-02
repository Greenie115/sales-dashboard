import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext'; // Provides raw salesData
import { useFilter } from '../../../context/FilterContext'; // Provides filter state AND comparisonMode
import { useTheme } from '../../../context/ThemeContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import maxBy from 'lodash/maxBy';
import { useChartColors } from '../../../utils/chartColors';
import { useClientData } from '../../../context/ClientDataContext'; // For shared view snapshot
import FunnelChart from '../../charts/FunnelChart';
import {
  filterSalesData,
  calculateMetrics,
  getRetailerDistribution,
  getProductDistribution
} from '../../../utils/dataProcessing'; // Import centralized functions

/**
 * SummaryTab component displays the executive summary
 */
const SummaryTab = ({ isSharedView }) => {
  console.log("SummaryTab rendering, isSharedView:", isSharedView);
  
  // Use either the client data context or the regular data context based on the isSharedView prop
  const contextData = useData();
  const clientData = useClientData();
  const dataContext = isSharedView ? clientData : contextData; // Use snapshot for shared view
  const { darkMode } = useTheme();
  const { filters: filterState, comparisonMode } = useFilter(); // Get filters AND comparisonMode from FilterContext
  const salesData = dataContext.salesData || [];
  const colors = useChartColors(); // Get chart colors
  
  // Log what data we're working with to debug
  console.log("SummaryTab dataContext:", dataContext);
  
  // Destructure necessary raw data and state from DataContext
  const {
    salesData: rawSalesData, // Use raw data
    brandMapping, // Needed for product distribution
    dateRange, // Still needed? Check FilterContext usage
    // comparisonMode, // Get from FilterContext
    filteredData: contextFilteredData, // For shared view snapshot
    metrics: contextMetrics // For shared view snapshot
  } = dataContext;
  
  // For shared view, prioritize the directly provided data
  // Calculate filtered data using the centralized function for non-shared views
  const filteredData = useMemo(() => {
    if (isSharedView && contextFilteredData) {
      return contextFilteredData; // Use snapshot data for shared view
    }
    if (!rawSalesData || !filterState) return [];
    return filterSalesData(rawSalesData, filterState);
  }, [isSharedView, contextFilteredData, rawSalesData, filterState]);
  
  // Check if a chart should be shown based on hiddenCharts array
  const shouldShowChart = (chartId) => {
    if (!isSharedView) return true; // Always show charts in main dashboard
    
    if (!clientData || !clientData.hiddenCharts) return true;
    return !clientData.hiddenCharts.includes(chartId);
  };
  
  // Use pre-calculated metrics if available, otherwise calculate them
  // Calculate metrics using the centralized function for non-shared views
  const metrics = useMemo(() => {
    if (isSharedView && contextMetrics) {
      return contextMetrics; // Use snapshot metrics for shared view
    }
    return calculateMetrics(filteredData);
  }, [isSharedView, contextMetrics, filteredData]);
  
  // Get comparison metrics
  // Calculate comparison metrics using centralized functions
  const comparisonMetrics = useMemo(() => { // Use comparisonMode directly
    if (!comparisonMode || isSharedView) return null; // No comparison in shared view
    // Construct comparison filters (assuming FilterContext holds comparison state)
    const comparisonFilters = {
      ...filterState, // Start with base filters
      dateRange: filterState.comparisonDateRange,
      startDate: filterState.comparisonStartDate,
      endDate: filterState.comparisonEndDate,
      selectedMonth: filterState.comparisonMonth,
      // Ensure product/retailer filters are applied correctly if needed for comparison
    };
    const comparisonFilteredData = filterSalesData(rawSalesData, comparisonFilters);
    return calculateMetrics(comparisonFilteredData);
  }, [comparisonMode, isSharedView, rawSalesData, filterState]); // Update dependency
  
  // Calculate stats for visualizations
  const stats = useMemo(() => {
    console.log("Calculating stats, filteredData:", filteredData?.length);
    if (!filteredData || filteredData.length === 0) return null;
    
    // Use imported function for retailer distribution
    const retailerDistribution = getRetailerDistribution(filteredData);
    const topRetailers = retailerDistribution.slice(0, 5);
    
    // Use imported function for product distribution
    const productDistribution = getProductDistribution(filteredData, brandMapping);
    const topProducts = productDistribution.slice(0, 5);
    
    // Get day of week distribution
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayGroups = groupBy(filteredData, 'day_of_week');
    const dayDistribution = dayNames.map((name, index) => {
      const items = dayGroups[index] || [];
      return {
        name: name.substring(0, 3), // Shortened day name
        value: items.length,
        percentage: (items.length / filteredData.length) * 100
      };
    });
    
    // Calculate trend (last 7 days vs previous 7 days)
    const sortedByDate = sortBy(filteredData, 'receipt_date');
    const dates = uniq(sortedByDate.map(item => item.receipt_date));
    
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
    const bestDay = maxBy(dayDistribution, 'value');
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
    
    // Create funnel data based on sales process
    const funnelData = [];
    
    // Step 1: Total products available (estimate based on unique products)
    const uniqueProducts = uniq(filteredData.map(item => item.product_name));
    funnelData.push({
      name: 'Products Available',
      value: uniqueProducts.length * 50, // Estimate average products per retailer
    });
    
    // Step 2: Product views (estimate based on sales)
    funnelData.push({
      name: 'Product Views',
      value: filteredData.length * 8, // Estimate 8 views per sale
    });
    
    // Step 3: Add to cart (estimate)
    funnelData.push({
      name: 'Added to Cart',
      value: filteredData.length * 2, // Estimate 2 cart adds per sale
    });
    
    // Step 4: Checkout initiated
    funnelData.push({
      name: 'Checkout Started',
      value: Math.round(filteredData.length * 1.3), // 30% dropout at checkout
    });
    
    // Step 5: Actual sales
    funnelData.push({
      name: 'Sales Completed',
      value: filteredData.length,
    });
    
    console.log("Stats calculated:", {topRetailers, insights, funnelData});
    
    return {
      topRetailers,
      topProducts,
      dayDistribution,
      trend,
      insights,
      funnelData
    };
  }, [filteredData, brandMapping]); // Add brandMapping dependency
  
  // Helper function to calculate percentage change
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-block w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Handle empty data
  if (!rawSalesData || rawSalesData.length === 0 || !filteredData || filteredData.length === 0 || !metrics) { // Check rawSalesData
    console.log("Empty data condition triggered");
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 flex items-center justify-center border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Summary</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">No data available for the current filters</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Summary</h2>
        <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full">
          {dateRange === 'all' ? 'All Time' : 
           dateRange === 'month' ? 'Monthly View' : 
           'Custom Date Range'}
        </div>
      </div>
      
      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-900/30 p-6 rounded-lg shadow-sm border border-pink-200 dark:border-pink-800/30">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Redemptions</h3>
          {!comparisonMode ? (
            <div>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{metrics.totalUnits.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total units redeemed</p>
            </div>
          ) : ( // If comparisonMode is true
            <div className="flex items-baseline justify-between flex-wrap"> {/* Added flex-wrap */}
              <div>
                <p className="text-xl font-bold text-pink-600 dark:text-pink-400">{metrics.totalUnits.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current period</p>
              </div>
              {comparisonMetrics && (
                <div className={`ml-2 text-sm font-medium ${calculateChange(metrics.totalUnits, comparisonMetrics.totalUnits) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} flex items-center`}>
                  {calculateChange(metrics.totalUnits, comparisonMetrics.totalUnits) >= 0 ? (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : ( // This is the 'else' block for the inner ternary
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )} {/* Closing parenthesis for the inner ternary */}
                  {Math.abs(calculateChange(metrics.totalUnits, comparisonMetrics.totalUnits)).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 p-6 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800/30">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Average Per Day</h3>
          {!comparisonMode ? (
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.avgRedemptionsPerDay}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Units per day</p>
            </div>
          ) : ( // If comparisonMode is true
            <div className="flex items-baseline justify-between flex-wrap"> {/* Added flex-wrap */}
              <div>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{metrics.avgRedemptionsPerDay}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current period</p>
              </div>
              {comparisonMetrics && (
                <div className={`ml-2 text-sm font-medium ${calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(comparisonMetrics.avgRedemptionsPerDay)) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} flex items-center`}>
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
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 p-6 rounded-lg shadow-sm border border-purple-200 dark:border-purple-800/30">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Time Period</h3>
          <p className="text-md font-medium text-purple-600 dark:text-purple-400">
            {metrics.uniqueDates && metrics.uniqueDates.length > 0 ? 
              `${metrics.uniqueDates[0]} to ${metrics.uniqueDates[metrics.uniqueDates.length - 1]}` :
              "No date range"
            }
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{metrics.daysInRange} days</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 p-6 rounded-lg shadow-sm border border-green-200 dark:border-green-800/30">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Trend (Last 7 Days)</h3>
          {stats && stats.trend ? (
            <div>
              <div className="flex items-center">
                <p className={`text-lg font-bold ${stats.trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">vs previous period</p>
            </div>
          ) : (
            <div className="flex items-center">
              <p className="text-md font-medium text-gray-500 dark:text-gray-400">Insufficient data</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Need 14+ days</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Key Insights Section */}
      {stats && stats.insights && stats.insights.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Key Insights</h3>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.insights.map((insight, index) => (
                <div 
                  key={index} 
                  className={`rounded-lg p-4 shadow-sm border flex items-start ${
                    insight.status === 'positive' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30' : 
                    insight.status === 'negative' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30' : 
                    'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-4 ${
                    insight.status === 'positive' ? 'bg-green-100 dark:bg-green-800/40 text-green-600 dark:text-green-400' : 
                    insight.status === 'negative' ? 'bg-red-100 dark:bg-red-800/40 text-red-600 dark:text-red-400' : 
                    insight.type === 'retailer' ? 'bg-blue-100 dark:bg-blue-800/40 text-blue-600 dark:text-blue-400' :
                    insight.type === 'day' ? 'bg-purple-100 dark:bg-purple-800/40 text-purple-600 dark:text-purple-400' :
                    'bg-pink-100 dark:bg-pink-800/40 text-pink-600 dark:text-pink-400'
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
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{insight.text}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
      )}
      
      {/* Charts Section - only show if stats are available */}
      {stats && stats.topRetailers && stats.dayDistribution && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Retailers Mini Chart */}
          {shouldShowChart('retailer-distribution') && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
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
                          fill={colors.colorPalette[index % colors.colorPalette.length]} 
                          stroke="#fff"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-xs text-gray-700 dark:text-gray-300">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* Day of Week Mini Chart */}
          {shouldShowChart('day-distribution') && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.gridColor} />
                    <XAxis type="number" tick={{ fill: colors.textSecondary }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      scale="band" 
                      tick={{ fontSize: 12, fill: colors.textSecondary }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill={colors.secondary}
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    >
                      {stats.dayDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`rgba(59, 130, 246, ${0.5 + (entry.percentage / 100) * 0.5})`}
                          opacity={darkMode ? 0.8 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conversion Funnel */}
      {stats && stats.funnelData && stats.funnelData.length > 0 && shouldShowChart('conversion-funnel') && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Conversion Funnel</h3>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <FunnelChart
                data={stats.funnelData}
                title=""
                width={700}
                height={350}
                showLabels={true}
                showPercentages={true}
                showTooltip={true}
              />
            </div>
            
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>This funnel shows the estimated customer conversion journey from product discovery to completed sales.</p>
              <p>Data is modeled based on actual sales and industry conversion rate estimates.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryTab;
