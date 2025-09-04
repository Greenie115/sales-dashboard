import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext'; // Provides raw salesData
import { useFilter } from '../../../context/FilterContext'; // Provides filter state AND comparisonMode
import { useTheme } from '../../../context/ThemeContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import { useChartColors } from '../../../utils/chartColors';
import {
  filterSalesData,
  calculateMetrics,
  getRetailerDistribution,
  calculateRepurchaseIntent
} from '../../../utils/dataProcessing';
import ChartErrorBoundary from '../../common/ChartErrorBoundary';
import CalculationErrorBoundary from '../../common/CalculationErrorBoundary';

/**
 * SummaryTab component displays the executive summary
 */
const SummaryTab = React.memo(() => {
  // Use the data context
  const contextData = useData();
  const { darkMode } = useTheme();
  const { 
    filters: filterState, 
    comparisonMode,
    comparisonDateRange,
    comparisonStartDate,
    comparisonEndDate,
    comparisonMonth
  } = useFilter();
  const colors = useChartColors(); // Get chart colors
  
  // Destructure necessary raw data and state from DataContext
  const {
    salesData: rawSalesData, // Use raw data (legacy)
    brandMapping, // Needed for product distribution
    dateRange, // Date range from filter context
    campaigns, // New campaign data
    comparisonSettings, // Campaign comparison settings
    canCompare, // Whether we can do campaign comparison
    canCompareYearly, // Whether we can do yearly comparison
    getYearLabels, // Get year labels for display
    lastUpdated, // Data refresh timestamp
    dataLoading // Loading state
  } = contextData;
  
  // Determine active dataset based on comparison settings
  const activeDataset = useMemo(() => {
    if ((comparisonSettings.mode === 'campaigns' && canCompare) || 
        (comparisonSettings.mode === 'yearly' && canCompareYearly)) {
      // Use primary campaign for main analysis
      return campaigns[comparisonSettings.primaryDataset]?.data || [];
    }
    // Use legacy data or Campaign A
    return rawSalesData || campaigns.A?.data || [];
  }, [rawSalesData, campaigns, comparisonSettings, canCompare, canCompareYearly]);
  
  // Get comparison dataset for campaign/yearly comparison
  const comparisonDataset = useMemo(() => {
    if ((comparisonSettings.mode === 'campaigns' && canCompare) || 
        (comparisonSettings.mode === 'yearly' && canCompareYearly)) {
      const otherCampaign = comparisonSettings.primaryDataset === 'A' ? 'B' : 'A';
      return campaigns[otherCampaign]?.data || [];
    }
    return [];
  }, [campaigns, comparisonSettings, canCompare, canCompareYearly]);
  
  
  // Calculate filtered data using the centralized function
  const filteredData = useMemo(() => {
    if (!activeDataset || !filterState) return [];
    return filterSalesData(activeDataset, filterState);
  }, [activeDataset, filterState]);
  
  // Calculate filtered comparison data for campaign/yearly comparison
  const filteredComparisonData = useMemo(() => {
    if (!comparisonDataset || !filterState || 
        (comparisonSettings.mode !== 'campaigns' && comparisonSettings.mode !== 'yearly')) return [];
    return filterSalesData(comparisonDataset, filterState);
  }, [comparisonDataset, filterState, comparisonSettings.mode]);
  
  // Calculate metrics using the centralized function
  const metrics = useMemo(() => {
    try {
      return calculateMetrics(filteredData);
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return null;
    }
  }, [filteredData]);
  
  // Calculate comparison metrics for campaign/yearly comparison
  const campaignComparisonMetrics = useMemo(() => {
    if ((comparisonSettings.mode !== 'campaigns' && comparisonSettings.mode !== 'yearly') || 
        !filteredComparisonData.length) return null;
    return calculateMetrics(filteredComparisonData);
  }, [filteredComparisonData, comparisonSettings.mode]);
  
  // Get comparison metrics (legacy time-period comparison)
  const comparisonMetrics = useMemo(() => {
    // Skip legacy time comparison if we're in campaign comparison mode
    if (!comparisonMode || comparisonSettings.mode === 'campaigns') return null;
    
    // Handle different comparison modes
    let comparisonFilters;
    
    if (comparisonDateRange === 'previous') {
      // Auto-calculate previous period based on current filters
      if (filterState.dateRange === 'month' && filterState.selectedMonth) {
        // For month view, compare with previous month
        const [year, month] = filterState.selectedMonth.split('-');
        const prevMonth = parseInt(month) - 1;
        const prevYear = prevMonth < 1 ? parseInt(year) - 1 : parseInt(year);
        const adjustedMonth = prevMonth < 1 ? 12 : prevMonth;
        const prevMonthStr = `${prevYear}-${adjustedMonth.toString().padStart(2, '0')}`;
        
        comparisonFilters = {
          ...filterState,
          selectedMonth: prevMonthStr
        };
      } else if (filterState.dateRange === 'custom' && filterState.startDate && filterState.endDate) {
        // For custom date range, calculate equivalent previous period
        const startDateObj = new Date(filterState.startDate);
        const endDateObj = new Date(filterState.endDate);
        const diffDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
        
        const prevEndDate = new Date(startDateObj);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - diffDays);
        
        comparisonFilters = {
          ...filterState,
          startDate: prevStartDate.toISOString().split('T')[0],
          endDate: prevEndDate.toISOString().split('T')[0]
        };
      } else {
        return null; // Can't calculate previous period for 'all' dates
      }
    } else {
      // Use explicit comparison settings
      comparisonFilters = {
        ...filterState, // Start with base filters (products, retailers)
        dateRange: comparisonDateRange,
        startDate: comparisonStartDate,
        endDate: comparisonEndDate,
        selectedMonth: comparisonMonth,
      };
    }
    
    const comparisonFilteredData = filterSalesData(activeDataset, comparisonFilters);
    return calculateMetrics(comparisonFilteredData);
  }, [comparisonMode, comparisonDateRange, comparisonStartDate, comparisonEndDate, comparisonMonth, activeDataset, filterState, comparisonSettings.mode]);
  
  // Determine which comparison metrics to use
  const finalComparisonMetrics = campaignComparisonMetrics || comparisonMetrics;
  
  // Optimized calculations split into separate useMemo hooks for better performance
  const topRetailers = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const retailerDistribution = getRetailerDistribution(filteredData);
    return retailerDistribution.slice(0, 5).map((retailer, index) => ({
      ...retailer,
      rank: index + 1
    }));
  }, [filteredData]);

  const dayDistribution = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayGroups = groupBy(filteredData, 'day_of_week');
    return dayNames.map((name, index) => {
      const items = dayGroups[index] || [];
      return {
        name: name.substring(0, 3),
        value: items.length,
        percentage: filteredData.length > 0 ? (items.length / filteredData.length) * 100 : 0
      };
    });
  }, [filteredData]);

  const trendData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;
    
    const sortedByDate = sortBy(filteredData, 'receipt_date');
    const dates = uniq(sortedByDate.map(item => item.receipt_date));
    
    if (dates.length <= 14) return null;
    
    const last7Days = dates.slice(-7);
    const previous7Days = dates.slice(-14, -7);
    
    const last7DaysData = filteredData.filter(item => last7Days.includes(item.receipt_date));
    const previous7DaysData = filteredData.filter(item => previous7Days.includes(item.receipt_date));
    
    const last7Count = last7DaysData.length;
    const previous7Count = previous7DaysData.length;
    
    return {
      last7Count,
      previous7Count,
      change: previous7Count ? (last7Count - previous7Count) / previous7Count * 100 : null,
      direction: last7Count >= previous7Count ? 'up' : 'down'
    };
  }, [filteredData]);

  // Repurchase intent analysis
  const repurchaseIntentData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    try {
      const allBrands = campaigns.A?.metadata?.brandMapping || brandMapping || {};
      return calculateRepurchaseIntent(filteredData, allBrands);
    } catch (error) {
      console.error('Error calculating repurchase intent:', error);
      return [];
    }
  }, [filteredData, campaigns.A?.metadata?.brandMapping, brandMapping]);
  
  // Helper function to calculate percentage change
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Click handlers for interactive elements
  const handleChartElementClick = (data, chartType) => {
    console.log(`${chartType} clicked:`, data);
    // In a real app, this could trigger filtering or navigation
    // For now, we'll just log the interaction
  };

  // Enhanced pie chart with click interaction
  const handlePieClick = (data) => {
    if (data && data.payload) {
      handleChartElementClick(data.payload, 'Retailer Pie Chart');
    }
  };

  // Enhanced bar chart with click interaction
  const handleBarClick = (data) => {
    if (data && data.payload) {
      handleChartElementClick(data.payload, 'Day of Week Bar Chart');
    }
  };
  
  // Enhanced tooltip components for different chart types
  const PieChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 max-w-xs">
          <div className="flex items-center mb-2">
            <div 
              className="w-4 h-4 rounded-full mr-2" 
              style={{ backgroundColor: payload[0].color }}
            ></div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.name}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Redemptions:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{data.value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Percentage:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{data.percentage.toFixed(1)}%</span>
            </div>
            {data.rank && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Rank:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">#{data.rank}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const BarChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 max-w-xs">
          <div className="flex items-center mb-2">
            <div 
              className="w-4 h-4 rounded-full mr-2" 
              style={{ backgroundColor: payload[0].color }}
            ></div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Redemptions:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{payload[0].value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Percentage:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{data.percentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Day Type:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {data.percentage > 15 ? '🔥 High Activity' : data.percentage > 12 ? '📈 Above Average' : '📊 Standard'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Generic enhanced tooltip for other chart types (reserved for future use)
  // eslint-disable-next-line no-unused-vars
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{label}</p>
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
  
  // Handle loading state
  if (dataLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-60 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-60 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty data
  if (!activeDataset || activeDataset.length === 0 || !filteredData || filteredData.length === 0 || !metrics) { // Check activeDataset
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 flex items-center justify-center border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">No Summary Data</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Upload a CSV file or adjust your filters to see insights</p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Try expanding your date range or clearing product/retailer filters</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Summary</h2>
          {comparisonSettings.mode === 'campaigns' && canCompare && (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 text-xs font-medium rounded-full">
                Campaign {comparisonSettings.primaryDataset}
              </span>
              <span className="text-gray-400 dark:text-gray-500">vs</span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                Campaign {comparisonSettings.primaryDataset === 'A' ? 'B' : 'A'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
          {comparisonSettings.mode === 'campaigns' && canCompare && (
            <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-medium rounded-full">
              Campaign Comparison
            </div>
          )}
          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full">
            {dateRange === 'all' ? 'All Time' : 
             dateRange === 'month' ? 'Monthly View' : 
             'Custom Date Range'}
          </div>
        </div>
      </div>
      
      {/* Key Metrics Section */}
      <div className="grid gap-4 mb-8 grid-cols-1 md:grid-cols-4">
        <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-900/30 p-6 rounded-lg shadow-sm border border-pink-200 dark:border-pink-800/30 hover:shadow-md transition-shadow duration-200 cursor-pointer group" title="Total number of redemptions across all selected filters">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Redemptions</h3>
          {comparisonSettings.mode !== 'campaigns' ? (
            <div>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{metrics.totalUnits.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total units redeemed</p>
            </div>
          ) : (
            <div className="flex items-baseline justify-between flex-wrap">
              <div>
                <p className="text-xl font-bold text-pink-600 dark:text-pink-400">{metrics.totalUnits.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {comparisonSettings.mode === 'campaigns' ? campaigns[comparisonSettings.primaryDataset]?.metadata?.name || `Campaign ${comparisonSettings.primaryDataset}` : 'Current period'}
                </p>
              </div>
              {finalComparisonMetrics && (
                <div className={`ml-2 text-sm font-medium ${calculateChange(metrics.totalUnits, finalComparisonMetrics.totalUnits) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} flex items-center`}>
                  {calculateChange(metrics.totalUnits, finalComparisonMetrics.totalUnits) >= 0 ? (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {Math.abs(calculateChange(metrics.totalUnits, finalComparisonMetrics.totalUnits) || 0).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 p-6 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800/30 hover:shadow-md transition-shadow duration-200 cursor-pointer group" title="Average redemptions per day in the selected period">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Average Per Day</h3>
          {comparisonSettings.mode !== 'campaigns' ? (
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.avgRedemptionsPerDay}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Units per day</p>
            </div>
          ) : (
            <div className="flex items-baseline justify-between flex-wrap">
              <div>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{metrics.avgRedemptionsPerDay}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {comparisonSettings.mode === 'campaigns' ? campaigns[comparisonSettings.primaryDataset]?.metadata?.name || `Campaign ${comparisonSettings.primaryDataset}` : 'Current period'}
                </p>
              </div>
              {finalComparisonMetrics && (
                <div className={`ml-2 text-sm font-medium ${calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(finalComparisonMetrics.avgRedemptionsPerDay)) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} flex items-center`}>
                  {calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(finalComparisonMetrics.avgRedemptionsPerDay)) >= 0 ? (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {Math.abs(calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(finalComparisonMetrics.avgRedemptionsPerDay)) || 0).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 p-6 rounded-lg shadow-sm border border-purple-200 dark:border-purple-800/30 hover:shadow-md transition-shadow duration-200 cursor-pointer group" title="Date range and duration of the current filter selection">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Time Period</h3>
          <p className="text-md font-medium text-purple-600 dark:text-purple-400">
            {metrics.uniqueDates && metrics.uniqueDates.length > 0 ? 
              `${metrics.uniqueDates[0]} to ${metrics.uniqueDates[metrics.uniqueDates.length - 1]}` :
              "No date range"
            }
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{metrics.daysInRange} days</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 p-6 rounded-lg shadow-sm border border-green-200 dark:border-green-800/30 hover:shadow-md transition-shadow duration-200 cursor-pointer group" title="Performance trend comparing the last 7 days to the previous 7 days">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Trend (Last 7 Days)</h3>
          {trendData ? (
            <div>
              <div className="flex items-center">
                <p className={`text-lg font-bold ${trendData.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {trendData.direction === 'up' ? (
                    <svg className="h-5 w-5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {Math.abs(trendData.change || 0).toFixed(1)}%
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
      
      {/* Campaign/Yearly Comparison Section */}
      {(comparisonSettings.mode === 'campaigns' || comparisonSettings.mode === 'yearly') && campaignComparisonMetrics && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {comparisonSettings.mode === 'yearly' ? 'Yearly Comparison' : 'Campaign Comparison'}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {comparisonSettings.mode === 'yearly' ? (
                <span className="flex items-center">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 mr-2">
                    {getYearLabels().A}
                  </span>
                  vs
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ml-2">
                    {getYearLabels().B}
                  </span>
                </span>
              ) : (
                `${campaigns[comparisonSettings.primaryDataset]?.metadata?.name || `Campaign ${comparisonSettings.primaryDataset}`} vs ${campaigns[comparisonSettings.primaryDataset === 'A' ? 'B' : 'A']?.metadata?.name || `Campaign ${comparisonSettings.primaryDataset === 'A' ? 'B' : 'A'}`}`
              )}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Redemptions</h4>
                <div className="flex items-center justify-center">
                  <div className="text-center mr-4">
                    <p className="text-lg font-bold text-pink-600 dark:text-pink-400">{metrics.totalUnits.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Primary</p>
                  </div>
                  <div className="text-2xl text-gray-300 dark:text-gray-600">vs</div>
                  <div className="text-center ml-4">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{campaignComparisonMetrics.totalUnits.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Comparison</p>
                  </div>
                </div>
                <div className={`mt-2 text-sm font-medium flex items-center justify-center ${
                  calculateChange(metrics.totalUnits, campaignComparisonMetrics.totalUnits) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {calculateChange(metrics.totalUnits, campaignComparisonMetrics.totalUnits) >= 0 ? (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {Math.abs(calculateChange(metrics.totalUnits, campaignComparisonMetrics.totalUnits) || 0).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Daily Average</h4>
                <div className="flex items-center justify-center">
                  <div className="text-center mr-4">
                    <p className="text-lg font-bold text-pink-600 dark:text-pink-400">{metrics.avgRedemptionsPerDay}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Primary</p>
                  </div>
                  <div className="text-2xl text-gray-300 dark:text-gray-600">vs</div>
                  <div className="text-center ml-4">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{campaignComparisonMetrics.avgRedemptionsPerDay}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Comparison</p>
                  </div>
                </div>
                <div className={`mt-2 text-sm font-medium flex items-center justify-center ${
                  calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(campaignComparisonMetrics.avgRedemptionsPerDay)) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(campaignComparisonMetrics.avgRedemptionsPerDay)) >= 0 ? (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {Math.abs(calculateChange(parseFloat(metrics.avgRedemptionsPerDay), parseFloat(campaignComparisonMetrics.avgRedemptionsPerDay)) || 0).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Duration</h4>
                <div className="flex items-center justify-center">
                  <div className="text-center mr-4">
                    <p className="text-lg font-bold text-pink-600 dark:text-pink-400">{metrics.daysInRange}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Primary</p>
                  </div>
                  <div className="text-2xl text-gray-300 dark:text-gray-600">vs</div>
                  <div className="text-center ml-4">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{campaignComparisonMetrics.daysInRange}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Comparison</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Days in campaign</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Charts Section - only show if data is available */}
      {topRetailers.length > 0 && dayDistribution.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Retailers Mini Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Top Retailers
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Click to explore
                </span>
              </h3>
              <div className="h-60">
                <ChartErrorBoundary darkMode={darkMode}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart onClick={handlePieClick}>
                      <Pie
                        data={topRetailers}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                        onClick={handlePieClick}
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
                              fontSize={10}
                              fontWeight="bold"
                            >
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          ) : null;
                        }}
                      >
                        {topRetailers.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors.colorPalette[index % colors.colorPalette.length]} 
                            stroke="#fff"
                            strokeWidth={1}
                            className="hover:opacity-80 cursor-pointer transition-opacity duration-200"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              </div>
            </div>
          
          {/* Day of Week Mini Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Day of Week Distribution
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Hover for details
              </span>
            </h3>
            <div className="h-60">
              <ChartErrorBoundary darkMode={darkMode}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                  data={dayDistribution}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 35, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.gridColor} />
                  <XAxis 
                    type="number" 
                    tick={{ fill: colors.textSecondary, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    scale="band" 
                    tick={{ fontSize: 11, fill: colors.textSecondary }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    content={<BarChartTooltip />}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill={colors.secondary}
                    radius={[0, 3, 3, 0]}
                    barSize={16}
                    onClick={handleBarClick}
                    className="hover:opacity-80 cursor-pointer transition-opacity duration-200"
                  >
                    {dayDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`rgba(59, 130, 246, ${0.5 + (entry.percentage / 100) * 0.5})`}
                        opacity={darkMode ? 0.8 : 1}
                      />
                    ))}
                  </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* Repurchase Intent Section - Always show if we have products */}
      {filteredData && filteredData.length > 0 && (
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <svg className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Repurchase Intent
                </h3>
                {repurchaseIntentData.some(p => p.hasRepurchaseData) && (
                  <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                    Survey Data Available
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {repurchaseIntentData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">
                    <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <p className="text-sm">No product data available for repurchase analysis</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {repurchaseIntentData.slice(0, 6).map((product, index) => (
                    <div key={product.name} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 mr-2">
                          {product.displayName}
                        </h4>
                        {product.repurchaseIntentRate !== null ? (
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            product.repurchaseIntentRate >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            product.repurchaseIntentRate >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {product.repurchaseIntentRate.toFixed(1)}%
                          </div>
                        ) : (
                          <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                            No Data
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>{product.totalResponses} responses</span>
                        {product.repurchaseResponses > 0 && (
                          <span>{product.repurchaseResponses} survey responses</span>
                        )}
                      </div>
                      {!product.hasRepurchaseData && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                          Survey data not available for this product
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {repurchaseIntentData.length > 6 && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Showing top 6 products. View Demographics tab for full repurchase analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

SummaryTab.displayName = 'SummaryTab';

export default SummaryTab;
