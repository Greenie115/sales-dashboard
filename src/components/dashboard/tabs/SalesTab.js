import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../../context/DataContext'; // Provides raw salesData
import { useFilter } from '../../../context/FilterContext'; // Provides filter state
import { useTheme } from '../../../context/ThemeContext';
import { useChartColors } from '../../../utils/chartColors';
import { formatCurrency } from '../../../utils/formatUtils';
import groupBy from 'lodash/groupBy';
import {
  filterSalesData,
  calculateMetrics,
  getRetailerDistribution,
  getProductDistribution,
  calculateRepurchaseIntent
} from '../../../utils/dataProcessing'; // Import centralized functions
import {
  calculateMovingAverage
} from '../../../utils/advancedAnalytics';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ComposedChart, Line, Area
} from 'recharts';
import CalculationErrorBoundary from '../../common/CalculationErrorBoundary';
import DateExclusionPanel from '../../filters/DateExclusionPanel';
import ChartErrorBoundary from '../../common/ChartErrorBoundary';

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  const { darkMode } = useTheme();
  
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
            <span className="inline-block w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: {typeof entry.value === 'number' && entry.name?.toLowerCase().includes('revenue') ? formatCurrency(entry.value, 'table') : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const SalesTab = ({ isSharedView = false }) => {
  const { darkMode } = useTheme();
  
  // Add state for interactive elements
  const [activeRetailer, setActiveRetailer] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [redemptionTimeframe, setRedemptionTimeframe] = useState('daily');
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  const [movingAverageWindow, setMovingAverageWindow] = useState(7);
  
  // Initialize excludedDates with empty array
  const [excludedDates, setExcludedDates] = useState([]);
  
  // Use data contexts
  const dataContext = useData(); // Get raw data context
  const filterContext = useFilter(); // Get filter context
  const filterState = filterContext?.filters || {}; // Safe access to filters
  
  // Get chart colors
  const colors = useChartColors();
  
  // Destructure necessary raw data and state from DataContext
  const {
    salesData: rawSalesData,
    brandMapping = {},
    campaigns,
    comparisonSettings,
    canCompare,
    getCampaignMetadata
  } = dataContext || {};
  
  // Get active dataset for primary analysis
  const activeDataset = useMemo(() => {
    if (comparisonSettings?.mode === 'campaigns' && canCompare) {
      return campaigns[comparisonSettings.primaryDataset]?.data || [];
    }
    return rawSalesData || [];
  }, [rawSalesData, campaigns, comparisonSettings, canCompare]);

  // Get comparison dataset for dual display
  const comparisonDataset = useMemo(() => {
    if (comparisonSettings?.mode === 'campaigns' && canCompare) {
      const otherCampaign = comparisonSettings.primaryDataset === 'A' ? 'B' : 'A';
      return campaigns[otherCampaign]?.data || [];
    }
    return [];
  }, [campaigns, comparisonSettings, canCompare]);

  // Calculate filteredData using useMemo
  const filteredData = useMemo(() => {
    try {
      if (!activeDataset || !Array.isArray(activeDataset) || !filterState) return [];
      return filterSalesData(activeDataset, filterState);
    } catch (error) {
      console.error('Error filtering sales data:', error);
      return [];
    }
  }, [activeDataset, filterState]);

  // Calculate filtered comparison data
  const filteredComparisonData = useMemo(() => {
    try {
      if (!comparisonDataset || !Array.isArray(comparisonDataset) || !filterState || comparisonSettings?.mode !== 'campaigns') return [];
      return filterSalesData(comparisonDataset, filterState);
    } catch (error) {
      console.error('Error filtering comparison data:', error);
      return [];
    }
  }, [comparisonDataset, filterState, comparisonSettings]);
  
  // Calculate metrics using useMemo
  const metrics = useMemo(() => {
    try {
      if (!filteredData || !Array.isArray(filteredData) || filteredData.length === 0) {
        return null;
      }
      return calculateMetrics(filteredData);
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return null;
    }
  }, [filteredData]);

  // Calculate comparison metrics
  const comparisonMetrics = useMemo(() => {
    try {
      if (!filteredComparisonData || !Array.isArray(filteredComparisonData) || filteredComparisonData.length === 0) {
        return null;
      }
      return calculateMetrics(filteredComparisonData);
    } catch (error) {
      console.error('Error calculating comparison metrics:', error);
      return null;
    }
  }, [filteredComparisonData]);
  
  // Calculate retailerData using useMemo
  const retailerData = useMemo(() => {
    try {
      if (!filteredData || !Array.isArray(filteredData) || filteredData.length === 0) {
        return [];
      }
      return getRetailerDistribution(filteredData);
    } catch (error) {
      console.error('Error calculating retailer distribution:', error);
      return [];
    }
  }, [filteredData]);

  // Calculate comparison retailer data
  const comparisonRetailerData = useMemo(() => {
    try {
      if (!filteredComparisonData || !Array.isArray(filteredComparisonData) || filteredComparisonData.length === 0) {
        return [];
      }
      return getRetailerDistribution(filteredComparisonData);
    } catch (error) {
      console.error('Error calculating comparison retailer distribution:', error);
      return [];
    }
  }, [filteredComparisonData]);

  // Safely add handlers for date exclusion
  const handleAddExcludedDate = (date) => {
    if (!excludedDates.includes(date)) {
      setExcludedDates([...excludedDates, date]);
    }
  };

  const handleRemoveExcludedDate = (date) => {
    setExcludedDates(excludedDates.filter(d => d !== date));
  };

  // This function safely applies date exclusions to the chart data
  const applyDateExclusions = (data) => {
    // Safety checks - ensure both data and excludedDates are arrays
    if (!data || !Array.isArray(data)) return [];
    if (!excludedDates || !Array.isArray(excludedDates) || excludedDates.length === 0) return data;
    
    try {
      // Create a Set for efficient lookups
      const excludeDatesSet = new Set(excludedDates);
      
      // Filter out excluded dates safely
      return data.filter(item => {
        // Skip any non-object items
        if (!item || typeof item !== 'object') return true;
        
        // If no name property, keep the item
        if (!item.name) return true;
        
        // For daily timeframe
        if (redemptionTimeframe === 'daily' && typeof item.name === 'string') {
          return !excludeDatesSet.has(item.name);
        }
        
        // Return true for any other case
        return true;
      });
    } catch (error) {
      console.error("Error in applyDateExclusions:", error);
      // Return original data on error
      return data;
    }
  };
  
  const exportSalesData = () => {
    try {
      // Create CSV content
      let csvContent = 'Sales Analysis Report\n\n';
      
      // Add date range
      if (metrics && metrics.uniqueDates && metrics.uniqueDates.length > 0) {
        csvContent += `Date Range: ${metrics.uniqueDates[0]} to ${metrics.uniqueDates[metrics.uniqueDates.length - 1]}\n`;
        csvContent += `Total Days: ${metrics.daysInRange}\n`;
      }
      
      // Add key metrics
      if (metrics) {
        csvContent += `Total Redemptions: ${metrics.totalUnits}\n`;
        csvContent += `Average Per Day: ${metrics.avgRedemptionsPerDay}\n\n`;
      }
      
      // Fixed: Use retailerData from useMemo below instead of retailerDataFromContext
      if (retailerData && retailerData.length > 0) {
        csvContent += 'Retailer Distribution\n';
        csvContent += 'Retailer,Units,Percentage\n';
        
        retailerData.forEach(item => {
          csvContent += `"${item.name}",${item.value},${item.percentage.toFixed(1)}%\n`;
        });
        
        csvContent += '\n';
      }
      
      // Add product distribution
      if (productDistribution && productDistribution.length > 0) {
        csvContent += 'Product Distribution\n';
        csvContent += 'Product,Units,Percentage\n';
        
        productDistribution.forEach(item => {
          csvContent += `"${item.displayName || item.name}",${item.count},${item.percentage.toFixed(1)}%\n`;
        });
        
        csvContent += '\n';
      }
      
      // Add product distribution by retailer
      if (filteredData && filteredData.length > 0 && productDistribution && productDistribution.length > 0) {
        csvContent += 'Product Distribution by Retailer\n';
        
        // Process each product
        productDistribution.forEach(product => {
          csvContent += `\n"${product.displayName || product.name}" (Total: ${product.count})\n`;
          csvContent += 'Retailer,Units,Percentage of Product Sales\n';
          
          // Get all records for this product
          const productItems = filteredData.filter(item => item.product_name === product.name);
          
          // Group by retailer
          const retailerGroups = groupBy(productItems, 'chain');
          
          // Calculate and sort by count
          const retailerBreakdown = Object.entries(retailerGroups)
            .map(([retailer, items]) => ({
              retailer: retailer || 'Unknown',
              count: items.length,
              percentage: (items.length / productItems.length) * 100
            }))
            .sort((a, b) => b.count - a.count);
          
          // Add to CSV
          retailerBreakdown.forEach(item => {
            csvContent += `"${item.retailer}",${item.count},${item.percentage.toFixed(1)}%\n`;
          });
        });
      }
      
      // Create download link
      const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'Sales_Analysis_Report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting sales data:', error);
      alert('An error occurred while exporting data. Please try again.');
    }
  };
  
  // retailerData is now calculated above using useMemo
  
  // Get product distribution
  // Calculate productDistribution using useMemo
  const productDistribution = useMemo(() => {
    try {
      if (!filteredData || !Array.isArray(filteredData) || filteredData.length === 0) {
        return [];
      }
      return getProductDistribution(filteredData, brandMapping || {});
    } catch (error) {
      console.error('Error calculating product distribution:', error);
      return [];
    }
  }, [filteredData, brandMapping]);

  // Repurchase intent for products
  const repurchaseIntentData = useMemo(() => {
    try {
      if (!filteredData || !Array.isArray(filteredData) || filteredData.length === 0) {
        return [];
      }
      return calculateRepurchaseIntent(filteredData, brandMapping || {});
    } catch (error) {
      console.error('Error calculating repurchase intent:', error);
      return [];
    }
  }, [filteredData, brandMapping]);
  
  // Get redemptions over time with improved time handling
  const redemptionsOverTime = useMemo(() => {
    try {
      if (!filteredData || !Array.isArray(filteredData) || filteredData.length === 0) return [];
      
      // Prepare date formatter with safety checks
      const formatDate = (date) => {
        try {
          if (!date || isNaN(date.getTime())) return null;
          
          switch(redemptionTimeframe) {
            case 'hourly':
              return `${date.getHours()}:00`;
            case 'daily':
              return date.toISOString().split('T')[0];
            case 'weekly':
              // Get week start (Sunday)
              const weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay());
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              return `${weekStart.toISOString().split('T')[0]} - ${weekEnd.toISOString().split('T')[0]}`;
            case 'monthly':
              return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            default:
              return date.toISOString().split('T')[0];
          }
        } catch (error) {
          console.error("Error formatting date:", error);
          return null;
        }
      };
      
      // Generate all dates in range for the selected timeframe
      const dateMap = {};
      
      // Determine date range based on filter context or data range with safety checks
      let minDateStr, maxDateStr;
      if (filterState && filterState.dateRange === 'custom' && filterState.startDate && filterState.endDate) {
          minDateStr = filterState.startDate;
          maxDateStr = filterState.endDate;
      } else if (metrics && metrics.uniqueDates && Array.isArray(metrics.uniqueDates) && metrics.uniqueDates.length > 0) {
          // Fallback to data range if not custom
          minDateStr = metrics.uniqueDates[0];
          maxDateStr = metrics.uniqueDates[metrics.uniqueDates.length - 1];
      }

      if (!minDateStr || !maxDateStr) {
        // Fallback: extract dates from data directly
        const dates = filteredData
          .map(item => item.receipt_date)
          .filter(date => date && typeof date === 'string')
          .sort();
        
        if (dates.length === 0) return [];
        
        minDateStr = dates[0];
        maxDateStr = dates[dates.length - 1];
      }

      const minDate = new Date(minDateStr);
      const maxDate = new Date(maxDateStr);
      
      // Validate dates
      if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) {
        console.warn("Invalid date range for redemptions over time");
        return [];
      }
      
      // Create date range with safety limits
      const currentDate = new Date(minDate);
      let iterations = 0;
      const maxIterations = 1000; // Prevent infinite loops
      
      while (currentDate <= maxDate && iterations < maxIterations) {
        const key = formatDate(currentDate);
        if (key) {
          dateMap[key] = 0;
        }
        
        // Increment based on timeframe
        switch(redemptionTimeframe) {
          case 'hourly':
            currentDate.setHours(currentDate.getHours() + 1);
            break;
          case 'daily':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          default:
            currentDate.setDate(currentDate.getDate() + 1);
        }
        iterations++;
      }
      
      // Count redemptions for each time period
      filteredData.forEach(item => {
        if (!item || !item.receipt_date) return;
        
        try {
          const date = new Date(item.receipt_date);
          if (isNaN(date.getTime())) return;
          
          const key = formatDate(date);
          if (key && dateMap[key] !== undefined) {
            dateMap[key] += 1;
          }
        } catch (error) {
          console.error("Error processing item date:", error);
        }
      });
      
      // Convert to array format for charts
      const result = Object.entries(dateMap)
        .map(([name, count]) => ({ name, count }))
        .filter(item => item.name); // Remove invalid entries
      
      // Sort by date with error handling
      return result.sort((a, b) => {
        try {
          // For hourly data, sort by hour number
          if (redemptionTimeframe === 'hourly') {
            const hourA = parseInt(a.name.split(':')[0]);
            const hourB = parseInt(b.name.split(':')[0]);
            return hourA - hourB;
          }
          // For other formats, sort by string comparison
          return a.name.localeCompare(b.name);
        } catch (error) {
          console.error("Error sorting redemptions data:", error);
          return 0;
        }
      });
    } catch (error) {
      console.error("Error generating redemptions over time:", error);
      return [];
    }
  }, [filteredData, redemptionTimeframe, filterState, metrics]);
  
  // Enhanced time series data with moving averages
  const timeSeriesWithMA = useMemo(() => {
    if (!redemptionsOverTime || !Array.isArray(redemptionsOverTime) || redemptionsOverTime.length === 0) {
      return [];
    }
    
    // Add moving averages to the time series data
    return calculateMovingAverage(redemptionsOverTime.map(item => ({
      ...item,
      value: item.count // Map count to value for the analytics function
    })), movingAverageWindow).map(item => ({
      ...item,
      count: item.value, // Map back to count
      movingAverage: item.movingAverage
    }));
  }, [redemptionsOverTime, movingAverageWindow]);
  
  
  // Calculate trend line
  const trendLineData = useMemo(() => {
    try {
      if (!redemptionsOverTime || !Array.isArray(redemptionsOverTime) || redemptionsOverTime.length < 7) return [];
      
      const result = [];
      const window = 7; // 7-day moving average
      
      for (let i = 0; i < redemptionsOverTime.length; i++) {
        const currentItem = redemptionsOverTime[i];
        if (!currentItem || typeof currentItem.count !== 'number') continue;
        
        if (i < window - 1) {
          // Not enough data points yet for the window
          result.push({
            name: currentItem.name,
            trend: null
          });
        } else {
          // Calculate average of last 'window' points
          let sum = 0;
          let validPoints = 0;
          
          for (let j = 0; j < window; j++) {
            const pastItem = redemptionsOverTime[i - j];
            if (pastItem && typeof pastItem.count === 'number') {
              sum += pastItem.count;
              validPoints++;
            }
          }
          
          result.push({
            name: currentItem.name,
            trend: validPoints > 0 ? sum / validPoints : null
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error calculating trend line:", error);
      return [];
    }
  }, [redemptionsOverTime]);
  
  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const filteredRedemptionsData = useMemo(() => {
    return applyDateExclusions(timeSeriesWithMA);
  }, [timeSeriesWithMA, excludedDates, applyDateExclusions]);
  
  // Handle empty data
  if (!filteredData || filteredData.length === 0 || !metrics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No sales data available</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Please upload an items_purchased.CSV file for sales data.</p>
        </div>
      </div>
    );
  }
  
  // Format X-axis ticks for better display
  const formatXAxisTick = (value) => {
    if (!value) return '';
    
    // For daily data, show shortened dates
    if (redemptionTimeframe === 'daily') {
      try {
        const date = new Date(value);
        if (isNaN(date)) return value;
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short'
        });
      } catch (e) {
        return value;
      }
    }
    
    // For weekly data, show just the start date
    if (redemptionTimeframe === 'weekly' && value.includes(' - ')) {
      const startDate = value.split(' - ')[0];
      try {
        const date = new Date(startDate);
        if (isNaN(date)) return value;
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short'
        });
      } catch (e) {
        return value;
      }
    }
    
    // For monthly data, format as "Jan 2023"
    if (redemptionTimeframe === 'monthly' && value.includes('-')) {
      try {
        const [year, month] = value.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        if (isNaN(date)) return value;
        return date.toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric'
        });
      } catch (e) {
        return value;
      }
    }
    
    return value;
  };
  
  // Calculate dynamic interval for X-axis based on number of data points
  const calculateXAxisInterval = (dataLength) => {
    if (dataLength <= 10) return 0; // Show all ticks
    if (dataLength <= 20) return 1; // Show every 2nd tick
    if (dataLength <= 60) return 2; // Show every 3rd tick
    if (dataLength <= 90) return 4; // Show every 5th tick
    if (dataLength <= 180) return 9; // Show every 10th tick
    return 14; // Show every 15th tick for large datasets
  };
      
  return (
    <div className="overflow-hidden">
      {/* Key Metrics Cards */}
      <div>
        {/* Title Bar with Export Button */}
        <div className="flex justify-end items-center mb-6">
          <button
            onClick={exportSalesData}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-800 rounded-md shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Data
          </button>
        </div>
      </div>
      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">Total Revenue</h3>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {formatCurrency(metrics?.totalRevenue || 0, 'whole')}
              </p>
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">Total Transactions</h3>
              <p className="text-lg font-bold text-pink-600 dark:text-pink-400 truncate">{(metrics?.totalUnits || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Average Transaction Value */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">Avg Transaction</h3>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 truncate">
                {formatCurrency(metrics?.avgTransactionValue || 0, 'precise')}
              </p>
            </div>
          </div>
        </div>

        {/* Unique Customers */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">Unique Customers</h3>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400 truncate">{(metrics?.uniqueCustomers || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Revenue Per Customer */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">Revenue/Customer</h3>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400 truncate">
                {formatCurrency(metrics?.avgRevenuePerCustomer || 0, 'precise')}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Average Revenue */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">Daily Revenue</h3>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 truncate">
                {formatCurrency(metrics?.avgRevenuePerDay || 0, 'whole')}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Retailer and Product Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Retailer Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Retailer Distribution
              {comparisonSettings?.mode === 'campaigns' && canCompare && (
                <div className="ml-3 flex items-center space-x-1">
                  <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                  <span className="text-xs text-gray-500">A</span>
                  <span className="w-3 h-3 rounded-full bg-blue-500 ml-2"></span>
                  <span className="text-xs text-gray-500">B</span>
                </div>
              )}
            </h3>
          </div>
          
          <div className="h-80 overflow-hidden">
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height="100%">
                {comparisonSettings?.mode === 'campaigns' && canCompare && filteredComparisonData.length > 0 ? (
                  // Comparison mode - show side-by-side bar chart
                  <BarChart data={(() => {
                    // Combine retailer data from both campaigns
                    const combinedData = [];
                    const allRetailers = new Set([
                      ...retailerData.map(r => r.name),
                      ...comparisonRetailerData.map(r => r.name)
                    ]);
                    
                    allRetailers.forEach(retailer => {
                      const dataA = retailerData.find(r => r.name === retailer) || { value: 0 };
                      const dataB = comparisonRetailerData.find(r => r.name === retailer) || { value: 0 };
                      combinedData.push({
                        name: retailer.length > 12 ? retailer.substring(0, 12) + '...' : retailer,
                        campaignA: dataA.value,
                        campaignB: dataB.value
                      });
                    });
                    
                    return combinedData.sort((a, b) => (b.campaignA + b.campaignB) - (a.campaignA + a.campaignB)).slice(0, 8);
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: darkMode ? '#9CA3AF' : '#6B7280' }}
                      stroke={darkMode ? '#6B7280' : '#9CA3AF'}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: darkMode ? '#9CA3AF' : '#6B7280' }}
                      stroke={darkMode ? '#6B7280' : '#9CA3AF'}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="campaignA" fill="#EC4899" name={`Campaign ${comparisonSettings.primaryDataset}`} />
                    <Bar dataKey="campaignB" fill="#3B82F6" name={`Campaign ${comparisonSettings.primaryDataset === 'A' ? 'B' : 'A'}`} />
                  </BarChart>
                ) : (
                  // Single mode - show pie chart
                  <PieChart>
                    <Pie
                      data={Array.isArray(retailerData) ? retailerData : []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      innerRadius={60}
                      paddingAngle={2}
                      onMouseEnter={(data, index) => setActiveRetailer(index)}
                      onMouseLeave={() => setActiveRetailer(null)}
                      label={({ name, percent }) => 
                        percent > 0.05 ? `${name.length > 12 ? name.substring(0, 12) + '...' : name}: ${(percent * 100).toFixed(1)}%` : ''
                      }
                      labelLine={false}
                    >
                      {Array.isArray(retailerData) && retailerData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={colors.colorPalette[index % colors.colorPalette.length]}
                          stroke={darkMode ? "#374151" : "#fff"}
                          strokeWidth={1}
                          style={{
                            opacity: activeRetailer === null || activeRetailer === index ? 1 : 0.6,
                            filter: activeRetailer === index ? 'drop-shadow(0px 0px 4px rgba(0,0,0,0.2))' : 'none',
                            transition: 'opacity 300ms, filter 300ms'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ paddingLeft: '30px' }}
                      iconType="circle"
                      onMouseEnter={(data, index) => setActiveRetailer(index)}
                      onMouseLeave={() => setActiveRetailer(null)}
                      formatter={(value, entry, index) => (
                        <span className={`text-sm ${activeRetailer === index ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </div>
          
          <div className="mt-4 overflow-auto max-h-64">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Retailer</th>
                  {comparisonSettings?.mode === 'campaigns' && canCompare ? (
                    <>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-pink-600 dark:text-pink-400 uppercase tracking-wider">Campaign A</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Campaign B</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Difference</th>
                    </>
                  ) : (
                    <>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Revenue</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Avg Value</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {comparisonSettings?.mode === 'campaigns' && canCompare ? (
                  // Comparison table
                  (() => {
                    const allRetailers = new Set([
                      ...retailerData.map(r => r.name),
                      ...comparisonRetailerData.map(r => r.name)
                    ]);
                    
                    return Array.from(allRetailers).map((retailer, index) => {
                      const dataA = retailerData.find(r => r.name === retailer) || { value: 0, revenue: 0 };
                      const dataB = comparisonRetailerData.find(r => r.name === retailer) || { value: 0, revenue: 0 };
                      const diff = dataA.value - dataB.value;
                      
                      return (
                        <tr key={retailer} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{retailer}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-pink-600 dark:text-pink-400 text-right">{dataA.value.toLocaleString()}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 text-right">{dataB.value.toLocaleString()}</td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                          </td>
                        </tr>
                      );
                    }).slice(0, 10);
                  })()
                ) : (
                  // Single mode table
                  Array.isArray(retailerData) && retailerData.map((retailer, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.colorPalette[index % colors.colorPalette.length] }}></div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{retailer.name || 'Unknown'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                        {formatCurrency(retailer.revenue || 0, 'table')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{(retailer.value || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                        {formatCurrency(retailer.avgTransactionValue || 0, 'table')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Top Products
            </h3>
          </div>
          
          {productDistribution && productDistribution.length > 0 ? (
            <>
              <div className="h-96">
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Array.isArray(productDistribution) ? productDistribution.slice(0, 10).map(item => ({
                          ...item,
                          name: item.displayName || item.name || 'Unknown'
                        })) : []}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={60}
                        paddingAngle={2}
                        onMouseEnter={(data, index) => setActiveProduct(index)}
                        onMouseLeave={() => setActiveProduct(null)}
                        label={({ name, percent }) => 
                          percent > 0.05 ? `${name && name.length > 15 ? name.substring(0, 15) + '...' : name}: ${(percent * 100).toFixed(1)}%` : ''
                        }
                        labelLine={false}
                      >
                        {Array.isArray(productDistribution) && productDistribution.slice(0, 10).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors.colorPalette[index % colors.colorPalette.length]}
                            stroke={darkMode ? "#374151" : "#fff"}
                            strokeWidth={1}
                            style={{
                              opacity: activeProduct === null || activeProduct === index ? 1 : 0.6,
                              filter: activeProduct === index ? 'drop-shadow(0px 0px 4px rgba(0,0,0,0.2))' : 'none',
                              transition: 'opacity 300ms, filter 300ms'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ paddingLeft: '30px' }}
                        iconType="circle"
                        onMouseEnter={(data, index) => setActiveProduct(index)}
                        onMouseLeave={() => setActiveProduct(null)}
                        formatter={(value, entry, index) => (
                          <span className={`text-sm ${activeProduct === index ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            {value && value.length > 20 ? value.substring(0, 20) + '...' : value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              </div>
              
              <div className="mt-4 overflow-auto max-h-64">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Units</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {productDistribution.slice(0, 10).map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.colorPalette[index % colors.colorPalette.length] }}></div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{product.displayName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{product.count.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{product.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500 dark:text-gray-400">No product data available</p>
            </div>
          )}
        </div>
      </div>
      
   {/* Redemptions Over Time */}
   {redemptionsOverTime && redemptionsOverTime.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center mb-4 sm:mb-0">
              <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Redemptions Over Time
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timeframe</label>
                <select
                  value={redemptionTimeframe}
                  onChange={(e) => setRedemptionTimeframe(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex items-end space-x-6">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={showTrendLine}
                    onChange={(e) => setShowTrendLine(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 h-4 w-4 dark:bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Show Trend Line</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={showMovingAverage}
                    onChange={(e) => setShowMovingAverage(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 h-4 w-4 dark:bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Moving Average</span>
                </label>
                {showMovingAverage && (
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">Window:</label>
                    <select
                      value={movingAverageWindow}
                      onChange={(e) => setMovingAverageWindow(parseInt(e.target.value))}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="h-80 overflow-hidden">
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={Array.isArray(filteredRedemptionsData) ? filteredRedemptionsData : []}
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                <defs>
                  <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.gridColor} />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12, fill: colors.textSecondary }}
                  tickFormatter={formatXAxisTick}
                  interval={calculateXAxisInterval(redemptionsOverTime.length)}
                  tickLine={false}
                  axisLine={{ stroke: colors.axisColor }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: colors.textSecondary }}
                  tickLine={false}
                  axisLine={{ stroke: colors.axisColor }}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', color: colors.textPrimary }} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Redemptions" 
                  fill="url(#colorRedemptions)" 
                  stroke={colors.primary}
                  strokeWidth={2} 
                  dot={{ stroke: colors.primary, strokeWidth: 2, r: 4, fill: colors.tooltipBg }}
                  activeDot={{ stroke: colors.primary, strokeWidth: 2, r: 6, fill: colors.tooltipBg }}
                />
                {showTrendLine && Array.isArray(trendLineData) && trendLineData.length > 0 && trendLineData.some(item => item && typeof item.trend === 'number') && (
                  <Line
                    type="monotone"
                    dataKey="trend"
                    name="Trend (7-day MA)"
                    stroke={colors.secondary}
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                  />
                )}
                {showMovingAverage && Array.isArray(timeSeriesWithMA) && timeSeriesWithMA.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey="movingAverage"
                    name={`${movingAverageWindow}-day Moving Average`}
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4, fill: "#10B981", stroke: "#059669", strokeWidth: 2 }}
                    strokeDasharray="5 5"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            </ChartErrorBoundary>
          </div>
          
          {/* Excluded dates notice */}
          {Array.isArray(excludedDates) && excludedDates.length > 0 && (
            <div className={`mt-2 text-xs italic ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {excludedDates.length} date{excludedDates.length !== 1 ? 's' : ''} excluded from chart data.
            </div>
          )}

          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <div>Total points: {Array.isArray(redemptionsOverTime) ? redemptionsOverTime.length : 0}</div>
              <div>
                Average: {Array.isArray(redemptionsOverTime) && redemptionsOverTime.length > 0 
                  ? (redemptionsOverTime.reduce((sum, item) => sum + (item?.count || 0), 0) / redemptionsOverTime.length).toFixed(1)
                  : '0.0'} redemptions/{redemptionTimeframe}
              </div>
            </div>
          </div>
          
          {/* Date Exclusion Panel */}
          <DateExclusionPanel
            excludedDates={excludedDates || []}
            onAddDate={handleAddExcludedDate}
            onRemoveExcludedDate={handleRemoveExcludedDate}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8 flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">No time series data available</p>
        </div>
      )}

    </div>
  );
};


export default SalesTab;