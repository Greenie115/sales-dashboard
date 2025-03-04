import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ComposedChart, Line, Area
} from 'recharts';
import _ from 'lodash';

// Custom color palette
const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800', '#607D8B', '#673AB7', '#3F51B5'];

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

const SalesTab = () => {
  const { 
    getFilteredData, 
    calculateMetrics, 
    brandMapping = {}, 
    brandNames = [],
    dateRange = 'all',
    startDate,
    endDate
  } = useData();
  
  // Local state
  const [redemptionTimeframe, setRedemptionTimeframe] = useState('daily');
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [activeRetailer, setActiveRetailer] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  
  // Get filtered data
  const filteredData = useMemo(() => {
    return getFilteredData ? getFilteredData() : [];
  }, [getFilteredData]);
  
  // Get metrics
  const metrics = useMemo(() => {
    return calculateMetrics ? calculateMetrics() : null;
  }, [calculateMetrics]);
  
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
      
      // Add retailer distribution
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
          const retailerGroups = _.groupBy(productItems, 'chain');
          
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
  // Get retailer distribution
  const retailerData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    const groupedByRetailer = _.groupBy(filteredData, 'chain');
    const totalUnits = filteredData.length;
    
    return Object.entries(groupedByRetailer)
      .map(([chain, items]) => ({
        name: chain || 'Unknown',
        value: items.length,
        percentage: (items.length / totalUnits) * 100
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);
  
  // Get product distribution
  const productDistribution = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    try {
      const groupedByProduct = _.groupBy(filteredData, 'product_name');
      const totalUnits = filteredData.length;
      
      return Object.entries(groupedByProduct)
        .map(([product, items]) => {
          // Use the mapping to get display name if available
          const productInfo = brandMapping[product] || { displayName: product };
          let displayName = productInfo.displayName || product;
          
          // Fallback: If display name is still the full product name, trim it
          if (displayName === product) {
            const words = displayName.split(' ');
            if (words.length >= 3) {
              const wordsToRemove = words.length >= 5 ? 2 : 1;
              displayName = words.slice(wordsToRemove).join(' ');
            }
          }
          
          return {
            name: product,
            displayName,
            brandName: productInfo.brandName || '',
            count: items.length,
            percentage: (items.length / totalUnits) * 100
          };
        })
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error("Error getting product distribution:", error);
      return [];
    }
  }, [filteredData, brandMapping]);

  
  // Get redemptions over time with improved time handling
  const redemptionsOverTime = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    try {
      // Prepare date formatter
      const formatDate = (date) => {
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
      };
      
      // Generate all dates in range for the selected timeframe
      const dateMap = {};
      
      // Ensure we have valid start and end dates
      let minDate, maxDate;
      
      if (dateRange === 'custom' && startDate && endDate) {
        minDate = new Date(startDate);
        maxDate = new Date(endDate);
      } else {
        // Use the full range from the data
        const dates = filteredData
          .filter(item => item.receipt_date)
          .map(item => new Date(item.receipt_date))
          .filter(date => !isNaN(date.getTime()));
        
        minDate = new Date(Math.min(...dates));
        maxDate = new Date(Math.max(...dates));
      }
      
      // Create date range
      if (!isNaN(minDate.getTime()) && !isNaN(maxDate.getTime())) {
        const currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
          const key = formatDate(currentDate);
          dateMap[key] = 0;
          
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
        }
      }
      
      // Count redemptions for each time period
      filteredData.forEach(item => {
        if (!item.receipt_date) return;
        
        try {
          const date = new Date(item.receipt_date);
          if (isNaN(date.getTime())) return;
          
          const key = formatDate(date);
          if (dateMap[key] !== undefined) {
            dateMap[key] += 1;
          }
        } catch (error) {
          console.error("Error processing date:", error);
        }
      });
      
      // Convert to array format for charts
      const result = Object.entries(dateMap).map(([name, count]) => ({ name, count }));
      
      // Sort by date
      return result.sort((a, b) => {
        // For hourly data, sort by hour number
        if (redemptionTimeframe === 'hourly') {
          return parseInt(a.name) - parseInt(b.name);
        }
        // For other formats, sort by string comparison
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error("Error generating redemptions over time:", error);
      return [];
    }
  }, [filteredData, redemptionTimeframe, dateRange, startDate, endDate]);
  
  // Calculate trend line
  const trendLineData = useMemo(() => {
    if (!redemptionsOverTime || redemptionsOverTime.length < 7) return [];
    
    try {
      const result = [];
      const window = 7; // 7-day moving average
      
      for (let i = 0; i < redemptionsOverTime.length; i++) {
        if (i < window - 1) {
          // Not enough data points yet for the window
          result.push({
            name: redemptionsOverTime[i].name,
            trend: null
          });
        } else {
          // Calculate average of last 'window' points
          let sum = 0;
          for (let j = 0; j < window; j++) {
            sum += redemptionsOverTime[i - j].count;
          }
          result.push({
            name: redemptionsOverTime[i].name,
            trend: sum / window
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
  
  // Handle empty data
  if (!filteredData || filteredData.length === 0 || !metrics) {
    return (
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Sales Analysis</h2>
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
    
    <div>
      {/* Key Metrics Cards */}
      <div>
      {/* Title Bar with Export Button */}
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={exportSalesData}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-md shadow-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Data
        </button>
      </div>
    </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Total Redemptions</h3>
              <p className="text-3xl font-bold text-pink-600">{metrics?.totalUnits.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Average Per Day</h3>
              <p className="text-3xl font-bold text-blue-600">{metrics?.avgRedemptionsPerDay}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Date Range</h3>
              <p className="text-md font-medium text-green-600">
                {metrics && metrics.uniqueDates && metrics.uniqueDates.length > 0 ? 
                  `${formatDate(metrics.uniqueDates[0])} to ${formatDate(metrics.uniqueDates[metrics.uniqueDates.length - 1])}` :
                  "No date range"
                }
              </p>
              <p className="text-gray-600 text-sm">{metrics.daysInRange} days</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Retailer and Product Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Retailer Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {/* ... retailer distribution content ... */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Retailer Distribution
            </h3>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={retailerData}
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
                    percent > 0.05 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''
                  }
                  labelLine={false}
                >
                  {retailerData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke="#fff"
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
                    <span className={`text-sm ${activeRetailer === index ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 overflow-auto max-h-64">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retailer</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {retailerData.map((retailer, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <div className="text-sm font-medium text-gray-900">{retailer.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{retailer.value.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{retailer.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {/* ... product distribution content ... */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Top Products
            </h3>
          </div>
          
          {productDistribution && productDistribution.length > 0 ? (
            <>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productDistribution.slice(0, 10).map(item => ({
                        ...item,
                        name: item.displayName
                      }))}
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
                        percent > 0.05 ? `${name.length > 15 ? name.substring(0, 15) + '...' : name}: ${(percent * 100).toFixed(1)}%` : ''
                      }
                      labelLine={false}
                    >
                      {productDistribution.slice(0, 10).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          stroke="#fff"
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
                        <span className={`text-sm ${activeProduct === index ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                          {value.length > 20 ? value.substring(0, 20) + '...' : value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 overflow-auto max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productDistribution.slice(0, 10).map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <div className="text-sm font-medium text-gray-900">{product.displayName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{product.count.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{product.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">No product data available</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Redemptions Over Time */}
      {redemptionsOverTime && redemptionsOverTime.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4 sm:mb-0">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Redemptions Over Time
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                <select
                  value={redemptionTimeframe}
                  onChange={(e) => setRedemptionTimeframe(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={showTrendLine}
                    onChange={(e) => setShowTrendLine(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Trend Line</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={redemptionsOverTime}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
              >
                <defs>
                  <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF0066" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF0066" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatXAxisTick}
                  interval={calculateXAxisInterval(redemptionsOverTime.length)}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Redemptions" 
                  fill="url(#colorRedemptions)" 
                  stroke="#FF0066" 
                  strokeWidth={2} 
                  dot={{ stroke: '#FF0066', strokeWidth: 2, r: 4, fill: 'white' }}
                  activeDot={{ stroke: '#FF0066', strokeWidth: 2, r: 6, fill: 'white' }}
                />
                {showTrendLine && trendLineData && trendLineData.some(item => item.trend !== null) && (
                  <Line
                    type="monotone"
                    dataKey="trend"
                    data={trendLineData}
                    name="Trend (7-day MA)"
                    stroke="#0066CC"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-500">
              <div>Total points: {redemptionsOverTime.length}</div>
              <div>
                Average: {(redemptionsOverTime.reduce((sum, item) => sum + item.count, 0) / redemptionsOverTime.length).toFixed(1)} redemptions/{redemptionTimeframe}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 flex justify-center items-center h-64">
          <p className="text-gray-500">No time series data available</p>
        </div>
      )}
    </div>
  );
};

export default SalesTab;