import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { identifyBrandPrefixes, extractBrandNames } from '../utils/brandDetection.js'
// import AdvancedFilterPanel from './filters/AdvancedFilterPanel';
// import SurveyResponseAnalytics from './analytics/SurveyResponseAnalytics';

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
  // Add state for brand detection module loading
  const [brandDetectionLoaded, setBrandDetectionLoaded] = useState(false);
  
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
  const [brandMapping, setBrandMapping] = useState({});
  const [brandNames, setBrandNames] = useState([]);
  
  // State for enhanced analytics
  const [redemptionTimeframe, setRedemptionTimeframe] = useState('daily');
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [showInsightDetails, setShowInsightDetails] = useState(false);
  // const [advancedFilteredData, setAdvancedFilteredData] = useState([]);
  // const [useAdvancedFilters, setUseAdvancedFilters] = useState(false);
  
  // State for date comparison feature
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonDateRange, setComparisonDateRange] = useState('custom');
  const [comparisonStartDate, setComparisonStartDate] = useState('');
  const [comparisonEndDate, setComparisonEndDate] = useState('');
  const [comparisonMonth, setComparisonMonth] = useState('');
  
  // Refs for child components to access their data
  const demographicRef = useRef(null);
  const offerInsightsRef = useRef(null);

  // Add effect to dynamically load brand detection or use inline fallback
  useEffect(() => {
    // Define inline fallback functions in case the import fails
    const fallbackIdentifyBrandPrefixes = (productNames) => {
      if (!productNames || productNames.length <= 1) return {};
      
      const mappings = {};
      productNames.forEach(name => {
        const words = name.split(' ');
        if (words.length >= 3) {
          mappings[name] = {
            original: name,
            brandName: words[0],
            displayName: words.slice(1).join(' ')
          };
        } else {
          mappings[name] = {
            original: name,
            brandName: '',
            displayName: name
          };
        }
      });
      return mappings;
    };
    
    const fallbackExtractBrandNames = (brandMapping) => {
      if (!brandMapping) return [];
      const brands = Object.values(brandMapping)
        .map(info => info.brandName)
        .filter(Boolean);
      return [...new Set(brands)];
    };
    
    // Store these functions globally to use in file upload
    window.BrandDetection = {
      identifyBrandPrefixes: fallbackIdentifyBrandPrefixes,
      extractBrandNames: fallbackExtractBrandNames
    };
    
    setBrandDetectionLoaded(true);
  }, []);

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
                  
                  // Use the BrandDetection utility from the window object
                  const uniqueProducts = _.uniq(processedData.map(item => item.product_name)).filter(Boolean);
                  
                  // Make sure the brand detection is loaded
                  if (window.BrandDetection) {
                    const mapping = window.BrandDetection.identifyBrandPrefixes(uniqueProducts);
                    setBrandMapping(mapping);
                    const brands = window.BrandDetection.extractBrandNames(mapping);
                    setBrandNames(brands);
                  }
                  
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
    // Remove the advanced filters conditional
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
      .map(([product, items]) => {
        // Use the mapping to get display name
        const productInfo = brandMapping[product] || { displayName: product };
        
        let displayName = productInfo.displayName || product;
        
        // ADDITIONAL FALLBACK: If the display name is still the full product name
        // and has 3+ words, force remove the first word(s)
        if (displayName === product) {
          const words = displayName.split(' ');
          if (words.length >= 3) {
            // Remove the first word (or two if the name is long)
            const wordsToRemove = words.length >= 5 ? 2 : 1;
            displayName = words.slice(wordsToRemove).join(' ');
          }
        }
        
        return {
          name: product, // Keep original name for data integrity
          displayName: displayName, // Use formatted name for display
          brandName: productInfo.brandName || '', // Store the brand name if needed
          count: items.length,
          percentage: (items.length / filteredData.length) * 100,
          value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0)
        };
      })
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
  // Handle both sales and demographics tabs
  if ((activeTab !== 'sales' && activeTab !== 'demographics') || !data.length) {
    alert('No data available to export.');
    return;
  }
  
  if (activeTab === 'sales') {
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
    
    // Add product rows with display names
    productDistribution.forEach(product => {
      csvData.push({
        Category: product.displayName, // Use the formatted display name
        Units: product.count,
        Percentage: `${product.percentage.toFixed(1)}%`
      });
    });
    
    // === SECTION 4: PRODUCT x RETAILER BREAKDOWN ===
    csvData.push({
      Category: "",
      Units: "",
      Percentage: ""
    }); // Empty row
    
    csvData.push({
      Category: "PRODUCT x RETAILER BREAKDOWN",
      Units: "",
      Percentage: ""
    });
    
    // Get filtered data
    const filteredData = getFilteredData();
    const totalCount = filteredData.length;
    
    // Create a matrix of products and retailers
    const productRetailerMatrix = {};
    const displayNameMapping = {}; // Map original names to display names
    
    // Get unique products and retailers
    const uniqueProducts = _.uniq(filteredData.map(item => item.product_name)).filter(Boolean).sort();
    const uniqueRetailers = _.uniq(filteredData.map(item => item.chain)).filter(Boolean).sort();
    
    // Initialize the matrix
    uniqueProducts.forEach(product => {
      productRetailerMatrix[product] = {};
      uniqueRetailers.forEach(retailer => {
        productRetailerMatrix[product][retailer] = 0;
      });
      // Store the mapping from original to display name
      const productInfo = brandMapping[product] || { displayName: product };
      displayNameMapping[product] = productInfo.displayName;
    });
    
    // Fill the matrix with counts
    filteredData.forEach(item => {
      if (item.product_name && item.chain) {
        productRetailerMatrix[item.product_name][item.chain] += 1;
      }
    });
    
    // Add header row for retailers
    const retailerHeaderRow = {
      Category: "Product \\ Retailer"
    };
    
    uniqueRetailers.forEach(retailer => {
      retailerHeaderRow[retailer] = retailer;
    });
    retailerHeaderRow["Total"] = "Total";
    
    // Add the retailer header row with custom headers
    csvData.push(retailerHeaderRow);
    
    // Add product rows with retailer breakdown
    uniqueProducts.forEach(product => {
      const productRow = {
        Category: displayNameMapping[product] // Use display name instead of original
      };
      
      let productTotal = 0;
      
      uniqueRetailers.forEach(retailer => {
        const count = productRetailerMatrix[product][retailer] || 0;
        productTotal += count;
        productRow[retailer] = count;
      });
      
      productRow["Total"] = productTotal;
      
      csvData.push(productRow);
    });
    
    // Add a total row
    const totalRow = {
      Category: "Total"
    };
    
    uniqueRetailers.forEach(retailer => {
      const retailerTotal = uniqueProducts.reduce((sum, product) => {
        return sum + (productRetailerMatrix[product][retailer] || 0);
      }, 0);
      
      totalRow[retailer] = retailerTotal;
    });
    
    totalRow["Total"] = totalCount;
    csvData.push(totalRow);
    
    // === SECTION 5: ADDITIONAL PRODUCT RETAILER ANALYSIS ===
    // Add percentage view of products by retailer
    csvData.push({
      Category: "",
      Units: "",
      Percentage: ""
    }); // Empty row
    
    csvData.push({
      Category: "PRODUCT DISTRIBUTION BY RETAILER (%)",
      Units: "",
      Percentage: ""
    });
    
    // Add header row again
    csvData.push(retailerHeaderRow);
    
    // Add percentage rows
    uniqueProducts.forEach(product => {
      const productRow = {
        Category: displayNameMapping[product] // Use display name instead of original
      };
      
      uniqueRetailers.forEach(retailer => {
        const count = productRetailerMatrix[product][retailer] || 0;
        const retailerTotal = uniqueProducts.reduce((sum, p) => sum + (productRetailerMatrix[p][retailer] || 0), 0);
        const percentage = retailerTotal > 0 ? (count / retailerTotal) * 100 : 0;
        productRow[retailer] = `${percentage.toFixed(1)}%`;
      });
      
      const productTotal = uniqueProducts.reduce((sum, p) => {
        return uniqueRetailers.reduce((total, r) => {
          return total + (productRetailerMatrix[p][r] || 0);
        }, sum);
      }, 0);
      
      const totalPercentage = productTotal > 0 ? 
        (uniqueRetailers.reduce((sum, r) => sum + (productRetailerMatrix[product][r] || 0), 0) / productTotal) * 100 : 0;
      
      productRow["Total"] = `${totalPercentage.toFixed(1)}%`;
      
      csvData.push(productRow);
    });
    
    // Generate special CSV using Papa Parse with the dynamic headers
    const allHeaders = ['Category', ...uniqueRetailers, 'Total'];
    
    // Convert our data to match the headers
    const formattedData = csvData.map(row => {
      // For standard rows with just Category, Units, Percentage
      if (!row.hasOwnProperty('Total') && row.hasOwnProperty('Units')) {
        const newRow = { Category: row.Category };
        allHeaders.forEach(header => {
          if (header === 'Category') return;
          if (header === 'Units') newRow[header] = row.Units;
          else if (header === 'Percentage') newRow[header] = row.Percentage;
          else newRow[header] = '';
        });
        return newRow;
      }
      // Return the row as is if it already matches our headers format
      return row;
    });
    
    // Generate CSV with proper headers
    const csv = Papa.unparse({
      fields: allHeaders,
      data: formattedData
    });
    
    // Create a blob and save the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${fileName || 'sales-analysis'}.csv`);
  } 
  else if (activeTab === 'demographics') {
    // Get the demographic data from the ref
    if (!demographicRef.current) {
      alert('No demographic data available to export.');
      return;
    }
    
    const demographicData = demographicRef.current.getVisibleData();
    
    if (!demographicData || !demographicData.responseData) {
      alert('No demographic data available to export.');
      return;
    }
    
    // We'll focus on creating a single, comprehensive CSV for demographic data
    // with all the selected options and age demographic splits
    
    // First, determine if we have selected responses and age data
    const hasSelectedResponses = demographicData.selectedResponses && 
                               demographicData.selectedResponses.length > 0;
    
    const hasAgeData = hasSelectedResponses && 
                      demographicData.ageDistribution && 
                      demographicData.ageDistribution.length > 0;
    
    // Setup headers for the CSV based on what data we have
    let headers = [];
    
    // If we have age data with selected responses, create a detailed CSV
    if (hasAgeData) {
      // Create a matrix-style CSV with age groups as rows and responses as columns
      
      // 1. Create column headers - first column is Age Group, followed by a column for each response
      headers = ['Age Group'];
      
      // For each selected response, add columns for count and percentages
      demographicData.selectedResponses.forEach(response => {
        headers.push(`${response} (Count)`);
        headers.push(`${response} (% of Age Group)`);
        headers.push(`${response} (% of Response)`);
      });
      
      // Add a Total column
      headers.push('Total Count');
      
      // 2. Create data rows - one for each age group
      let csvRows = [];
      
      // Sort age groups according to preferred order
      const sortedAgeGroups = [...demographicData.ageDistribution].sort((a, b) => {
        const aIndex = AGE_GROUP_ORDER.indexOf(a.ageGroup);
        const bIndex = AGE_GROUP_ORDER.indexOf(b.ageGroup);
        
        // If both are in the order list, use that order
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        
        // If only one is in the order list, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // Otherwise, alphabetical
        return a.ageGroup.localeCompare(b.ageGroup);
      });
      
      // Add rows for each age group
      sortedAgeGroups.forEach(ageGroup => {
        const row = {
          'Age Group': ageGroup.ageGroup,
          'Total Count': ageGroup.count
        };
        
        // Add data for each response
        demographicData.selectedResponses.forEach(response => {
          row[`${response} (Count)`] = ageGroup[response] || 0;
          row[`${response} (% of Age Group)`] = ageGroup[`${response}_percent`] 
            ? `${ageGroup[`${response}_percent`].toFixed(1)}%` 
            : '0.0%';
          row[`${response} (% of Response)`] = ageGroup[`${response}_percent_of_total`] 
            ? `${ageGroup[`${response}_percent_of_total`].toFixed(1)}%` 
            : '0.0%';
        });
        
        csvRows.push(row);
      });
      
      // 3. Add summary row for totals
      const totalRow = {
        'Age Group': 'Total'
      };
      
      const totalCount = sortedAgeGroups.reduce((sum, ag) => sum + ag.count, 0);
      totalRow['Total Count'] = totalCount;
      
      demographicData.selectedResponses.forEach(response => {
        const responseTotal = sortedAgeGroups.reduce((sum, ag) => sum + (ag[response] || 0), 0);
        totalRow[`${response} (Count)`] = responseTotal;
        totalRow[`${response} (% of Age Group)`] = `${((responseTotal / totalCount) * 100).toFixed(1)}%`;
        totalRow[`${response} (% of Response)`] = '100.0%';
      });
      
      csvRows.push(totalRow);
      
      // 4. Add question info at the top
      csvRows.unshift({
        'Age Group': '',
        'Total Count': ''
      });
      
      csvRows.unshift({
        'Age Group': `Selected Responses: ${demographicData.selectedResponses.join(', ')}`,
        'Total Count': ''
      });
      
      csvRows.unshift({
        'Age Group': demographicData.getCurrentQuestionText || 'Current Question',
        'Total Count': ''
      });
      
      csvRows.unshift({
        'Age Group': 'DEMOGRAPHIC SURVEY QUESTION',
        'Total Count': ''
      });
      
      // Generate CSV from the rows
      const csv = Papa.unparse({
        fields: headers,
        data: csvRows
      });
      
      // Create a blob and save the file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `${fileName || 'demographic-analysis'}.csv`);
    } 
    else {
      // If no age data or no selected responses, create a simpler CSV 
      // with just the question and response distribution
      
      // 1. Create headers for basic info
      headers = ['Category', 'Count', 'Percentage'];
      
      // 2. Create data rows
      let csvRows = [];
      
      // Add question info
      csvRows.push({
        'Category': 'DEMOGRAPHIC SURVEY QUESTION',
        'Count': '',
        'Percentage': ''
      });
      
      csvRows.push({
        'Category': demographicData.getCurrentQuestionText || 'Current Question',
        'Count': '',
        'Percentage': ''
      });
      
      csvRows.push({
        'Category': '',
        'Count': '',
        'Percentage': ''
      });
      
      // Add response distribution
      csvRows.push({
        'Category': 'RESPONSE DISTRIBUTION',
        'Count': '',
        'Percentage': ''
      });
      
      demographicData.responseData.forEach(response => {
        csvRows.push({
          'Category': response.response,
          'Count': response.total,
          'Percentage': `${response.percentage.toFixed(1)}%`
        });
      });
      
      // Add message about selecting responses for age breakdown
      csvRows.push({
        'Category': '',
        'Count': '',
        'Percentage': ''
      });
      
      csvRows.push({
        'Category': 'Note: Select responses in the UI to see age demographic breakdown',
        'Count': '',
        'Percentage': ''
      });
      
      // Generate CSV from the rows
      const csv = Papa.unparse({
        fields: headers,
        data: csvRows
      });
      
      // Create a blob and save the file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `${fileName || 'demographic-analysis'}.csv`);
    }
  }
};

  // Handle which type of export to run
  const handleExport = (type) => {
    let exportName;
    
    if (activeTab === 'demographics') {
      exportName = clientName 
        ? `${clientName.toLowerCase().replace(/\s+/g, '-')}-demographics`
        : `demographics-data`;
    } else {
      exportName = clientName 
        ? `${clientName.toLowerCase().replace(/\s+/g, '-')}-${activeTab}`
        : `${activeTab}-data`;
    }
      
    if (type === 'csv') {
      exportToCSV(exportName);
    } else if (type === 'pdf') {
      generatePDF(exportName);
    }
  };

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
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // Add Shopmium styled header
    doc.setFillColor(...PDF_COLORS.shopmiumPink);
    doc.rect(0, 0, pageWidth, 15, 'F');
    
    // Add detected brand name or client name
    const displayBrandName = brandNames.length > 0 ? brandNames[0] : (clientName || 'Analysis');
    doc.setFontSize(20);
    doc.setTextColor(...PDF_COLORS.shopmiumPink);
    doc.text(`${displayBrandName} Report`, margin, 25);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, 35);
    
    // Add headers with Shopmium styled design based on tab
    if (activeTab === 'sales' && data.length > 0) {
      doc.setFillColor(...PDF_COLORS.blue);
      doc.rect(margin, 45, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('Sales Analysis Summary', margin + 5, 52);
      
      // Add Key Metrics section
      let yPos = 65;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Key Metrics', margin, yPos);
      yPos += 10;
      
      // Create metrics table
      doc.autoTable({
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Redemptions', metrics?.totalUnits.toLocaleString()],
          ['Average Per Day', metrics?.avgRedemptionsPerDay],
          ['Date Range', `${metrics?.uniqueDates[0]} to ${metrics?.uniqueDates[metrics?.uniqueDates.length - 1]}`],
          ['Days in Range', metrics?.daysInRange]
        ],
        theme: 'grid',
        headStyles: { fillColor: PDF_COLORS.shopmiumPink, textColor: [255, 255, 255] },
        margin: { left: margin }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      // Add Retailer Distribution section
      doc.setFontSize(14);
      doc.text('Retailer Distribution', margin, yPos);
      yPos += 10;
      
      // Create retailer distribution table
      const retailerRows = retailerData.map(retailer => [
        retailer.name,
        retailer.value.toLocaleString(),
        `${retailer.percentage.toFixed(1)}%`
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Retailer', 'Units', 'Percentage']],
        body: retailerRows,
        theme: 'grid',
        headStyles: { fillColor: PDF_COLORS.blue, textColor: [255, 255, 255] },
        margin: { left: margin }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      // Check if we need a new page for Product Distribution
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      
      // Add Product Distribution section
      doc.setFontSize(14);
      doc.text('Product Distribution', margin, yPos);
      yPos += 10;
      
      // Create product distribution table
      const productDistribution = getProductDistribution();
      const productRows = productDistribution.slice(0, 10).map(product => [
        product.displayName,
        product.count.toLocaleString(),
        `${product.percentage.toFixed(1)}%`
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Product', 'Units', 'Percentage']],
        body: productRows,
        theme: 'grid',
        headStyles: { fillColor: PDF_COLORS.amber, textColor: [0, 0, 0] },
        margin: { left: margin }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      // NEW SECTION: Product by Retailer Distribution
      // Create a matrix of products by retailers
      
      // Check if we need a new page for the cross-tabulation
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      // Get filtered data
      const filteredData = getFilteredData();
      
      // Get top 5 products and retailers for the matrix (to keep the table manageable)
      const topProducts = productDistribution.slice(0, 5);
      const topRetailers = retailerData.slice(0, 5);
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Product Distribution by Retailer (%)', margin, yPos);
      doc.setFontSize(10);
      doc.text('(What percentage of each product came from each retailer)', margin, yPos + 7);
      yPos += 15;
      
      // Create a product-retailer matrix
      const productRetailerMatrix = {};
      const productTotals = {};
      
      // Initialize the matrix and totals
      topProducts.forEach(product => {
        productRetailerMatrix[product.name] = {};
        productTotals[product.name] = 0;
        
        topRetailers.forEach(retailer => {
          productRetailerMatrix[product.name][retailer.name] = 0;
        });
      });
      
      // Fill the matrix with counts
      filteredData.forEach(item => {
        // Only process items that are in our top products and retailers
        const isTopProduct = topProducts.find(p => p.name === item.product_name);
        const isTopRetailer = topRetailers.find(r => r.name === item.chain);
        
        if (isTopProduct && isTopRetailer) {
          productRetailerMatrix[item.product_name][item.chain] = 
            (productRetailerMatrix[item.product_name][item.chain] || 0) + 1;
          productTotals[item.product_name] = (productTotals[item.product_name] || 0) + 1;
        }
      });
      
      // Create percentage matrix for the table
      const percentageMatrix = [];
      
      // First, create the header row
      const headerRow = ['Product / Retailer'];
      topRetailers.forEach(retailer => {
        headerRow.push(retailer.name);
      });
      headerRow.push('Total Units');
      
      // Then create the data rows with percentages
      topProducts.forEach(product => {
        const row = [product.displayName || product.name];
        
        topRetailers.forEach(retailer => {
          const count = productRetailerMatrix[product.name][retailer.name] || 0;
          const total = productTotals[product.name] || 1; // Avoid division by zero
          const percentage = (count / total) * 100;
          row.push(`${percentage.toFixed(1)}%`);
        });
        
        row.push(productTotals[product.name].toLocaleString());
        percentageMatrix.push(row);
      });
      
      // Add a total row
      const totalRow = ['All Products'];
      topRetailers.forEach(retailer => {
        const retailerTotal = filteredData.filter(item => 
          item.chain === retailer.name && 
          topProducts.some(p => p.name === item.product_name)
        ).length;
        
        const allProductsTotal = filteredData.filter(item => 
          topProducts.some(p => p.name === item.product_name)
        ).length || 1;
        
        const percentage = (retailerTotal / allProductsTotal) * 100;
        totalRow.push(`${percentage.toFixed(1)}%`);
      });
      
      totalRow.push(filteredData.filter(item => 
        topProducts.some(p => p.name === item.product_name)
      ).length.toLocaleString());
      
      percentageMatrix.push(totalRow);
      
      // Draw the table
      doc.autoTable({
        startY: yPos,
        head: [headerRow],
        body: percentageMatrix,
        theme: 'grid',
        headStyles: { fillColor: PDF_COLORS.teal, textColor: [255, 255, 255] },
        margin: { left: margin },
        styles: { fontSize: 8, cellPadding: 2 }, // Smaller font for potentially wide table
        columnStyles: { 0: { cellWidth: 50 } } // Fix width for first column
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      // NEW SECTION: Retailer by Product Distribution
      // For the reverse perspective - what percentage of each retailer's sales comes from each product
      
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Retailer Distribution by Product (%)', margin, yPos);
      doc.setFontSize(10);
      doc.text('(What percentage of each retailer\'s sales came from each product)', margin, yPos + 7);
      yPos += 15;
      
      // Calculate retailer totals
      const retailerTotals = {};
      topRetailers.forEach(retailer => {
        retailerTotals[retailer.name] = filteredData.filter(item => 
          item.chain === retailer.name && 
          topProducts.some(p => p.name === item.product_name)
        ).length || 1; // Avoid division by zero
      });
      
      // Create percentage matrix for the reversed table
      const retailerProductMatrix = [];
      
      // Create the header row (Product names as columns)
      const reverseHeaderRow = ['Retailer / Product'];
      topProducts.forEach(product => {
        reverseHeaderRow.push(product.displayName || product.name);
      });
      reverseHeaderRow.push('Total Units');
      
      // Create data rows for each retailer
      topRetailers.forEach(retailer => {
        const row = [retailer.name];
        
        topProducts.forEach(product => {
          const count = productRetailerMatrix[product.name][retailer.name] || 0;
          const total = retailerTotals[retailer.name];
          const percentage = (count / total) * 100;
          row.push(`${percentage.toFixed(1)}%`);
        });
        
        row.push(retailerTotals[retailer.name].toLocaleString());
        retailerProductMatrix.push(row);
      });
      
      // Add a total row
      const reverseTotalRow = ['All Retailers'];
      topProducts.forEach(product => {
        const productTotal = filteredData.filter(item => 
          item.product_name === product.name && 
          topRetailers.some(r => r.name === item.chain)
        ).length;
        
        const allRetailersTotal = filteredData.filter(item => 
          topRetailers.some(r => r.name === item.chain)
        ).length || 1;
        
        const percentage = (productTotal / allRetailersTotal) * 100;
        reverseTotalRow.push(`${percentage.toFixed(1)}%`);
      });
      
      reverseTotalRow.push(filteredData.filter(item => 
        topRetailers.some(r => r.name === item.chain)
      ).length.toLocaleString());
      
      retailerProductMatrix.push(reverseTotalRow);
      
      // Draw the reversed table
      doc.autoTable({
        startY: yPos,
        head: [reverseHeaderRow],
        body: retailerProductMatrix,
        theme: 'grid',
        headStyles: { fillColor: PDF_COLORS.orange, textColor: [0, 0, 0] },
        margin: { left: margin },
        styles: { fontSize: 8, cellPadding: 2 }, // Smaller font for potentially wide table
        columnStyles: { 0: { cellWidth: 40 } } // Fix width for first column
      });
      
      // Add note about time analysis
      yPos = doc.lastAutoTable.finalY + 15;
      if (yPos < pageHeight - 20) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Note: Time analysis charts available in the dashboard view', margin, yPos);
      }
    } 
    else if (activeTab === 'demographics' && data.length > 0) {
      // Demographics PDF code remains as before
      doc.setFillColor(...PDF_COLORS.purple);
      doc.rect(margin, 45, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      
      // Get demographic data if available
      let demographicTitle = 'Demographic Analysis';
      let responseData = [];
      let ageData = [];
      let currentQuestion = '';
      let selectedResponses = [];
      
      if (demographicRef.current) {
        const demographicData = demographicRef.current.getVisibleData();
        if (demographicData) {
          responseData = demographicData.responseData || [];
          ageData = demographicData.ageData || [];
          currentQuestion = demographicData.getCurrentQuestionText || '';
          selectedResponses = demographicData.selectedResponses || [];
          
          if (currentQuestion) {
            demographicTitle = `Demographics: ${currentQuestion.substring(0, 50)}${currentQuestion.length > 50 ? '...' : ''}`;
          }
        }
      }
      
      doc.text(demographicTitle, margin + 5, 52);
      
      // Add Question text
      let yPos = 65;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Question:', margin, yPos);
      yPos += 7;
      
      // Handle long question text with text wrapping
      const questionLines = doc.splitTextToSize(currentQuestion, contentWidth);
      doc.setFontSize(10);
      doc.text(questionLines, margin, yPos);
      yPos += (questionLines.length * 7) + 10;
      
      // Add Response Distribution
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Response Distribution', margin, yPos);
      yPos += 10;
      
      // Create response table
      const responseRows = responseData.map(resp => [
        resp.response,
        resp.total.toLocaleString(),
        `${Math.round(resp.percentage)}%`
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Response', 'Count', 'Percentage']],
        body: responseRows,
        theme: 'grid',
        headStyles: { fillColor: PDF_COLORS.purple, textColor: [255, 255, 255] },
        margin: { left: margin }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      // If we have selected responses, add age breakdown
      if (selectedResponses && selectedResponses.length > 0) {
        // Check if we need a new page
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`Age Distribution: ${selectedResponses.join(', ')}`, margin, yPos);
        yPos += 10;
        
        // Get age distribution data
        if (demographicRef.current) {
          const { ageDistribution } = demographicRef.current.getVisibleData();
          
          if (ageDistribution && ageDistribution.length > 0) {
            // Create table header with dynamic columns for selected responses
            const ageHeader = ['Age Group', 'Total Count'];
            selectedResponses.forEach(resp => {
              ageHeader.push(resp);
              ageHeader.push(`% of Age Group`);
            });
            
            // Create table rows
            const ageRows = ageDistribution.map(ageGroup => {
              const row = [ageGroup.ageGroup, ageGroup.count];
              
              selectedResponses.forEach(resp => {
                row.push(ageGroup[resp] || 0);
                row.push(ageGroup[`${resp}_percent`] ? 
                  `${ageGroup[`${resp}_percent`].toFixed(1)}%` : '0.0%');
              });
              
              return row;
            });
            
            // Add the age distribution table
            doc.autoTable({
              startY: yPos,
              head: [ageHeader],
              body: ageRows,
              theme: 'grid',
              headStyles: { fillColor: PDF_COLORS.teal, textColor: [255, 255, 255] },
              margin: { left: margin },
              styles: { fontSize: 8 }, // Smaller font for potentially wide table
              columnStyles: { 0: { cellWidth: 20 } } // Fix width for first column
            });
          }
        }
      }
    } 
    else if (activeTab === 'offers' && hasOfferData) {
      // Offers PDF code remains as before
      doc.setFillColor(...PDF_COLORS.green);
      doc.rect(margin, 45, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('Offer Insights', margin + 5, 52);
      
      // Get offer data if available
      let yPos = 65;
      let insightType = '';
      let metrics = {};
      let offerData = [];
      
      if (offerInsightsRef.current) {
        const offerInsightsData = offerInsightsRef.current.getVisibleData();
        if (offerInsightsData) {
          insightType = offerInsightsData.insightType || '';
          metrics = offerInsightsData.metrics || {};
          offerData = offerInsightsData.offerData || [];
          
          // Add metrics section
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.text('Key Metrics', margin, yPos);
          yPos += 10;
          
          // Create metrics table
          doc.autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
              ['Total Hits', metrics.totalHits?.toLocaleString() || '0'],
              ['Average Hits Per Day', metrics.averageHitsPerDay || '0'],
              ['Period Length', `${metrics.periodDays || 0} days`]
            ],
            theme: 'grid',
            headStyles: { fillColor: PDF_COLORS.green, textColor: [255, 255, 255] },
            margin: { left: margin }
          });
          
          yPos = doc.lastAutoTable.finalY + 15;
          
          // Add Offer Distribution section if data available
          if (offerData && offerData.length > 0) {
            // Check if we need a new page
            if (yPos > pageHeight - 50) {
              doc.addPage();
              yPos = 20;
            }
            
            doc.setFontSize(14);
            doc.text('Offer Distribution', margin, yPos);
            yPos += 10;
            
            // Create offer distribution table
            const offerRows = offerData.slice(0, 10).map(offer => [
              offer.name,
              offer.value.toLocaleString(),
              `${offer.percentage.toFixed(1)}%`,
              offer.averageHitsPerDay
            ]);
            
            doc.autoTable({
              startY: yPos,
              head: [['Offer Name', 'Hits', 'Percentage', 'Avg. Hits/Day']],
              body: offerRows,
              theme: 'grid',
              headStyles: { fillColor: PDF_COLORS.green, textColor: [255, 255, 255] },
              margin: { left: margin },
              columnStyles: { 0: { cellWidth: 80 } } // Wider column for offer names
            });
          }
        }
      }
    }
    
    // Add Shopmium footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(...PDF_COLORS.shopmiumPink);
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Powered by Shopmium Analytics - Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
    }
    
    // Save the PDF with Shopmium brand styling
    doc.save(`${fileName || 'shopmium-analysis-report'}.pdf`);
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
        <div className="mb-6 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Analytics Dashboard</h1>
          <div className="mt-2 flex items-center">
            {brandNames.length > 0 && (
              <div className="mr-3">
                <span className="text-sm text-gray-500 mr-2">Detected Brand:</span>
                <span className="font-medium text-pink-600">{brandNames[0]}</span>
              </div>
            )}
            <input 
              type="text"
              placeholder={brandNames.length > 0 ? "Override brand name" : "Client name (for exports)"}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="flex items-center mt-4 md:mt-0 space-x-4">
          {/* Export Options - Side by side with file upload */}
          {(data.length > 0 || hasOfferData) && (
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
          )}
          
          {/* File Upload Section */}
          <div className="flex flex-col">
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
                  {/* <button
                    onClick={() => setActiveTab('advanced-filters')}
                    className={`${
                      activeTab === 'advanced-filters'
                        ? 'border-pink-600 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Advanced Filters
                  </button> */}
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

                {/* {activeTab === 'advanced-filters' && data.length > 0 && (
                  <AdvancedFilterPanel
                    data={data}
                    onFilterChange={(filteredData, filters) => {
                      setAdvancedFilteredData(filteredData);
                      setUseAdvancedFilters(true);
                    }}
                    initialFilters={{}}
                    showComparison={true}
                  />
                )} */}
                
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