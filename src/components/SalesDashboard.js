import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Import our new components
import ExecutiveSummaryPanel from './ExecutiveSummaryPanel';
import FilterPanel from './FilterPanel';
import SalesAnalysisTab from './SalesAnalysisTab';
import DemographicInsights from './DemographicInsights';
import OfferInsights from './OfferInsights';

// Define the preferred sorting order for age groups (for PDF export)
const AGE_GROUP_ORDER = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Under 18'
];

const SalesDashboard = () => {
  const [data, setData] = useState([]);
  const [offerData, setOfferData] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(['all']);
  const [selectedRetailers, setSelectedRetailers] = useState(['all']);
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('sales');
  const [hasOfferData, setHasOfferData] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // State for enhanced analytics
  const [redemptionTimeframe, setRedemptionTimeframe] = useState('daily');
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [showInsightDetails, setShowInsightDetails] = useState(false);
  
  // State for date comparison feature
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonDateRange, setComparisonDateRange] = useState('custom');
  const [comparisonStartDate, setComparisonStartDate] = useState('');
  const [comparisonEndDate, setComparisonEndDate] = useState('');
  const [comparisonMonth, setComparisonMonth] = useState('');
  
  // Refs for child components to access their data
  const demographicRef = useRef(null);
  const offerInsightsRef = useRef(null);

  // Add effect to handle clicking outside the export dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportOptions && !event.target.closest('.export-dropdown')) {
        setShowExportOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportOptions]);

  // Handle product selection
  const handleProductSelection = (product) => {
    if (product === 'all') {
      setSelectedProducts(['all']);
    } else {
      const newSelection = selectedProducts.includes('all') 
        ? [product]
        : selectedProducts.includes(product)
          ? selectedProducts.filter(p => p !== product)
          : [...selectedProducts, product];
      
      setSelectedProducts(newSelection.length ? newSelection : ['all']);
    }
  };

  // Handle retailer selection
  const handleRetailerSelection = (retailer) => {
    if (retailer === 'all') {
      setSelectedRetailers(['all']);
    } else {
      const newSelection = selectedRetailers.includes('all') 
        ? [retailer]
        : selectedRetailers.includes(retailer)
          ? selectedRetailers.filter(r => r !== retailer)
          : [...selectedRetailers, retailer];
      
      setSelectedRetailers(newSelection.length ? newSelection : ['all']);
    }
  };

  // Handle file upload for either sales or offer data
  const handleFileUpload = (event) => {
    setLoading(true);
    setError('');
    const file = event.target.files[0];
    
    if (file) {
      // Check file type based on name
      const isOfferData = file.name.toLowerCase().includes('hits_offer');
      
      // Reset previous data if switching file types
      if (isOfferData) {
        // If uploading offer data
        if (data.length > 0 && !hasOfferData) {
          // Keep sales data if already loaded, just add offer data
        } else {
          // Clear sales data if we're only working with offer data
          setData([]);
        }
      } else {
        // If uploading sales data, clear offer data
        setOfferData([]);
        setHasOfferData(false);
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              if (isOfferData) {
                // Process offer data
                const validOfferData = results.data.filter(row => 
                  row.hit_id && row.offer_id
                );
                
                if (validOfferData.length === 0) {
                  setError('No valid offer data found. Please ensure your CSV has the correct format.');
                } else {
                  setOfferData(validOfferData);
                  setHasOfferData(true);
                  // Set active tab to offers if this is the first upload
                  setActiveTab('offers');
                }
              } else {
                // Process sales data
                const validData = results.data.filter(row => 
                  row.receipt_date && 
                  row.product_name &&
                  row.chain &&
                  !isNaN(new Date(row.receipt_date).getTime())
                );
  
                if (validData.length === 0) {
                  setError('No valid sales data found. Please ensure your CSV has the correct format.');
                } else {
                  // Process dates and add month field
                  const processedData = validData.map(row => {
                    const date = new Date(row.receipt_date);
                    return {
                      ...row,
                      receipt_date: date.toISOString().split('T')[0],
                      month: date.toISOString().slice(0, 7), // YYYY-MM format
                      day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
                      hour_of_day: date.getHours() // 0-23
                    };
                  });
                  
                  setData(processedData);
                  // Set initial date range
                  const dates = processedData.map(row => row.receipt_date);
                  setStartDate(_.min(dates));
                  setEndDate(_.max(dates));
                  
                  // Initialize comparison dates too, for one month before the primary period
                  if (dates.length > 0) {
                    const minDate = new Date(_.min(dates));
                    const maxDate = new Date(_.max(dates));
                    
                    // Calculate a comparable previous period (e.g., previous month)
                    const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
                    const compEndDate = new Date(minDate);
                    compEndDate.setDate(compEndDate.getDate() - 1);
                    
                    const compStartDate = new Date(compEndDate);
                    compStartDate.setDate(compStartDate.getDate() - diffDays);
                    
                    setComparisonStartDate(compStartDate.toISOString().split('T')[0]);
                    setComparisonEndDate(compEndDate.toISOString().split('T')[0]);
                  }
                  
                  // Initialize with all products selected
                  setSelectedProducts(['all']);
                  
                  // Always set active tab to sales when uploading sales data
                  setActiveTab('sales');
                }
              }
            } else {
              setError('No data found in file');
            }
            setLoading(false);
          },
          error: (error) => {
            setError('Error parsing file: ' + error.message);
            setLoading(false);
          }
        });
      };
      reader.onerror = () => {
        setError('Error reading file');
        setLoading(false);
      };
      reader.readAsText(file);
    } else {
      setError('Please select a file');
      setLoading(false);
    }
  };

  // Get filtered data based on all selections
  const getFilteredData = (isComparison = false) => {
    return data.filter(item => {
      // Product filter
      const productMatch = selectedProducts.includes('all') || selectedProducts.includes(item.product_name);
      
      // Retailer filter
      const retailerMatch = selectedRetailers.includes('all') || selectedRetailers.includes(item.chain);
      
      // Date filter
      let dateMatch = true;
      if (!isComparison) {
        // Primary date range
        if (dateRange === 'month') {
          dateMatch = item.month === selectedMonth;
        } else if (dateRange === 'custom') {
          dateMatch = item.receipt_date >= startDate && item.receipt_date <= endDate;
        }
      } else {
        // Comparison date range
        if (comparisonDateRange === 'month') {
          dateMatch = item.month === comparisonMonth;
        } else if (comparisonDateRange === 'custom') {
          dateMatch = item.receipt_date >= comparisonStartDate && item.receipt_date <= comparisonEndDate;
        }
      }
      
      return productMatch && retailerMatch && dateMatch;
    });
  };

  // Calculate metrics for the filtered data
  const calculateMetrics = (isComparison = false) => {
    if (!data.length) return null;
    
    const filteredData = getFilteredData(isComparison);
    
    // Get unique dates to calculate date range and average per day
    const uniqueDates = _.uniq(filteredData.map(item => item.receipt_date)).sort();
    const daysInRange = uniqueDates.length;
    
    // Get total monetary value if available
    const totalValue = filteredData.reduce((sum, item) => {
      return sum + (item.receipt_total || 0);
    }, 0);
    
    // Calculate average per day
    const avgPerDay = daysInRange > 0 ? filteredData.length / daysInRange : 0;
    
    return {
      totalUnits: filteredData.length,
      uniqueDates: uniqueDates,
      daysInRange: daysInRange,
      totalValue: totalValue,
      avgRedemptionsPerDay: avgPerDay.toFixed(1)
    };
  };
  
  // Calculate the percentage change between two metrics
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Get retailer distribution data
  const getRetailerDistribution = () => {
    const filteredData = getFilteredData();
    const groupedByRetailer = _.groupBy(filteredData, 'chain');
    
    const totalUnits = filteredData.length;
    
    return Object.entries(groupedByRetailer)
      .map(([chain, items]) => ({
        name: chain || 'Unknown',
        value: items.length,
        percentage: (items.length / totalUnits) * 100
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Get available months from data
  const getAvailableMonths = () => {
    return _.uniq(data.map(item => item.month)).sort();
  };

  // Get redemptions over time based on selected timeframe
  const getRedemptionsOverTime = () => {
    const filteredData = getFilteredData();
    
    if (!filteredData.length) return [];
    
    let groupedData;
    let format;
    
    switch(redemptionTimeframe) {
      case 'hourly':
        // Group by hour of day
        groupedData = _.groupBy(filteredData, 'hour_of_day');
        format = hour => `${hour}:00`;
        break;
      case 'daily':
        // Group by date
        groupedData = _.groupBy(filteredData, 'receipt_date');
        format = date => date;
        break;
      case 'weekly':
        // Group by week (using the first day of the week)
        groupedData = _.groupBy(filteredData, item => {
          const date = new Date(item.receipt_date);
          const dayOfWeek = date.getDay();
          const diff = date.getDate() - dayOfWeek; // adjust to get first day of week (Sunday)
          const firstDay = new Date(date.setDate(diff));
          return firstDay.toISOString().split('T')[0];
        });
        format = date => {
          const startDate = new Date(date);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        };
        break;
      case 'monthly':
      default:
        // Group by month
        groupedData = _.groupBy(filteredData, 'month');
        format = month => month;
    }
    
    // Convert grouped data to array format for chart
    let result = Object.entries(groupedData)
      .map(([key, items]) => {
        // Calculate average value per receipt if available
        const avgValue = items.reduce((sum, item) => sum + (item.receipt_total || 0), 0) / items.length;
        
        return {
          name: format(key),
          count: items.length,
          value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0),
          avgValue: isNaN(avgValue) ? 0 : avgValue.toFixed(2)
        };
      });
    
    // Sort by the appropriate key
    if (redemptionTimeframe === 'hourly') {
      // For hourly, sort by hour number
      result = result.sort((a, b) => parseInt(a.name) - parseInt(b.name));
    } else {
      // For other timeframes, sort by date/time
      result = result.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return result;
  };

  // Get day of week distribution
  const getDayOfWeekDistribution = () => {
    const filteredData = getFilteredData();
    
    if (!filteredData.length) return [];
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const groupedByDay = _.groupBy(filteredData, 'day_of_week');
    
    // Create array with all days of week
    return dayNames.map((name, index) => {
      const items = groupedByDay[index] || [];
      return {
        name,
        count: items.length,
        percentage: filteredData.length > 0 ? (items.length / filteredData.length) * 100 : 0
      };
    });
  };

  // Get product distribution
  const getProductDistribution = () => {
    const filteredData = getFilteredData();
    
    if (!filteredData.length) return [];
    
    const groupedByProduct = _.groupBy(filteredData, 'product_name');
    
    return Object.entries(groupedByProduct)
      .map(([product, items]) => ({
        name: product || 'Unknown',
        count: items.length,
        percentage: (items.length / filteredData.length) * 100,
        value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0)
      }))
      .sort((a, b) => b.count - a.count);
  };

  // Calculate trend line data (using simple moving average)
  const calculateTrendLine = (data, window = 7) => {
    if (!data || data.length < window) return [];
    
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) {
        // Not enough data points yet for the window
        result.push(null);
      } else {
        // Calculate average of last 'window' points
        let sum = 0;
        for (let j = 0; j < window; j++) {
          sum += data[i - j].count;
        }
        result.push({
          name: data[i].name,
          trend: sum / window
        });
      }
    }
    
    return result;
  };

  // Export to CSV function - Enhanced to export dashboard view data
  const exportToCSV = (fileName) => {
    // Only handle sales tab
    if (activeTab !== 'sales' || !data.length) {
      alert('No data available to export.');
      return;
    }
    
    // Create arrays for CSV data - use consistent column names
    let csvData = [];
    const headers = ['Category', 'Units', 'Percentage'];
    
    // === SECTION 1: SUMMARY METRICS ===
    csvData.push({
      Category: "SUMMARY METRICS",
      Units: "",
      Percentage: ""
    });
    
    csvData.push({
      Category: "Total Units",
      Units: metrics.totalUnits,
      Percentage: "100%"
    });
    
    csvData.push({
      Category: "Date Range",
      Units: `${metrics.uniqueDates[0]} to ${metrics.uniqueDates[metrics.uniqueDates.length - 1]}`,
      Percentage: `${metrics.daysInRange} days`
    });
    
    csvData.push({
      Category: "",
      Units: "",
      Percentage: ""
    }); // Empty row
    
    // === SECTION 2: RETAILER DISTRIBUTION ===
    csvData.push({
      Category: "RETAILER DISTRIBUTION",
      Units: "",
      Percentage: ""
    });
    
    // Add retailer rows
    retailerData.forEach(retailer => {
      csvData.push({
        Category: retailer.name,
        Units: retailer.value,
        Percentage: `${retailer.percentage.toFixed(1)}%`
      });
    });
    
    csvData.push({
      Category: "",
      Units: "",
      Percentage: ""
    }); // Empty row
    
    // === SECTION 3: PRODUCT DISTRIBUTION ===
    csvData.push({
      Category: "PRODUCT DISTRIBUTION",
      Units: "",
      Percentage: ""
    });
    
    // Get product distribution
    const productDistribution = getProductDistribution();
    
    // Add product rows
    productDistribution.forEach(product => {
      csvData.push({
        Category: product.name,
        Units: product.count,
        Percentage: `${product.percentage.toFixed(1)}%`
      });
    });
    
    // === SECTION 4: PRODUCT x RETAILER ===
    // Only if specific products are selected
    if (!selectedProducts.includes('all') && selectedProducts.length > 0) {
      csvData.push({
        Category: "",
        Units: "",
        Percentage: ""
      }); // Empty row
      
      csvData.push({
        Category: "PRODUCT & RETAILER BREAKDOWN",
        Units: "",
        Percentage: ""
      });
      
      // Get filtered data
      const filteredData = getFilteredData();
      const totalCount = filteredData.length;
      
      // Group by product
      const productGroups = _.groupBy(filteredData, 'product_name');
      
      // Process each product
      Object.entries(productGroups).forEach(([productName, productItems]) => {
        const productTotal = productItems.length;
        const productPercentage = (productTotal / totalCount) * 100;
        
        // Add product row
        csvData.push({
          Category: `${productName} (Total)`,
          Units: productTotal,
          Percentage: `${productPercentage.toFixed(1)}%`
        });
        
        // Group by retailer within product
        const retailerGroups = _.groupBy(productItems, 'chain');
        
        // Process each retailer for this product
        Object.entries(retailerGroups)
          .map(([retailerName, items]) => ({
            retailerName,
            count: items.length,
            percentOfProduct: (items.length / productTotal) * 100,
            percentOfTotal: (items.length / totalCount) * 100
          }))
          .sort((a, b) => b.count - a.count)
          .forEach(retailer => {
            csvData.push({
              Category: `    ${retailer.retailerName}`,
              Units: retailer.count,
              Percentage: `${retailer.percentOfProduct.toFixed(1)}% of product / ${retailer.percentOfTotal.toFixed(1)}% of total`
            });
          });
        
        // Add empty row between products
        csvData.push({
          Category: "",
          Units: "",
          Percentage: ""
        });
      });
    }
    
    // Generate CSV using Papa Parse with explicit headers
    const csv = Papa.unparse({
      fields: headers,
      data: csvData
    });
    
    // Create a blob and save the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${fileName || 'sales-analysis'}.csv`);
  };

  // Handle which type of export to run
  const handleExport = (type) => {
    const exportName = clientName 
      ? `${clientName.toLowerCase().replace(/\s+/g, '-')}-${activeTab}`
      : `${activeTab}-data`;
      
    if (type === 'csv') {
      exportToCSV(exportName);
    } else if (type === 'pdf') {
      generatePDF(exportName);
    }
  };

  // Define a color palette for PDF exports with Shopmium brand plus contrasting colors
const PDF_COLORS = {
  shopmiumPink: [255, 0, 102],   // #FF0066 - Main Shopmium pink
  blue: [0, 102, 204],           // #0066CC - Contrasting blue
  amber: [255, 193, 7],          // #FFC107 - Amber
  teal: [0, 172, 193],           // #00ACC1 - Teal
  purple: [156, 39, 176],        // #9C27B0 - Purple
  green: [76, 175, 80],          // #4CAF50 - Green
  orange: [255, 152, 0]          // #FF9800 - Orange
};

// Generate PDF report - Simplified version, see full component for complete implementation
  const generatePDF = (fileName) => {
    // Create new PDF document
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Add Shopmium styled header
    doc.setFillColor(...PDF_COLORS.shopmiumPink);
    doc.rect(0, 0, doc.internal.pageSize.width, 15, 'F');
    
    // Add client name and header
    doc.setFontSize(20);
    doc.setTextColor(...PDF_COLORS.shopmiumPink);
    doc.text(`${clientName || 'Analysis'} Report`, 15, 25);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 35);
    
    // Add headers with Shopmium styled design
    if (activeTab === 'sales' && data.length > 0) {
      doc.setFillColor(...PDF_COLORS.blue);
      doc.rect(15, 45, doc.internal.pageSize.width - 30, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('Sales Analysis Summary', 20, 52);
      
      // Would add more content for the different tabs here in a full implementation
    }
    
    // Add Shopmium footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(...PDF_COLORS.shopmiumPink);
      doc.rect(0, doc.internal.pageSize.height - 10, doc.internal.pageSize.width, 10, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Powered by Shopmium Analytics - Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 4, { align: 'center' });
    }
    
    // Save the PDF with Shopmium brand styling
    doc.save(`${fileName || 'shopmium-analysis-report'}.pdf`);
  };
  
  // Calculate standard deviation - helper function
  const calculateStandardDeviation = (values) => {
    if (!values || values.length === 0) return 0;
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(value => {
      const diff = value - avg;
      return diff * diff;
    });
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  };

  // Prepare data for child components
  const metrics = data && data.length > 0 ? calculateMetrics() : null;
  const comparisonMetrics = (data && data.length > 0 && comparisonMode) ? calculateMetrics(true) : null;
  const retailerData = data && data.length > 0 ? getRetailerDistribution() : [];
  const availableRetailers = data && data.length > 0 ? _.uniq(data.map(item => item.chain || '')).filter(Boolean).sort() : [];
  const redemptionsOverTime = data && data.length > 0 ? getRedemptionsOverTime() : [];
  const dayOfWeekDistribution = data && data.length > 0 ? getDayOfWeekDistribution() : [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Analytics Dashboard</h1>
            <div className="mt-2">
              <input 
                type="text"
                placeholder="Client name (for exports)"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              />
            </div>
          </div>
          
          {/* File Upload Section */}
          <div className="flex flex-col items-end">
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Upload Data CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white p-2.5"
            />
            {loading && <p className="mt-1 text-sm text-gray-500">Loading data...</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        </div>
        
        {/* Main Content Area */}
        {(data.length > 0 || hasOfferData) ? (
          <>
            {/* Executive Summary */}
            {(activeTab === 'sales' || activeTab === 'demographics') && data.length > 0 && (
              <ExecutiveSummaryPanel 
                data={getFilteredData()}
                timeframe={dateRange}
                comparisonMode={comparisonMode}
                comparisonMetrics={comparisonMetrics}
                metrics={metrics}
              />
            )}
            
            {/* Tabs Navigation */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('sales')}
                  className={`${
                    activeTab === 'sales'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Sales Analysis
                </button>
                
                <button
                  onClick={() => setActiveTab('demographics')}
                  className={`${
                    activeTab === 'demographics'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Demographics
                </button>
                
                <button
                  onClick={() => setActiveTab('offers')}
                  disabled={!hasOfferData}
                  className={`${
                    activeTab === 'offers'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${!hasOfferData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Offer Insights
                </button>
              </nav>
            </div>
            
            {/* Filter Section */}
            {(activeTab === 'sales' || activeTab === 'demographics') && data.length > 0 && (
              <FilterPanel
                data={data}
                selectedProducts={selectedProducts}
                selectedRetailers={selectedRetailers}
                dateRange={dateRange}
                startDate={startDate}
                endDate={endDate}
                selectedMonth={selectedMonth}
                comparisonMode={comparisonMode}
                comparisonDateRange={comparisonDateRange}
                comparisonStartDate={comparisonStartDate}
                comparisonEndDate={comparisonEndDate}
                comparisonMonth={comparisonMonth}
                handleProductSelection={handleProductSelection}
                handleRetailerSelection={handleRetailerSelection}
                setDateRange={setDateRange}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                setSelectedMonth={setSelectedMonth}
                setComparisonMode={setComparisonMode}
                setComparisonDateRange={setComparisonDateRange}
                setComparisonStartDate={setComparisonStartDate}
                setComparisonEndDate={setComparisonEndDate}
                setComparisonMonth={setComparisonMonth}
              />
            )}
            
            {/* Export Options */}
            <div className="mb-6 flex justify-end">
              <div className="relative export-dropdown">
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  className="bg-pink-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  Export Data
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                
                {showExportOptions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md z-10">
                    <button
                      onClick={() => handleExport('csv')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      Export to CSV
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      Export to PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="bg-white shadow rounded-lg p-6">
              {/* Sales Tab */}
              {activeTab === 'sales' && data.length > 0 && (
                <SalesAnalysisTab
                  data={data}
                  metrics={metrics}
                  comparisonMode={comparisonMode}
                  comparisonMetrics={comparisonMetrics}
                  retailerData={retailerData}
                  redemptionsOverTime={redemptionsOverTime}
                  redemptionTimeframe={redemptionTimeframe}
                  setRedemptionTimeframe={setRedemptionTimeframe}
                  showTrendLine={showTrendLine}
                  setShowTrendLine={setShowTrendLine}
                  getProductDistribution={getProductDistribution}
                  calculateTrendLine={calculateTrendLine}
                  selectedProducts={selectedProducts}
                />
              )}
              
              {/* Demographics Tab */}
              {activeTab === 'demographics' && data.length > 0 && (
                <DemographicInsights
                  data={getFilteredData()}
                  ref={demographicRef}
                />
              )}
              
              {/* Offers Tab */}
              {activeTab === 'offers' && hasOfferData && (
                <OfferInsights
                  data={offerData}
                  ref={offerInsightsRef}
                />
              )}
              
              {/* Empty State */}
              {(data.length === 0 && !hasOfferData) && (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No data to display</h3>
                  <p className="mt-1 text-sm text-gray-500">Upload a CSV file to get started with your analysis.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Welcome to the Sales Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">Upload your sales data CSV file to begin your analysis.</p>
            <p className="mt-4 text-xs text-gray-400">
              Expected columns: receipt_date, product_name, chain, receipt_total
              <br />
              For offer insights, upload a file with "hits_offer" in the filename.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesDashboard;