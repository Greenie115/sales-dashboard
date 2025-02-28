import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { identifyBrandPrefixes, extractBrandNames } from '../utils/brandDetection.js';

// Import components
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
  // Brand detection state
  const [brandDetectionLoaded, setBrandDetectionLoaded] = useState(false);
  
  // Data state
  const [data, setData] = useState([]);
  const [offerData, setOfferData] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(['all']);
  const [selectedRetailers, setSelectedRetailers] = useState(['all']);
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [clientName, setClientName] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('sales');
  const [hasOfferData, setHasOfferData] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [brandMapping, setBrandMapping] = useState({});
  const [brandNames, setBrandNames] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Analytics state
  const [redemptionTimeframe, setRedemptionTimeframe] = useState('daily');
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [showInsightDetails, setShowInsightDetails] = useState(false);
  
  // Comparison state
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

  // Handle export
  const handleExport = (type) => {
    // Get the brand name and format it for the filename
    const brandName = brandNames.length > 0 
      ? brandNames[0] 
      : clientName || 'Shopmium';
    
    // Format today's date as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Create the filename
    let exportName = `${brandName} Shopmium Analysis ${today}`;
    
    // Sanitize the filename
    exportName = exportName.replace(/[\\/:*?"<>|]/g, '-');
    
    if (type === 'csv') {
      exportToCSV(exportName);
    } else if (type === 'pdf') {
      generatePDF(exportName);
    }
  };
  

// Export to CSV function 
// Function to create a product-retailer matrix from the filtered data
const createProductRetailerMatrix = (usePercentages = false) => {
  const filteredData = getFilteredData();
  if (!filteredData || filteredData.length === 0) return null;
  
  // Get unique products and retailers
  const uniqueProducts = _.uniq(filteredData.map(item => item.product_name)).filter(Boolean);
  const uniqueRetailers = _.uniq(filteredData.map(item => item.chain)).filter(Boolean);
  
  // Use the product mapping if available to get display names
  const productDisplayNames = {};
  uniqueProducts.forEach(product => {
    const productInfo = brandMapping[product] || { displayName: product };
    productDisplayNames[product] = productInfo.displayName || product;
  });
  
  // Initialize the data structure
  const matrix = {
    retailers: uniqueRetailers,
    products: uniqueProducts,
    data: {}, // Will be a nested object: data[product][retailer] = count
    productTotals: {}, // Will store total count for each product
    retailerTotals: {}, // Will store total count for each retailer
    grandTotal: 0, // Overall total
    percentages: {} // Will store percentage data: percentages[product][retailer] = percentage
  };
  
  // Initialize the data structure with zeros
  uniqueProducts.forEach(product => {
    matrix.data[product] = {};
    matrix.percentages[product] = {};
    matrix.productTotals[product] = 0;
    
    uniqueRetailers.forEach(retailer => {
      matrix.data[product][retailer] = 0;
      matrix.percentages[product][retailer] = 0;
      if (!matrix.retailerTotals[retailer]) {
        matrix.retailerTotals[retailer] = 0;
      }
    });
  });
  
  // Populate the matrix
  filteredData.forEach(item => {
    const product = item.product_name;
    const retailer = item.chain;
    
    if (product && retailer && matrix.data[product] && matrix.data[product][retailer] !== undefined) {
      matrix.data[product][retailer]++;
      matrix.productTotals[product]++;
      matrix.retailerTotals[retailer]++;
      matrix.grandTotal++;
    }
  });
  
  // Calculate percentages 
  uniqueProducts.forEach(product => {
    uniqueRetailers.forEach(retailer => {
      if (usePercentages) {
        // Calculate percentage relative to the product's total (how much of this product is sold in each retailer)
        if (matrix.productTotals[product] > 0) {
          matrix.percentages[product][retailer] = (matrix.data[product][retailer] / matrix.productTotals[product]) * 100;
        }
      } else {
        // Calculate percentage relative to the total for this retailer (share of each product within retailer)
        if (matrix.retailerTotals[retailer] > 0) {
          matrix.percentages[product][retailer] = (matrix.data[product][retailer] / matrix.retailerTotals[retailer]) * 100;
        }
      }
    });
  });
  
  // Sort products by total count (descending)
  matrix.products = matrix.products.sort((a, b) => 
    (matrix.productTotals[b] || 0) - (matrix.productTotals[a] || 0)
  );
  
  // Sort retailers by total count (descending)
  matrix.retailers = matrix.retailers.sort((a, b) => 
    (matrix.retailerTotals[b] || 0) - (matrix.retailerTotals[a] || 0)
  );
  
  // Limit to top 10 products and top 5 retailers for readability
  matrix.products = matrix.products.slice(0, 10);
  matrix.retailers = matrix.retailers.slice(0, 5);
  
  return matrix;
};

// Export to CSV function 
const exportToCSV = (fileName) => {
  if ((activeTab !== 'sales' && activeTab !== 'demographics' && activeTab !== 'offers') || 
      (!data.length && !hasOfferData)) {
    alert('No data available to export.');
    return;
  }
  
  try {
    let csvContent = '';
    let exportData = [];
    let headers = [];
    
    // Determine which data to export based on active tab
    if (activeTab === 'sales') {
      // Create a product-retailer matrix for export
      const productRetailerMatrix = createProductRetailerMatrix();
      
      // Export the product-retailer matrix in CSV format
      if (productRetailerMatrix) {
        // Get the retailer headers
        const retailerHeaders = ['Product Name', ...productRetailerMatrix.retailers, 'Total'];
        csvContent = retailerHeaders.join(',') + '\n';
        
        // Add product rows
        productRetailerMatrix.products.forEach((product, productIndex) => {
          const productRow = [product];
          
          // Add counts for each retailer
          productRetailerMatrix.retailers.forEach(retailer => {
            const count = productRetailerMatrix.data[product]?.[retailer] || 0;
            productRow.push(count);
          });
          
          // Add total for this product
          productRow.push(productRetailerMatrix.productTotals[product] || 0);
          
          // Format row and add to CSV
          const formattedRow = productRow.map(value => {
            if (value === null || value === undefined) return '';
            // Escape quotes and wrap in quotes if contains comma
            let stringValue = String(value).replace(/"/g, '""');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              stringValue = `"${stringValue}"`;
            }
            return stringValue;
          });
          
          csvContent += formattedRow.join(',') + '\n';
        });
        
        // Add totals row
        const totalsRow = ['Total'];
        productRetailerMatrix.retailers.forEach(retailer => {
          totalsRow.push(productRetailerMatrix.retailerTotals[retailer] || 0);
        });
        totalsRow.push(productRetailerMatrix.grandTotal || 0);
        
        const formattedTotalsRow = totalsRow.map(value => {
          if (value === null || value === undefined) return '';
          let stringValue = String(value).replace(/"/g, '""');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            stringValue = `"${stringValue}"`;
          }
          return stringValue;
        });
        
        csvContent += formattedTotalsRow.join(',') + '\n';
        
        // Add additional summary data - retailer distribution
        csvContent += '\n"Retailer Distribution"\n';
        csvContent += 'Retailer,Units,Percentage\n';
        
        retailerData.forEach(item => {
          const row = [
            `"${item.name}"`,
            item.value,
            `${item.percentage.toFixed(1)}%`
          ];
          csvContent += row.join(',') + '\n';
        });
        
        // Add product distribution
        csvContent += '\n"Product Distribution"\n';
        csvContent += 'Product,Units,Percentage\n';
        
        const productDist = getProductDistribution();
        productDist.forEach(item => {
          const row = [
            `"${item.displayName}"`,
            item.count,
            `${item.percentage.toFixed(1)}%`
          ];
          csvContent += row.join(',') + '\n';
        });
        
        // Add product-retailer distribution (percentages)
        csvContent += '\n"Product/Retailer Distribution (% of product sales by retailer)"\n';
        
        // Create product-retailer matrix with percentages
        const percentageMatrix = createProductRetailerMatrix(true);
        
        if (percentageMatrix) {
          // First row with retailer names
          const percentageHeaderRow = ['Product Name', ...percentageMatrix.retailers];
          csvContent += percentageHeaderRow.join(',') + '\n';
          
          // Data rows with percentages
          percentageMatrix.products.forEach(product => {
            const productInfo = brandMapping[product] || { displayName: product };
            const displayName = productInfo.displayName || product;
            
            const rowData = [displayName];
            percentageMatrix.retailers.forEach(retailer => {
              rowData.push(`${percentageMatrix.percentages[product][retailer].toFixed(1)}%`);
            });
            
            csvContent += rowData.map(value => {
              if (value === null || value === undefined) return '';
              let stringValue = String(value).replace(/"/g, '""');
              if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                stringValue = `"${stringValue}"`;
              }
              return stringValue;
            }).join(',') + '\n';
          });
        }
      } else {
        // Fallback to standard export if matrix creation fails
        exportData = getFilteredData();
        // Select relevant columns for sales data
        headers = ['receipt_date', 'product_name', 'chain', 'receipt_total'];
        
        // Add CSV header row
        csvContent = headers.join(',') + '\n';
        
        // Add data rows
        exportData.forEach(item => {
          const row = headers.map(header => {
            // Handle special cases, commas, quotes etc.
            let value = item[header];
            if (value === null || value === undefined) value = '';
            // Escape quotes and wrap in quotes if contains comma
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              value = `"${value}"`;
            }
            return value;
          });
          csvContent += row.join(',') + '\n';
        });
      }
    } else if (activeTab === 'demographics') {
      // Get data from demographics component
      const demographicData = demographicRef.current?.getVisibleData() || {};
      
      if (demographicData.ageData && demographicData.ageData.length > 0) {
        // Export age distribution data
        headers = ['age_group', 'count', 'percentage'];
        csvContent = headers.join(',') + '\n';
        
        // Sort by defined age group order if available
        const sortedAgeData = [...demographicData.ageData].sort((a, b) => {
          const aIndex = AGE_GROUP_ORDER.indexOf(a.name);
          const bIndex = AGE_GROUP_ORDER.indexOf(b.name);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
        
        sortedAgeData.forEach(item => {
          csvContent += `${item.name},${item.value},${item.percentage.toFixed(1)}\n`;
        });
        
        // Add a spacer row and gender data
        if (demographicData.genderData && demographicData.genderData.length > 0) {
          csvContent += '\n"Gender Distribution"\n';
          csvContent += 'gender,count,percentage\n';
          
          demographicData.genderData.forEach(item => {
            csvContent += `${item.name},${item.value},${item.percentage.toFixed(1)}\n`;
          });
        }
      } else {
        alert('No demographic data available to export.');
        return;
      }
    } else if (activeTab === 'offers') {
      // Get data from offer insights component
      const offerData = offerInsightsRef.current?.getVisibleData() || {};
      
      if (offerData.metrics) {
        headers = ['offer_name', 'total_hits', 'days_active', 'avg_hits_per_day', 'percentage'];
        csvContent = headers.join(',') + '\n';
        
        if (offerData.offerData && offerData.offerData.length > 0) {
          offerData.offerData.forEach(item => {
            csvContent += `"${item.name}",${item.value},${item.days || 'N/A'},${item.averageHitsPerDay || 'N/A'},${item.percentage.toFixed(1)}\n`;
          });
        } else {
          alert('No offer data available to export.');
          return;
        }
      } else {
        alert('No offer metrics available to export.');
        return;
      }
    }
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}.csv`);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Failed to export CSV. Check console for details.');
  }
};

// Generate PDF report
const generatePDF = (fileName) => {
  if ((activeTab !== 'sales' && activeTab !== 'demographics' && activeTab !== 'offers') || 
      (!data.length && !hasOfferData)) {
    alert('No data available to export.');
    return;
  }
  
  try {
    // Initialize PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // Add header with branding and title
    pdf.setFillColor(255, 0, 102); // Shopmium pink
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Shopmium Analytics Report', margin, 15);
    
    // Add date and title
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 30);
    
    let yPos = 40;
    
    // Add client name if available
    if (clientName) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(`Client: ${clientName}`, margin, yPos);
      yPos += 10;
    }
    
    // Add report title based on active tab
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    if (activeTab === 'sales') {
      pdf.text('Sales Analysis Report', margin, yPos);
    } else if (activeTab === 'demographics') {
      pdf.text('Demographics Analysis Report', margin, yPos);
    } else if (activeTab === 'offers') {
      pdf.text('Offer Insights Report', margin, yPos);
    }
    yPos += 10;
    
    // Add filter information
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (activeTab === 'sales' || activeTab === 'demographics') {
      if (!selectedProducts.includes('all')) {
        const productText = `Products: ${selectedProducts.join(', ')}`;
        pdf.text(productText, margin, yPos, { maxWidth: contentWidth });
        yPos += 5 + (Math.ceil(pdf.getTextDimensions(productText, { maxWidth: contentWidth }).h));
      }
      
      if (!selectedRetailers.includes('all')) {
        const retailerText = `Retailers: ${selectedRetailers.join(', ')}`;
        pdf.text(retailerText, margin, yPos, { maxWidth: contentWidth });
        yPos += 5 + (Math.ceil(pdf.getTextDimensions(retailerText, { maxWidth: contentWidth }).h));
      }
      
      if (dateRange !== 'all') {
        const dateText = dateRange === 'month' 
          ? `Month: ${selectedMonth}` 
          : `Date Range: ${startDate} to ${endDate}`;
        pdf.text(dateText, margin, yPos);
        yPos += 10;
      }
    }
    
    // Add summary metrics
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Summary Metrics', margin, yPos);
    yPos += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    if (activeTab === 'sales' || activeTab === 'demographics') {
      if (metrics) {
        pdf.text(`Total Redemptions: ${metrics.totalUnits.toLocaleString()}`, margin, yPos);
        yPos += 6;
        pdf.text(`Average Per Day: ${metrics.avgRedemptionsPerDay}`, margin, yPos);
        yPos += 6;
        pdf.text(`Date Range: ${metrics.uniqueDates[0]} to ${metrics.uniqueDates[metrics.uniqueDates.length - 1]} (${metrics.daysInRange} days)`, margin, yPos);
        yPos += 12;
      }
    } else if (activeTab === 'offers') {
      const offerData = offerInsightsRef.current?.getVisibleData() || {};
      if (offerData.metrics) {
        pdf.text(`Total Hits: ${offerData.metrics.totalHits.toLocaleString()}`, margin, yPos);
        yPos += 6;
        pdf.text(`Period Length: ${offerData.metrics.periodDays} days`, margin, yPos);
        yPos += 6;
        pdf.text(`Average Hits Per Day: ${offerData.metrics.averageHitsPerDay}`, margin, yPos);
        yPos += 12;
      }
    }
    
    // Add detailed data as tables
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    
    if (activeTab === 'sales') {
      // Add retailer distribution table
      pdf.text('Retailer Distribution', margin, yPos);
      yPos += 8;
      
      const retailerTableData = retailerData.map(item => [
        item.name,
        item.value.toString(),
        `${item.percentage.toFixed(1)}%`
      ]);
      
      pdf.autoTable({
        startY: yPos,
        head: [['Retailer', 'Units', 'Percentage']],
        body: retailerTableData,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [255, 0, 102] }
      });
      
      yPos = pdf.lastAutoTable.finalY + 10;
      
      // Add product distribution table
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.text('Product Distribution', margin, yPos);
      yPos += 8;
      
      const productDist = getProductDistribution();
      const productTableData = productDist.slice(0, 10).map(item => [
        item.displayName,
        item.count.toString(),
        `${item.percentage.toFixed(1)}%`
      ]);
      
      pdf.autoTable({
        startY: yPos,
        head: [['Product', 'Units', 'Percentage']],
        body: productTableData,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [255, 0, 102] }
      });
      
      yPos = pdf.lastAutoTable.finalY + 10;
      
      // Add product-retailer matrix
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.text('Product by Retailer Matrix', margin, yPos);
      yPos += 8;
      
      // Create the product-retailer matrix
      const matrixData = createProductRetailerMatrix();
      
      if (matrixData) {
        // Get formatted product names for display
        const productDisplayNames = matrixData.products.map(product => {
          const productInfo = brandMapping[product] || { displayName: product };
          return productInfo.displayName || product;
        });
        
        // Create the header row with retailer names
        const matrixHead = [['Product', ...matrixData.retailers, 'Total']];
        
        // Create the data rows with clear product names
        const matrixBody = matrixData.products.map((product, idx) => {
          const displayName = productDisplayNames[idx];
          const row = [displayName];
          
          // Add counts for each retailer
          matrixData.retailers.forEach(retailer => {
            row.push(matrixData.data[product][retailer] || 0);
          });
          
          // Add total for this product
          row.push(matrixData.productTotals[product] || 0);
          
          return row;
        });
        
        // Add a total row
        const totalRow = ['Total'];
        matrixData.retailers.forEach(retailer => {
          totalRow.push(matrixData.retailerTotals[retailer] || 0);
        });
        totalRow.push(matrixData.grandTotal || 0);
        
        matrixBody.push(totalRow);
        
        // Create the table
        pdf.autoTable({
          startY: yPos,
          head: matrixHead,
          body: matrixBody,
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [255, 0, 102] },
          willDrawCell: (data) => {
            // Highlight the total row and total column
            if (data.row.index === matrixBody.length - 1 || data.column.index === matrixHead[0].length - 1) {
              pdf.setFillColor(240, 240, 240);
              return true;
            }
            return false;
          }
        });
        
        yPos = pdf.lastAutoTable.finalY + 10;
      }
      
      // Add product-retailer distribution heat map with better formatting
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.text('Product/Retailer Distribution (% of product sales by retailer)', margin, yPos);
      yPos += 8;
      
      // Create the product-retailer matrix with percentages
      const percentageMatrix = createProductRetailerMatrix(true);
      
      if (percentageMatrix) {
        // Get formatted product names for display
        const productDisplayNames = percentageMatrix.products.map(product => {
          const productInfo = brandMapping[product] || { displayName: product };
          return productInfo.displayName || product;
        });
        
        // Create the header row with retailer names
        const percentageHead = [['Product', ...percentageMatrix.retailers]];
        
        // Create the data rows with percentages and clear product names
        const percentageBody = percentageMatrix.products.map((product, idx) => {
          const displayName = productDisplayNames[idx];
          const row = [displayName];
          
          // Add percentages for each retailer
          percentageMatrix.retailers.forEach(retailer => {
            row.push(`${percentageMatrix.percentages[product][retailer].toFixed(1)}%`);
          });
          
          return row;
        });
        
        // Create the table with color coding for percentages
        pdf.autoTable({
          startY: yPos,
          head: percentageHead,
          body: percentageBody,
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [128, 0, 128] }, // Purple for this table to distinguish
          willDrawCell: (data) => {
            // Skip header and first column
            if (data.row.section === 'head' || data.column.index === 0) {
              return false;
            }
            
            // Get the percentage value
            const cellValue = data.cell.text[0];
            const percentage = parseFloat(cellValue);
            
            // Color coding based on percentage
            if (!isNaN(percentage)) {
              // Higher percentage = darker color
              const intensity = Math.min(0.9, 0.1 + (percentage / 100) * 0.8);
              pdf.setFillColor(255, 0, 102, intensity); // Shopmium pink with varying opacity
              return true;
            }
            return false;
          }
        });
      }
    }
    else if (activeTab === 'demographics') {
      // Get data from demographics component
      const demographicData = demographicRef.current?.getVisibleData() || {};
      
      // Add age distribution table
      if (demographicData.ageData && demographicData.ageData.length > 0) {
        pdf.text('Age Distribution', margin, yPos);
        yPos += 8;
        
        // Sort by defined age group order if available
        const sortedAgeData = [...demographicData.ageData].sort((a, b) => {
          const aIndex = AGE_GROUP_ORDER.indexOf(a.name);
          const bIndex = AGE_GROUP_ORDER.indexOf(b.name);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
        
        const ageTableData = sortedAgeData.map(item => [
          item.name,
          item.value.toString(),
          `${item.percentage.toFixed(1)}%`
        ]);
        
        pdf.autoTable({
          startY: yPos,
          head: [['Age Group', 'Count', 'Percentage']],
          body: ageTableData,
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [255, 0, 102] }
        });
        
        yPos = pdf.lastAutoTable.finalY + 10;
      }
      
      // Add gender distribution table
      if (demographicData.genderData && demographicData.genderData.length > 0) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.text('Gender Distribution', margin, yPos);
        yPos += 8;
        
        const genderTableData = demographicData.genderData.map(item => [
          item.name,
          item.value.toString(),
          `${item.percentage.toFixed(1)}%`
        ]);
        
        pdf.autoTable({
          startY: yPos,
          head: [['Gender', 'Count', 'Percentage']],
          body: genderTableData,
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [255, 0, 102] }
        });
        
        yPos = pdf.lastAutoTable.finalY + 10;
      }
      
      // Add response data if available
      if (demographicData.responseData && demographicData.responseData.length > 0) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.text(`Question: ${demographicData.getCurrentQuestionText}`, margin, yPos, { maxWidth: contentWidth });
        yPos += 10;
        
        const responseTableData = demographicData.responseData.map(item => [
          item.response,
          item.total.toString(),
          `${Math.round(item.percentage)}%`
        ]);
        
        pdf.autoTable({
          startY: yPos,
          head: [['Response', 'Count', 'Percentage']],
          body: responseTableData,
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [255, 0, 102] }
        });
      }
    } else if (activeTab === 'offers') {
      // Get data from offer insights component
      const offerData = offerInsightsRef.current?.getVisibleData() || {};
      
      // Add offer distribution table
      if (offerData.offerData && offerData.offerData.length > 0) {
        pdf.text('Offer Performance', margin, yPos);
        yPos += 8;
        
        const offerTableData = offerData.offerData.map(item => [
          item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name,
          item.value.toString(),
          item.averageHitsPerDay || 'N/A',
          `${item.percentage.toFixed(1)}%`
        ]);
        
        pdf.autoTable({
          startY: yPos,
          head: [['Offer Name', 'Total Hits', 'Avg Hits/Day', 'Percentage']],
          body: offerTableData,
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [255, 0, 102] }
        });
        
        yPos = pdf.lastAutoTable.finalY + 10;
      }
      
      // Add demographic breakdown if available
      if (offerData.ageData && offerData.ageData.length > 0) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.text('Age Distribution', margin, yPos);
        yPos += 8;
        
        const ageTableData = offerData.ageData.map(item => [
          item.name,
          item.value.toString(),
          `${item.percentage.toFixed(1)}%`
        ]);
        
        pdf.autoTable({
          startY: yPos,
          head: [['Age Group', 'Count', 'Percentage']],
          body: ageTableData,
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [255, 0, 102] }
        });
        
        yPos = pdf.lastAutoTable.finalY + 10;
      }
      
      // Add gender breakdown if available
      if (offerData.genderData && offerData.genderData.length > 0) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.text('Gender Distribution', margin, yPos);
        yPos += 8;
        
        const genderTableData = offerData.genderData.map(item => [
          item.name,
          item.value.toString(),
          `${item.percentage.toFixed(1)}%`
        ]);
        
        pdf.autoTable({
          startY: yPos,
          head: [['Gender', 'Count', 'Percentage']],
          body: genderTableData,
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [255, 0, 102] }
        });
      }
    }
    
    // Add footer
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Page ${i} of ${totalPages} | Shopmium Analytics Report | ${new Date().toLocaleDateString()}`, 
               pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    // Save the PDF
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Check console for details.');
  }
};
  
  // Prepare data for child components
  const metrics = data && data.length > 0 ? calculateMetrics() : null;
  const comparisonMetrics = (data && data.length > 0 && comparisonMode) ? calculateMetrics(true) : null;
  const retailerData = data && data.length > 0 ? getRetailerDistribution() : [];
  const availableRetailers = data && data.length > 0 ? _.uniq(data.map(item => item.chain || '')).filter(Boolean).sort() : [];
  const redemptionsOverTime = data && data.length > 0 ? getRedemptionsOverTime() : [];
  
  // Toggle drawer for mobile view
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header with navigation */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {/* Shopmium Logo */}
                <div className="bg-pink-600 text-white font-bold px-3 py-1 rounded-md">
                  Shopmium Analytics
                </div>
              </div>
              <div className="hidden md:block ml-10">
                <div className="flex space-x-4">
                  {/* Desktop Navigation */}
                  <button 
                    onClick={() => setActiveTab('sales')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      activeTab === 'sales' 
                        ? 'bg-pink-100 text-pink-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Sales Analysis
                  </button>
                  <button 
                    onClick={() => setActiveTab('demographics')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      activeTab === 'demographics' 
                        ? 'bg-pink-100 text-pink-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    disabled={!data.length}
                  >
                    Demographics
                  </button>
                  <button 
                    onClick={() => setActiveTab('offers')}
                    disabled={!hasOfferData}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      activeTab === 'offers' 
                        ? 'bg-pink-100 text-pink-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    } ${!hasOfferData ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Offer Insights
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Action buttons */}
              {(data.length > 0 || hasOfferData) && (
                <div className="relative export-dropdown">
                  <button
                    onClick={() => setShowExportOptions(!showExportOptions)}
                    className="bg-pink-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-pink-700 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
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
              
              {/* Upload */}
              <label
                className="bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              
              {/* Mobile menu button */}
              <button 
                onClick={toggleDrawer}
                className="md:hidden bg-gray-100 p-2 rounded-md text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 z-20 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
        
        <div className={`fixed inset-y-0 right-0 flex flex-col max-w-xs w-full bg-white z-30 transform transition duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Menu</h2>
            <button
              onClick={toggleDrawer}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pt-5 pb-4">
            <nav className="flex-1 px-4 space-y-2">
              <button
                onClick={() => {
                  setActiveTab('sales');
                  setIsDrawerOpen(false);
                }}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'sales' 
                    ? 'bg-pink-100 text-pink-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Sales Analysis
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('demographics');
                  setIsDrawerOpen(false);
                }}
                disabled={!data.length}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'demographics' 
                    ? 'bg-pink-100 text-pink-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                } ${!data.length ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Demographics
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('offers');
                  setIsDrawerOpen(false);
                }}
                disabled={!hasOfferData}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'offers' 
                    ? 'bg-pink-100 text-pink-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                } ${!hasOfferData ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Offer Insights
              </button>
              
              <div className="pt-4 border-t border-gray-200 mt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Client Info
                </h3>
                <div className="mt-2">
                  <input 
                    type="text"
                    placeholder={brandNames.length > 0 ? "Override brand name" : "Client name (for exports)"}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  />
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page title and client info */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'sales' && 'Sales Analysis'}
                {activeTab === 'demographics' && 'Demographics'}
                {activeTab === 'offers' && 'Offer Insights'}
              </h1>
              <div className="mt-1 flex items-center">
                {brandNames.length > 0 && (
                  <>
                    <div className="text-sm text-gray-500">
                      Brand: <span className="font-medium text-gray-900">{brandNames[0]}</span>
                    </div>
                    <span className="mx-2 text-gray-300">•</span>
                  </>
                )}
                {clientName && (
                  <div className="text-sm text-gray-500">
                    Client: <span className="font-medium text-gray-900">{clientName}</span>
                  </div>
                )}
                {metrics && metrics.uniqueDates && metrics.uniqueDates.length > 0 && (
                  <>
                    <span className="mx-2 text-gray-300">•</span>
                    <div className="text-sm text-gray-500">
                      Date range: <span className="font-medium text-gray-900">
                        {metrics.uniqueDates[0]} to {metrics.uniqueDates[metrics.uniqueDates.length - 1]}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {!data.length && !hasOfferData && (
              <div className="mt-4 sm:mt-0 hidden md:block">
                <div className="text-sm text-gray-500">
                  Upload a CSV file to get started with your analysis
                </div>
              </div>
            )}
            
            {(data.length > 0 || hasOfferData) && (
              <div className="mt-4 sm:mt-0 md:hidden">
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Loading or Error Messages */}
        {loading && (
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mr-4"></div>
            <p className="text-gray-600">Processing data...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 p-4 rounded-lg shadow mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}
        
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
              
              {/* Empty State - should never actually show as we're inside a condition */}
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
          <div className="bg-white shadow rounded-lg p-12">
            <div className="text-center">
              <div className="mt-8 max-w-md mx-auto">
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      CSV files only
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500 text-center">
                  Please upload an "items_purchased.CSV" for Sales Analysis 
                  <br />
                  or for Offer Insights, upload a "hits_offer.CSV"
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            Powered by Shopmium Analytics
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SalesDashboard;